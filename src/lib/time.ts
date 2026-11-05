const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(input: string): boolean {
  return TIME_RE.test(input);
}
