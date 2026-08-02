import { Module } from '@nestjs/common';
import { CentralSwitchController } from './central-switch.controller';
import { CentralSwitchService } from './central-switch.service';
import { KhqrService } from './khqr/khqr.service';
import { KhqrController } from './khqr/khqr.controller';
import { WebhookService } from './webhook/webhook.service';
import { InternalHttpModule } from '../internal-http/internal-http.module';

@Module({
  imports: [InternalHttpModule],
  controllers: [CentralSwitchController, KhqrController],
  providers: [CentralSwitchService, KhqrService, WebhookService],
})
export class CentralSwitchModule {}
