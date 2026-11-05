import { swipeDirection } from '../../src/lib/swipe';

describe('swipeDirection', () => {
  it('returns left for a large negative dx', () => {
    expect(swipeDirection(-80, 0)).toBe('left');
  });
  it('returns right for a large positive dx', () => {
    expect(swipeDirection(80, 0)).toBe('right');
  });
  it('returns null below the threshold', () => {
    expect(swipeDirection(30, 0)).toBeNull();
  });
  it('returns null for mostly vertical moves', () => {
    expect(swipeDirection(80, 120)).toBeNull();
  });
});
