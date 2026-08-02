import { IsString, IsNumber, Min, Matches } from 'class-validator';

export class AtmDepositDto {
  @IsString()
  @Matches(/^B[AB]-\d{8}$/, {
    message: 'Account number must match format BA-XXXXXXXX or BB-XXXXXXXX',
  })
  accountNumber!: string;

  @IsNumber()
  @Min(0.01, { message: 'Minimum deposit amount is $0.01' })
  amount!: number;
}
