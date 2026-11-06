import { categoryRowLabel } from '../../src/components/categoryRowLabel';

describe('categoryRowLabel', () => {
  it('pluralizes entries', () => {
    expect(categoryRowLabel('Food', 40, 2, 'EUR')).toBe('Food, €40.00, 2 entries');
  });
  it('uses singular for one entry', () => {
    expect(categoryRowLabel('Food', 40, 1, 'EUR')).toBe('Food, €40.00, 1 entry');
  });
});
