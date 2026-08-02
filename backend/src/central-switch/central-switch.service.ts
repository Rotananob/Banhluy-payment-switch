import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BankType,
  KhqrStatus,
  TransactionStatus,
  TransactionType,
  SwitchEventType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { KhqrService } from './khqr/khqr.service';
import { WebhookService } from './webhook/webhook.service';
import { CrossBankPayDto } from './dto/cross-bank-pay.dto';
import { centsToDollars, dollarsToCents, serializeBigInt } from '../common/utils/money.util';

const CROSS_BANK_FEE_CENTS = 50n; // $0.50

@Injectable()
export class CentralSwitchService {
  private readonly logger = new Logger(CentralSwitchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly khqrService: KhqrService,
    private readonly webhookService: WebhookService,
  ) {}

  async processCrossBankPayment(
    userId: string,
    payerAccountId: string,
    dto: CrossBankPayDto,
  ) {
    // 1. Decode and validate KHQR payload
    const decoded = this.khqrService.decode(dto.khqrPayload);

    // 2. Find the KHQR record
    const khqr = await this.prisma.khqrPaymentRequest.findFirst({
      where: { payloadHash: decoded.payloadHash },
      include: { merchantAccount: { include: { user: true } } },
    });

    if (!khqr) {
      throw new NotFoundException('KHQR payment request not found');
    }

    if (khqr.status !== KhqrStatus.PENDING) {
      throw new BadRequestException(`KHQR is already ${khqr.status.toLowerCase()}`);
    }

    if (new Date() > khqr.expiresAt) {
      await this.prisma.khqrPaymentRequest.update({
        where: { id: khqr.id },
        data: { status: KhqrStatus.EXPIRED },
      });
      throw new BadRequestException('KHQR has expired');
    }

    // 3. Verify PIN
    const payerUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!payerUser) {
      throw new NotFoundException('Payer not found');
    }

    const pinValid = await bcrypt.compare(dto.pin, payerUser.pinHash);
    if (!pinValid) {
      throw new UnauthorizedException('Invalid PIN');
    }

    // 4. Get payer account
    const payerAccount = await this.prisma.account.findUnique({
      where: { id: payerAccountId },
    });

    if (!payerAccount) {
      throw new NotFoundException('Payer account not found');
    }

    // 5. Prevent self-payment
    if (payerAccount.id === khqr.merchantAccountId) {
      throw new BadRequestException('Cannot pay your own KHQR');
    }

    // 6. Determine if cross-bank
    const isCrossBank =
      payerAccount.bankType !== khqr.merchantAccount.bankType;
    const feeCents = isCrossBank ? CROSS_BANK_FEE_CENTS : 0n;
    const totalDebitCents = khqr.amountCents + feeCents;

    // 7. Check balance
    if (payerAccount.balanceCents < totalDebitCents) {
      throw new BadRequestException(
        `Insufficient balance. Need $${centsToDollars(totalDebitCents)} (including $${centsToDollars(feeCents)} fee)`,
      );
    }

    // 8. ACID Transaction — the heart of the clearing house
    const result = await this.prisma.$transaction(async (tx) => {
      // Debit payer (amount + fee)
      const updatedPayer = await tx.account.update({
        where: { id: payerAccount.id },
        data: { balanceCents: { decrement: totalDebitCents } },
      });

      // Credit receiver (amount only, fee goes to "system")
      const updatedReceiver = await tx.account.update({
        where: { id: khqr.merchantAccountId },
        data: { balanceCents: { increment: khqr.amountCents } },
      });

      // Create transfer record
      const transfer = await tx.transfer.create({
        data: {
          idempotencyKey: `KHQR-${khqr.id}-${Date.now()}`,
          senderAccountId: payerAccount.id,
          receiverAccountId: khqr.merchantAccountId,
          senderBankType: payerAccount.bankType,
          receiverBankType: khqr.merchantAccount.bankType,
          amountCents: khqr.amountCents,
          feeCents,
          isCrossBank,
          status: TransactionStatus.COMPLETED,
          description: `KHQR Payment to ${khqr.merchantAccount.user.fullName}`,
          switchReference: `SW-${Date.now()}`,
        },
      });

      // Payer transaction log (TRANSFER_OUT)
      await tx.transaction.create({
        data: {
          accountId: payerAccount.id,
          bankType: payerAccount.bankType,
          type: TransactionType.TRANSFER_OUT,
          status: TransactionStatus.COMPLETED,
          amountCents: khqr.amountCents,
          balanceAfterCents: updatedPayer.balanceCents,
          referenceId: transfer.id,
          metadata: {
            transferId: transfer.id,
            to: khqr.merchantAccount.accountNumber,
            toName: khqr.merchantAccount.user.fullName,
            isCrossBank,
            khqrId: khqr.id,
          },
        },
      });

      // Fee transaction (if cross-bank)
      if (feeCents > 0n) {
        await tx.transaction.create({
          data: {
            accountId: payerAccount.id,
            bankType: payerAccount.bankType,
            type: TransactionType.FEE,
            status: TransactionStatus.COMPLETED,
            amountCents: feeCents,
            balanceAfterCents: updatedPayer.balanceCents,
            referenceId: transfer.id,
            metadata: {
              transferId: transfer.id,
              feeType: 'CROSS_BANK_FEE',
            },
          },
        });
      }

      // Receiver transaction log (TRANSFER_IN)
      await tx.transaction.create({
        data: {
          accountId: khqr.merchantAccountId,
          bankType: khqr.merchantAccount.bankType,
          type: TransactionType.TRANSFER_IN,
          status: TransactionStatus.COMPLETED,
          amountCents: khqr.amountCents,
          balanceAfterCents: updatedReceiver.balanceCents,
          referenceId: transfer.id,
          metadata: {
            transferId: transfer.id,
            from: payerAccount.accountNumber,
            isCrossBank,
            khqrId: khqr.id,
          },
        },
      });

      // Mark KHQR as paid
      await tx.khqrPaymentRequest.update({
        where: { id: khqr.id },
        data: { status: KhqrStatus.PAID, paidAt: new Date() },
      });

      // Log switch events
      await tx.switchEventLog.create({
        data: {
          eventType: SwitchEventType.TRANSFER_SETTLED,
          transferId: transfer.id,
          sourceModule: 'central-switch',
          payload: {
            payerBank: payerAccount.bankType,
            receiverBank: khqr.merchantAccount.bankType,
            amountCents: serializeBigInt(khqr.amountCents),
            feeCents: serializeBigInt(feeCents),
            isCrossBank,
          },
        },
      });

      return {
        transferId: transfer.id,
        amount: centsToDollars(khqr.amountCents),
        fee: centsToDollars(feeCents),
        total: centsToDollars(totalDebitCents),
        isCrossBank,
        from: {
          accountNumber: payerAccount.accountNumber,
          bank: payerAccount.bankType,
          newBalance: centsToDollars(updatedPayer.balanceCents),
        },
        to: {
          accountNumber: khqr.merchantAccount.accountNumber,
          name: khqr.merchantAccount.user.fullName,
          bank: khqr.merchantAccount.bankType,
        },
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
      };
    });

    // 9. Fire webhooks (after transaction committed)
    await this.webhookService.emit(
      khqr.merchantAccount.bankType,
      'PAYMENT_RECEIVED',
      { transferId: result.transferId, amount: result.amount },
    );

    await this.webhookService.emit(payerAccount.bankType, 'PAYMENT_SENT', {
      transferId: result.transferId,
      amount: result.amount,
    });

    this.logger.log(
      `Cross-bank payment: ${result.from.accountNumber} → ${result.to.accountNumber} | $${result.amount} | Fee: $${result.fee}`,
    );

    return result;
  }
}
