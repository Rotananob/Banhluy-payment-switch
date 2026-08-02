import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AtmDepositDto } from './dto/atm-deposit.dto';
import {
  centsToDollars,
  dollarsToCents,
  serializeBigInt,
} from '../common/utils/money.util';

@Injectable()
export class AtmService {
  private readonly logger = new Logger(AtmService.name);

  constructor(private readonly prisma: PrismaService) {}

  async deposit(dto: AtmDepositDto) {
    const account = await this.prisma.account.findUnique({
      where: { accountNumber: dto.accountNumber },
      include: { user: true },
    });

    if (!account) {
      throw new NotFoundException(
        `Account ${dto.accountNumber} not found`,
      );
    }

    if (!account.isActive) {
      throw new BadRequestException('Account is inactive');
    }

    const amountCents = dollarsToCents(dto.amount);

    if (amountCents <= 0n) {
      throw new BadRequestException('Deposit amount must be positive');
    }

    // ACID transaction: credit account + create records
    const result = await this.prisma.$transaction(async (tx) => {
      // Credit the account
      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: { balanceCents: { increment: amountCents } },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          accountId: account.id,
          bankType: account.bankType,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amountCents,
          balanceAfterCents: updatedAccount.balanceCents,
          referenceId: `ATM-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          metadata: {
            source: 'ATM',
            accountNumber: dto.accountNumber,
          },
        },
      });

      // Create ATM deposit record
      await tx.atmDeposit.create({
        data: {
          targetBankType: account.bankType,
          accountNumber: dto.accountNumber,
          amountCents,
          status: TransactionStatus.COMPLETED,
          transactionId: transaction.id,
        },
      });

      return {
        depositId: transaction.id,
        accountNumber: account.accountNumber,
        accountHolder: account.user.fullName,
        bankType: account.bankType,
        amount: centsToDollars(amountCents),
        amountCents: serializeBigInt(amountCents),
        newBalance: centsToDollars(updatedAccount.balanceCents),
        newBalanceCents: serializeBigInt(updatedAccount.balanceCents),
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      };
    });

    this.logger.log(
      `ATM Deposit: ${dto.accountNumber} | +$${result.amount} | New balance: $${result.newBalance}`,
    );

    return result;
  }
}
