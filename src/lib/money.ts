import type { Currency } from '../constants/currencies';

export function formatMoney(amount: number, currency: Currency): string {
  const normalized = Math.abs(amount) < 0.005 ? 0 : amount;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(normalized);
}
