import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BankType, TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TransferDto } from '../common/dto/transfer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  centsToDollars,
  dollarsToCents,
  serializeBigInt,
} from '../common/utils/money.util';

@Injectable()
export class BankBService {
  private readonly logger = new Logger(BankBService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { accounts: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const account = user.accounts[0];

    return {
      id: user.id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      bankType: user.bankType,
      account: account
        ? {
            id: account.id,
            accountNumber: account.accountNumber,
            balance: centsToDollars(account.balanceCents),
            balanceCents: serializeBigInt(account.balanceCents),
            currency: account.currency,
          }
        : null,
    };
  }

  async getTransactions(accountId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { accountId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where: { accountId } }),
    ]);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: centsToDollars(tx.amountCents),
        amountCents: serializeBigInt(tx.amountCents),
        balanceAfter: tx.balanceAfterCents
          ? centsToDollars(tx.balanceAfterCents)
          : null,
        referenceId: tx.referenceId,
        metadata: tx.metadata,
        createdAt: tx.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async intraTransfer(senderAccountId: string, dto: TransferDto) {
    const senderAccount = await this.prisma.account.findUnique({
      where: { id: senderAccountId },
    });

    if (!senderAccount) {
      throw new NotFoundException('Sender account not found');
    }

    const receiverAccount = await this.prisma.account.findUnique({
      where: { accountNumber: dto.toAccountNumber },
    });

    if (!receiverAccount) {
      throw new NotFoundException('Recipient account not found');
    }

    if (receiverAccount.id === senderAccountId) {
      throw new BadRequestException('Cannot transfer to your own account');
    }

    if (receiverAccount.bankType !== BankType.BANK_B) {
      throw new BadRequestException(
        'Cross-bank transfers must go through the central switch (scan KHQR)',
      );
    }

    const amountCents = dollarsToCents(dto.amount);

    if (senderAccount.balanceCents < amountCents) {
      throw new BadRequestException('Insufficient balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedSender = await tx.account.update({
        where: { id: senderAccountId },
        data: { balanceCents: { decrement: amountCents } },
      });

      const updatedReceiver = await tx.account.update({
        where: { id: receiverAccount.id },
        data: { balanceCents: { increment: amountCents } },
      });

      const transfer = await tx.transfer.create({
        data: {
          idempotencyKey: `INTRA-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          senderAccountId,
          receiverAccountId: receiverAccount.id,
          senderBankType: BankType.BANK_B,
          receiverBankType: BankType.BANK_B,
          amountCents,
          feeCents: 0n,
          isCrossBank: false,
          status: TransactionStatus.COMPLETED,
          description: dto.description ?? 'Intra-bank transfer',
        },
      });

      await tx.transaction.create({
        data: {
          accountId: senderAccountId,
          bankType: BankType.BANK_B,
          type: TransactionType.TRANSFER_OUT,
          status: TransactionStatus.COMPLETED,
          amountCents,
          balanceAfterCents: updatedSender.balanceCents,
          referenceId: transfer.id,
          metadata: {
            transferId: transfer.id,
            to: receiverAccount.accountNumber,
            description: dto.description,
          },
        },
      });

      await tx.transaction.create({
        data: {
          accountId: receiverAccount.id,
          bankType: BankType.BANK_B,
          type: TransactionType.TRANSFER_IN,
          status: TransactionStatus.COMPLETED,
          amountCents,
          balanceAfterCents: updatedReceiver.balanceCents,
          referenceId: transfer.id,
          metadata: {
            transferId: transfer.id,
            from: senderAccount.accountNumber,
            description: dto.description,
          },
        },
      });

      return {
        transferId: transfer.id,
        amount: centsToDollars(amountCents),
        from: senderAccount.accountNumber,
        to: receiverAccount.accountNumber,
        newBalance: centsToDollars(updatedSender.balanceCents),
        status: 'COMPLETED',
      };
    });

    this.logger.log(
      `Intra-bank transfer: ${result.from} → ${result.to} | $${result.amount}`,
    );

    return result;
  }

  async handleWebhook(body: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);
    return { received: true };
  }
}
