import { SetMetadata } from '@nestjs/common';

export const BANK_ROUTE_KEY = 'bankRoute';

/**
 * Decorator to mark a route as accessible only to users of a specific bank.
 * Used in conjunction with BankTypeGuard.
 */
export const BankRoute = (bankType: string) =>
  SetMetadata(BANK_ROUTE_KEY, bankType);
