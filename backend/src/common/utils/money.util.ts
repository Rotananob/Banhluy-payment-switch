/**
 * Monetary utilities — all amounts stored as BigInt cents.
 */

export const CENTS_PER_UNIT = 100n;

export function dollarsToCents(dollars: number): bigint {
  return BigInt(Math.round(dollars * 100));
}

export function centsToDollars(cents: bigint): number {
  return Number(cents) / 100;
}

export function formatCents(cents: bigint, currency = 'USD'): string {
  const dollars = centsToDollars(cents);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}

export function addCents(a: bigint, b: bigint): bigint {
  return a + b;
}

export function subtractCents(a: bigint, b: bigint): bigint {
  return a - b;
}

export function isNonNegative(cents: bigint): boolean {
  return cents >= 0n;
}

export function serializeBigInt(value: bigint): string {
  return value.toString();
}
