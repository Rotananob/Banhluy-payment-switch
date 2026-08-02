import { IsString, IsEnum, Length, Matches } from 'class-validator';
import { BankType } from '@prisma/client';

export class LoginDto {
  @IsString()
  @Matches(/^\+855\d{8,9}$/, {
    message: 'Phone number must be a valid Cambodian number (+855XXXXXXXXX)',
  })
  phoneNumber!: string;

  @IsString()
  @Length(4, 6, { message: 'PIN must be 4-6 digits' })
  pin!: string;

  @IsEnum(BankType, { message: 'bankType must be BANK_A or BANK_B' })
  bankType!: BankType;
}
