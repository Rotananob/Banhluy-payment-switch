import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TransferService } from './transfer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

export interface TransferRequestBody {
  fromAccountNumber?: string;
  fromAccount?: string;
  toAccountNumber?: string;
  toAccount?: string;
  amount: number;
  description?: string;
}

@Controller('transfer')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createTransfer(@Request() req: any, @Body() body: TransferRequestBody) {
    const toAccountNumber = body.toAccountNumber || body.toAccount;
    const fromAccountNumber = body.fromAccountNumber || body.fromAccount;

    return this.transferService.executeTransfer({
      fromAccountNumber,
      toAccountNumber: toAccountNumber!,
      amount: Number(body.amount),
      description: body.description,
      senderUserId: req.user?.sub,
    });
  }
}
