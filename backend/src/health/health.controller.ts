import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    const dbHealthy = await this.prisma.isHealthy();
    return {
      status: dbHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'connected' : 'disconnected',
      },
    };
  }
}
