import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateKhqrDto } from './dto/generate-khqr.dto';
import { dollarsToCents, centsToDollars, serializeBigInt } from '../../common/utils/money.util';
import * as crypto from 'crypto';

const KHQR_EXPIRY_MINUTES = 5;

interface KhqrDecodedData {
  appId: string;
  accountNumber: string;
  bankType: string;
  amount: number;
  amountCents: string;
  currency: string;
  merchantName: string;
  city: string;
  referenceId: string;
  expiresAt: string;
  payloadHash: string;
}

@Injectable()
export class KhqrService {
  private readonly logger = new Logger(KhqrService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an EMVCo-like TLV KHQR payload and store it.
   */
  async generate(accountId: string, dto: GenerateKhqrDto) {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      include: { user: true },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const amountCents = dollarsToCents(dto.amount);
    const referenceId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + KHQR_EXPIRY_MINUTES * 60 * 1000);

    // Build simplified EMVCo TLV payload
    const payload = this.buildTlvPayload({
      accountNumber: account.accountNumber,
      bankType: account.bankType,
      amount: dto.amount.toFixed(2),
      currency: account.currency,
      merchantName: account.user.fullName,
      city: 'Phnom Penh',
      referenceId,
      expiresAt: expiresAt.toISOString(),
    });

    const payloadHash = crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');

    // Store in DB
    const khqr = await this.prisma.khqrPaymentRequest.create({
      data: {
        merchantAccountId: accountId,
        payload,
        payloadHash,
        amountCents,
        currency: account.currency,
        expiresAt,
      },
    });

    this.logger.log(
      `KHQR generated: ${account.accountNumber} | $${dto.amount} | expires ${expiresAt.toISOString()}`,
    );

    return {
      khqrId: khqr.id,
      payload,
      payloadHash,
      amount: dto.amount,
      amountCents: serializeBigInt(amountCents),
      merchantName: account.user.fullName,
      accountNumber: account.accountNumber,
      bankType: account.bankType,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: KHQR_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Decode a KHQR payload and return parsed data.
   * Used internally (by central-switch) and externally (by scan endpoint).
   */
  decode(payload: string): KhqrDecodedData {
    const tags = this.parseTlv(payload);

    // Extract nested merchant info (tag 26)
    const merchantInfo = tags.get('26') ?? '';
    const merchantTags = this.parseTlv(merchantInfo);

    const amount = parseFloat(tags.get('54') ?? '0');

    return {
      appId: merchantTags.get('00') ?? 'BANHLUY',
      accountNumber: merchantTags.get('01') ?? '',
      bankType: merchantTags.get('02') ?? '',
      amount,
      amountCents: serializeBigInt(dollarsToCents(amount)),
      currency: tags.get('53') === '840' ? 'USD' : tags.get('53') ?? 'USD',
      merchantName: tags.get('59') ?? '',
      city: tags.get('60') ?? '',
      referenceId: (() => {
        const additionalData = tags.get('62') ?? '';
        const addTags = this.parseTlv(additionalData);
        return addTags.get('05') ?? '';
      })(),
      expiresAt: (() => {
        const additionalData = tags.get('62') ?? '';
        const addTags = this.parseTlv(additionalData);
        return addTags.get('07') ?? '';
      })(),
      payloadHash: crypto.createHash('sha256').update(payload).digest('hex'),
    };
  }

  /**
   * Decode + validate against DB. Returns enriched data for the scan preview screen.
   */
  async decodeAndValidate(payload: string) {
    const decoded = this.decode(payload);

    const khqr = await this.prisma.khqrPaymentRequest.findFirst({
      where: { payloadHash: decoded.payloadHash },
      include: { merchantAccount: { include: { user: true } } },
    });

    const isExpired = decoded.expiresAt
      ? new Date() > new Date(decoded.expiresAt)
      : true;

    return {
      ...decoded,
      isValid: !!khqr,
      isExpired,
      isPaid: khqr?.status === 'PAID',
      status: khqr?.status ?? 'UNKNOWN',
    };
  }

  // ── TLV Helpers ──────────────────────────────────────────────────

  private buildTlvPayload(data: {
    accountNumber: string;
    bankType: string;
    amount: string;
    currency: string;
    merchantName: string;
    city: string;
    referenceId: string;
    expiresAt: string;
  }): string {
    // Build merchant account info (tag 26, nested TLV)
    const merchantInfo =
      this.tlv('00', 'BANHLUY') +
      this.tlv('01', data.accountNumber) +
      this.tlv('02', data.bankType);

    // Build additional data (tag 62, nested TLV)
    const additionalData =
      this.tlv('05', data.referenceId) +
      this.tlv('07', data.expiresAt);

    // Currency code: USD = 840
    const currencyCode = data.currency === 'USD' ? '840' : data.currency;

    // Main TLV payload (without CRC)
    let payload =
      this.tlv('00', '01') +                // Payload Format Indicator
      this.tlv('01', '12') +                // Dynamic QR
      this.tlv('26', merchantInfo) +          // Merchant Account
      this.tlv('52', '5999') +               // MCC
      this.tlv('53', currencyCode) +          // Currency
      this.tlv('54', data.amount) +           // Amount
      this.tlv('58', 'KH') +                // Country
      this.tlv('59', data.merchantName) +     // Merchant Name
      this.tlv('60', data.city) +             // City
      this.tlv('62', additionalData);         // Additional Data

    // Add CRC placeholder then compute
    payload += '6304';
    const crc = this.crc16(payload);
    payload += crc;

    return payload;
  }

  private tlv(tag: string, value: string): string {
    const length = value.length.toString().padStart(2, '0');
    return `${tag}${length}${value}`;
  }

  private parseTlv(data: string): Map<string, string> {
    const tags = new Map<string, string>();
    let i = 0;

    while (i < data.length - 3) {
      const tag = data.substring(i, i + 2);
      i += 2;
      const length = parseInt(data.substring(i, i + 2), 10);
      i += 2;

      if (isNaN(length) || i + length > data.length) break;

      const value = data.substring(i, i + length);
      tags.set(tag, value);
      i += length;
    }

    return tags;
  }

  private crc16(data: string): string {
    let crc = 0xffff;

    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc <<= 1;
        }
        crc &= 0xffff;
      }
    }

    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
}
