import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const secret = request.headers['x-internal-secret'];
    const expectedSecret = this.configService.get<string>('internalApi.secret');

    if (!secret || secret !== expectedSecret) {
      throw new UnauthorizedException('Invalid internal API credentials');
    }

    return true;
  }
}
