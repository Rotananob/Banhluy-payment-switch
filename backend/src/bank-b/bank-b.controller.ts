import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { BankBService } from './bank-b.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankTypeGuard } from '../auth/guards/bank-type.guard';
import { BankRoute } from '../auth/decorators/bank-route.decorator';
import { TransferDto } from '../common/dto/transfer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BankType } from '@prisma/client';

@Controller('bank-b')
export class BankBController {
  constructor(private readonly bankBService: BankBService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, BankTypeGuard)
  @BankRoute(BankType.BANK_B)
  async getProfile(@Request() req: any) {
    return this.bankBService.getProfile(req.user.userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, BankTypeGuard)
  @BankRoute(BankType.BANK_B)
  async getTransactions(
    @Request() req: any,
    @Query() pagination: PaginationDto,
  ) {
    return this.bankBService.getTransactions(req.user.accountId, pagination);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard, BankTypeGuard)
  @BankRoute(BankType.BANK_B)
  async transfer(@Request() req: any, @Body() dto: TransferDto) {
    return this.bankBService.intraTransfer(req.user.accountId, dto);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    return this.bankBService.handleWebhook(body);
  }
}
