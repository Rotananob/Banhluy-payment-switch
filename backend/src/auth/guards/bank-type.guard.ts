import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BANK_ROUTE_KEY } from '../decorators/bank-route.decorator';

@Injectable()
export class BankTypeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredBank = this.reflector.getAllAndOverride<string>(
      BANK_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredBank) {
      return true; // No restriction
    }

    const request = context.switchToHttp().getRequest();
    const userBankType = request.user?.bankType;

    if (userBankType !== requiredBank) {
      throw new ForbiddenException(
        `This endpoint is only accessible to ${requiredBank} users`,
      );
    }

    return true;
  }
}
