import { IsNumber, Min } from 'class-validator';

export class GenerateKhqrDto {
  @IsNumber()
  @Min(0.01, { message: 'Minimum KHQR amount is $0.01' })
  amount!: number;
}
