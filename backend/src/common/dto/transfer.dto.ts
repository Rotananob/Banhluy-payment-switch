import { IsString, IsNumber, IsOptional, Min, Matches } from 'class-validator';

export class TransferDto {
  @IsString()
  @Matches(/^B[AB]-\d{8}$/, {
    message: 'Account number must match format BA-XXXXXXXX or BB-XXXXXXXX',
  })
  toAccountNumber!: string;

  @IsNumber()
  @Min(0.01, { message: 'Minimum transfer amount is $0.01' })
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
