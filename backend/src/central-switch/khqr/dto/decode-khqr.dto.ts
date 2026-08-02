import { IsString } from 'class-validator';

export class DecodeKhqrDto {
  @IsString()
  payload!: string;
}
