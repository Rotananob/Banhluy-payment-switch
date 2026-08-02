import { IsString, IsEnum, Length, Matches } from 'class-validator';
import { BankType } from '@prisma/client';

export class RegisterDto {
  @IsString()
  @Matches(/^\+855\d{8,9}$/, {
    message: 'Phone number must be a valid Cambodian number (+855XXXXXXXXX)',
  })
  phoneNumber!: string;

  @IsString()
  @Length(4, 6, { message: 'PIN must be 4-6 digits' })
  @Matches(/^\d+$/, { message: 'PIN must contain only digits' })
  pin!: string;

  @IsString()
  @Length(2, 255)
  fullName!: string;

  @IsEnum(BankType, { message: 'bankType must be BANK_A or BANK_B' })
  bankType!: BankType;
}
