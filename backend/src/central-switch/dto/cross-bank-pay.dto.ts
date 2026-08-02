import { IsString, Length } from 'class-validator';

export class CrossBankPayDto {
  @IsString()
  khqrPayload!: string;

  @IsString()
  @Length(4, 6, { message: 'PIN must be 4-6 digits' })
  pin!: string;
}
