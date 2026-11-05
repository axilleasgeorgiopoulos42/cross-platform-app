export function swipeDirection(
  dx: number,
  dy: number,
  threshold = 50,
): 'left' | 'right' | null {
  if (Math.abs(dy) > Math.abs(dx)) return null;
  if (dx <= -threshold) return 'left';
  if (dx >= threshold) return 'right';
  return null;
}
