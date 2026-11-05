import { isValidTime } from '../../src/lib/time';

describe('isValidTime', () => {
  it.each(['09:05', '23:59', '00:00'])('accepts %s', (v) => {
    expect(isValidTime(v)).toBe(true);
  });
  it.each(['24:00', '9:5', '12:60', '', 'ab:cd'])('rejects "%s"', (v) => {
    expect(isValidTime(v)).toBe(false);
  });
});
