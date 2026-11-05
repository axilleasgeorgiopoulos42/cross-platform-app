import { normalizeText, matchesQuery } from '../../src/lib/text';

describe('text', () => {
  it('normalizeText strips accents and case', () => {
    expect(normalizeText('Καφές')).toBe(normalizeText('καφες'));
  });

  it('folds the Greek final sigma', () => {
    expect(normalizeText('ΣΑΣ')).toBe(normalizeText('σασ'));
    expect(matchesQuery(['Καφές'], 'καφεσ')).toBe(true);
    expect(matchesQuery(['Μαστόρας'], 'ΜΑΣ')).toBe(true);
  });

  it('matchesQuery matches case-insensitive substrings', () => {
    expect(matchesQuery(['Coffee beans'], 'FEE')).toBe(true);
  });

  it('treats regex characters literally', () => {
    expect(matchesQuery(['a(b'], '(')).toBe(true);
    expect(() => matchesQuery(['x'], '*')).not.toThrow();
    expect(matchesQuery(['x'], '*')).toBe(false);
    expect(() => matchesQuery(['x'], '\\')).not.toThrow();
    expect(matchesQuery(['x'], '\\')).toBe(false);
  });

  it('whitespace-only query is false', () => {
    expect(matchesQuery(['x'], '   ')).toBe(false);
  });

  it('skips null and undefined haystacks', () => {
    expect(matchesQuery([null, undefined, 'hello'], 'ell')).toBe(true);
    expect(matchesQuery([null, undefined], 'ell')).toBe(false);
  });
});
