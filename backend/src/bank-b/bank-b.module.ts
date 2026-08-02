import { Module } from '@nestjs/common';
import { BankBController } from './bank-b.controller';
import { BankBService } from './bank-b.service';
import { InternalHttpModule } from '../internal-http/internal-http.module';

@Module({
  imports: [InternalHttpModule],
  controllers: [BankBController],
  providers: [BankBService],
})
export class BankBModule {}
