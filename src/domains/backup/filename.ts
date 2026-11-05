const pad = (n: number) => String(n).padStart(2, '0');

/** crosscal-backup-YYYY-MM-DD.json using the local date. */
export function backupFilename(now: Date): string {
  return `crosscal-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
