import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { InternalHttpService } from './internal-http.service';

@Module({
  imports: [HttpModule],
  providers: [InternalHttpService],
  exports: [InternalHttpService],
})
export class InternalHttpModule {}
