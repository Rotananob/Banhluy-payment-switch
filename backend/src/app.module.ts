import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { PrismaModule } from './prisma/prisma.module';
import { InternalHttpModule } from './internal-http/internal-http.module';
import { AuthModule } from './auth/auth.module';
import { BankAModule } from './bank-a/bank-a.module';
import { BankBModule } from './bank-b/bank-b.module';
import { AtmModule } from './atm/atm.module';
import { CentralSwitchModule } from './central-switch/central-switch.module';
import { TransferModule } from './transfer/transfer.module';
import { DepositModule } from './deposit/deposit.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    // Global configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
      },
    ]),

    // Infrastructure
    PrismaModule,
    InternalHttpModule,

    // Feature modules
    AuthModule,
    BankAModule,
    BankBModule,
    AtmModule,
    CentralSwitchModule,
    TransferModule,
    DepositModule,
    HealthModule,
  ],
})
export class AppModule {}
