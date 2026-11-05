import type { Currency } from '../constants/currencies';
import { formatMoney } from '../lib/money';

/** Screen-reader label for a category row, e.g. `Food, $40.00, 2 entries`. */
export function categoryRowLabel(
  label: string,
  total: number,
  count: number,
  currency: Currency,
): string {
  return `${label}, ${formatMoney(total, currency)}, ${count} ${count === 1 ? 'entry' : 'entries'}`;
}
