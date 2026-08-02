import { Module } from '@nestjs/common';
import { BankAController } from './bank-a.controller';
import { BankAService } from './bank-a.service';
import { InternalHttpModule } from '../internal-http/internal-http.module';

@Module({
  imports: [InternalHttpModule],
  controllers: [BankAController],
  providers: [BankAService],
})
export class BankAModule {}
