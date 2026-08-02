import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { BankAService } from './bank-a.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BankTypeGuard } from '../auth/guards/bank-type.guard';
import { BankRoute } from '../auth/decorators/bank-route.decorator';
import { TransferDto } from '../common/dto/transfer.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { BankType } from '@prisma/client';

@Controller('bank-a')
export class BankAController {
  constructor(private readonly bankAService: BankAService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard, BankTypeGuard)
  @BankRoute(BankType.BANK_A)
  async getProfile(@Request() req: any) {
    return this.bankAService.getProfile(req.user.userId);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, BankTypeGuard)
  @BankRoute(BankType.BANK_A)
  async getTransactions(
    @Request() req: any,
    @Query() pagination: PaginationDto,
  ) {
    return this.bankAService.getTransactions(req.user.accountId, pagination);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard, BankTypeGuard)
  @BankRoute(BankType.BANK_A)
  async transfer(@Request() req: any, @Body() dto: TransferDto) {
    return this.bankAService.intraTransfer(req.user.accountId, dto);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: any) {
    return this.bankAService.handleWebhook(body);
  }
}
