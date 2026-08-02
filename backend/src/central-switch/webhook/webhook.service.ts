import { Injectable, Logger } from '@nestjs/common';
import { BankType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InternalHttpService } from '../../internal-http/internal-http.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly internalHttp: InternalHttpService,
  ) {}

  async emit(targetBank: BankType, event: string, payload: object) {
    // Log webhook to DB
    await this.prisma.switchEventLog.create({
      data: {
        eventType: 'TRANSFER_SETTLED',
        sourceModule: 'webhook-service',
        payload: { event, ...payload } as any,
      },
    });

    // Internal HTTP call to the bank module's webhook endpoint
    const path =
      targetBank === BankType.BANK_A
        ? '/bank-a/webhook'
        : '/bank-b/webhook';

    try {
      // Use self-referencing URL (localhost) to simulate inter-service call
      await this.internalHttp.post(path, { event, payload });
      this.logger.log(`Webhook delivered: ${targetBank} → ${event}`);
    } catch (error) {
      this.logger.warn(
        `Webhook delivery failed for ${targetBank} → ${event}: ${error}`,
      );
    }
  }
}
