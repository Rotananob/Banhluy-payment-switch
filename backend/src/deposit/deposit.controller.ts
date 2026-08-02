import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DepositService } from './deposit.service';

export interface DepositRequestBody {
  accountNumber: string;
  amount: number;
  depositorName?: string;
  description?: string;
}

@Controller('deposit')
export class DepositController {
  constructor(private readonly depositService: DepositService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createDeposit(@Body() body: DepositRequestBody) {
    return this.depositService.executeDeposit({
      accountNumber: body.accountNumber,
      amount: Number(body.amount),
      depositorName: body.depositorName,
      description: body.description,
    });
  }
}
