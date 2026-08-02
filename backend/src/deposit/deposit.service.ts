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

export interface ExecuteDepositDto {
  accountNumber: string;
  amount: number;
  depositorName?: string;
  description?: string;
}

@Injectable()
export class DepositService {
  private readonly logger = new Logger(DepositService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * REAL Prisma Transaction code for Cash Deposit using prisma.$transaction([]).
   * Atomically credits the account balance and records an immutable audit ledger entry.
   */
  async executeDeposit(dto: ExecuteDepositDto) {
    const { accountNumber, amount, depositorName, description } = dto;

    if (!amount || amount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than zero.');
    }

    // 1. Check if target bank account exists in PostgreSQL
    const account = await this.prisma.account.findUnique({
      where: { accountNumber },
    });

    if (!account) {
      throw new NotFoundException(
        `Target account '${accountNumber}' does not exist in PostgreSQL ledger.`
      );
    }

    const amountCents = dollarsToCents(amount);

    this.logger.log(
      `Executing ACID deposit: ${account.accountNumber} (${account.bankType}) | Amount: +$${centsToDollars(amountCents)} USD`
    );

    // 2. PRISMA.$TRANSACTION([]) ATOMIC BLOCK
    const [updatedAccount, depositTx] = await this.prisma.$transaction([
      // STEP 1: Increment target account balance atomically
      this.prisma.account.update({
        where: { id: account.id },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      }),

      // STEP 2: Write immutable transaction ledger record in PostgreSQL
      this.prisma.transaction.create({
        data: {
          accountId: account.id,
          bankType: account.bankType,
          type: TransactionType.DEPOSIT,
          status: TransactionStatus.COMPLETED,
          amountCents: amountCents,
          balanceAfterCents: account.balanceCents + amountCents,
          metadata: {
            depositorName: depositorName || 'Customer ATM Deposit',
            description:
              description ||
              `ATM Cash Deposit by ${depositorName || 'Customer'} into ${account.accountNumber}`,
          },
        },
      }),
    ]);

    return {
      success: true,
      depositId: depositTx.id,
      accountNumber: account.accountNumber,
      bankType: account.bankType,
      amount: centsToDollars(depositTx.amountCents),
      newBalance: centsToDollars(updatedAccount.balanceCents),
      status: depositTx.status,
      timestamp: depositTx.createdAt,
      database: 'PostgreSQL 17 ACID Ledger (banhluy)',
    };
  }
}
