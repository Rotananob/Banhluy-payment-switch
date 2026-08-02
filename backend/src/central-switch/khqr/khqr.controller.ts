import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { KhqrService } from './khqr.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GenerateKhqrDto } from './dto/generate-khqr.dto';
import { DecodeKhqrDto } from './dto/decode-khqr.dto';

@Controller('central-switch/khqr')
export class KhqrController {
  constructor(private readonly khqrService: KhqrService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generate(@Request() req: any, @Body() dto: GenerateKhqrDto) {
    return this.khqrService.generate(req.user.accountId, dto);
  }

  @Post('decode')
  async decode(@Body() dto: DecodeKhqrDto) {
    return this.khqrService.decodeAndValidate(dto.payload);
  }
}
