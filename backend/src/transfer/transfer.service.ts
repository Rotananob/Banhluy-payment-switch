import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { dollarsToCents, centsToDollars } from '../common/utils/money.util';

export interface ExecuteTransferDto {
  fromAccountNumber?: string;
  toAccountNumber: string;
  amount: number;
  description?: string;
  senderUserId?: string;
}

@Injectable()
export class TransferService {
  private readonly logger = new Logger(TransferService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * REAL Prisma Transaction code that safely deducts money from Bank A (or sender)
   * and credits Bank B (or receiver) atomically using prisma.$transaction([]).
   */
  async executeTransfer(dto: ExecuteTransferDto) {
    const { toAccountNumber, amount, description, senderUserId } = dto;

    if (!amount || amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero.');
    }

    // 1. Resolve Sender Account
    let senderAccount;
    if (dto.fromAccountNumber) {
      senderAccount = await this.prisma.account.findUnique({
        where: { accountNumber: dto.fromAccountNumber },
      });
    } else if (senderUserId) {
      senderAccount = await this.prisma.account.findFirst({
        where: { userId: senderUserId },
      });
    }

    if (!senderAccount) {
      throw new NotFoundException('Sender bank account not found.');
    }

    // 2. Resolve Receiver Account
    const receiverAccount = await this.prisma.account.findUnique({
      where: { accountNumber: toAccountNumber },
    });

    if (!receiverAccount) {
      throw new NotFoundException(
        `Recipient bank account '${toAccountNumber}' does not exist in PostgreSQL ledger.`
      );
    }

    if (senderAccount.id === receiverAccount.id) {
      throw new BadRequestException('Cannot transfer funds to the same account.');
    }

    // 3. Calculate Fee ($0.00 for Intra-Bank, $0.50 for Cross-Bank Switch Fee)
    const isCrossBank = senderAccount.bankType !== receiverAccount.bankType;
    const feeCents = isCrossBank ? 50n : 0n; // $0.50 fee in cents
    const amountCents = dollarsToCents(amount);
    const totalDebitCents = amountCents + feeCents;

    // 4. Check Sufficient Balance
    if (senderAccount.balanceCents < totalDebitCents) {
      throw new BadRequestException(
        `Insufficient balance in PostgreSQL database. Required: $${centsToDollars(totalDebitCents)} USD (Balance: $${centsToDollars(senderAccount.balanceCents)} USD)`
      );
    }

    this.logger.log(
      `Executing ACID transaction: ${senderAccount.accountNumber} (${senderAccount.bankType}) -> ${receiverAccount.accountNumber} (${receiverAccount.bankType}) | Amount: $${centsToDollars(amountCents)} | Fee: $${centsToDollars(feeCents)}`
    );

    // 5. REAL PRISMA.$TRANSACTION([]) ATOMIC BLOCK
    const [updatedSender, updatedReceiver, transferRecord] =
      await this.prisma.$transaction([
        // STEP 1: Safely deduct money from Sender Account (Bank A / Bank B)
        this.prisma.account.update({
          where: { id: senderAccount.id },
          data: {
            balanceCents: {
              decrement: totalDebitCents,
            },
          },
        }),

        // STEP 2: Safely add money to Receiver Account (Bank B / Bank A)
        this.prisma.account.update({
          where: { id: receiverAccount.id },
          data: {
            balanceCents: {
              increment: amountCents,
            },
          },
        }),

        // STEP 3: Create immutable transfer ledger entry in PostgreSQL
        this.prisma.transfer.create({
          data: {
            idempotencyKey: `TR-${senderAccount.accountNumber}-${Date.now()}`,
            senderAccountId: senderAccount.id,
            receiverAccountId: receiverAccount.id,
            senderBankType: senderAccount.bankType,
            receiverBankType: receiverAccount.bankType,
            amountCents: amountCents,
            feeCents: feeCents,
            isCrossBank: isCrossBank,
            status: TransactionStatus.COMPLETED,
            description:
              description ||
              `Transfer from ${senderAccount.accountNumber} to ${receiverAccount.accountNumber}`,
            switchReference: `SW-TR-${Date.now()}`,
          },
        }),
      ]);

    // Create sender & receiver ledger transaction audit logs
    await this.prisma.transaction.create({
      data: {
        accountId: senderAccount.id,
        bankType: senderAccount.bankType,
        type: TransactionType.TRANSFER_OUT,
        status: TransactionStatus.COMPLETED,
        amountCents: amountCents,
        balanceAfterCents: updatedSender.balanceCents,
        referenceId: transferRecord.id,
        metadata: {
          transferId: transferRecord.id,
          to: receiverAccount.accountNumber,
          isCrossBank,
        },
      },
    });

    await this.prisma.transaction.create({
      data: {
        accountId: receiverAccount.id,
        bankType: receiverAccount.bankType,
        type: TransactionType.TRANSFER_IN,
        status: TransactionStatus.COMPLETED,
        amountCents: amountCents,
        balanceAfterCents: updatedReceiver.balanceCents,
        referenceId: transferRecord.id,
        metadata: {
          transferId: transferRecord.id,
          from: senderAccount.accountNumber,
          isCrossBank,
        },
      },
    });

    return {
      success: true,
      transactionId: transferRecord.id,
      fromAccount: senderAccount.accountNumber,
      toAccount: receiverAccount.accountNumber,
      amount: centsToDollars(transferRecord.amountCents),
      fee: centsToDollars(transferRecord.feeCents),
      senderNewBalance: centsToDollars(updatedSender.balanceCents),
      receiverNewBalance: centsToDollars(updatedReceiver.balanceCents),
      timestamp: transferRecord.createdAt,
      database: 'PostgreSQL 17 ACID Ledger (banhluy)',
    };
  }
}
