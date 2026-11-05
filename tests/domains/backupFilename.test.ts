import { backupFilename } from '../../src/domains/backup/filename';

describe('backupFilename', () => {
  it('formats the local date as crosscal-backup-YYYY-MM-DD.json', () => {
    expect(backupFilename(new Date(2026, 10, 5, 23, 59))).toBe('crosscal-backup-2026-11-05.json');
  });
  it('zero-pads month and day', () => {
    expect(backupFilename(new Date(2026, 0, 3))).toBe('crosscal-backup-2026-01-03.json');
  });
});
