import { formatMoney } from '../../src/lib/money';

describe('formatMoney', () => {
  it('formats EUR', () => {
    expect(formatMoney(1234.5, 'EUR')).toBe('€1,234.50');
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatMoney(1234.5, 'GBP')).toBe('£1,234.50');
  });
  it('formats negatives', () => {
    expect(formatMoney(-5, 'USD')).toBe('-$5.00');
  });
  it('never shows negative zero', () => {
    expect(formatMoney(-0, 'EUR')).toBe('€0.00');
    expect(formatMoney(0.004, 'EUR')).toBe('€0.00');
    expect(formatMoney(-0.004, 'EUR')).toBe('€0.00');
  });
});
