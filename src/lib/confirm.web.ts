export function confirmAction(
  title: string,
  message: string,
  _confirmLabel = 'Confirm',
): Promise<boolean> {
  if (typeof window === 'undefined' || typeof window.confirm !== 'function') {
    return Promise.resolve(false);
  }
  return Promise.resolve(window.confirm(`${title}\n\n${message}`));
}
