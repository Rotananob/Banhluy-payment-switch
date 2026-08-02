import { Controller, Post, Body } from '@nestjs/common';
import { AtmService } from './atm.service';
import { AtmDepositDto } from './dto/atm-deposit.dto';

@Controller('atm')
export class AtmController {
  constructor(private readonly atmService: AtmService) {}

  @Post('deposit')
  async deposit(@Body() dto: AtmDepositDto) {
    return this.atmService.deposit(dto);
  }
}
