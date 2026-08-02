import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CentralSwitchService } from './central-switch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CrossBankPayDto } from './dto/cross-bank-pay.dto';

@Controller('central-switch')
export class CentralSwitchController {
  constructor(private readonly switchService: CentralSwitchService) {}

  @Post('pay')
  @UseGuards(JwtAuthGuard)
  async pay(@Request() req: any, @Body() dto: CrossBankPayDto) {
    return this.switchService.processCrossBankPayment(
      req.user.userId,
      req.user.accountId,
      dto,
    );
  }
}
