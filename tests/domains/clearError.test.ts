jest.mock('../../src/db/client', () => ({ getDb: jest.fn() }));

import { useSettingsStore } from '../../src/domains/settings/store';
import { useBackupStore } from '../../src/domains/backup/store';

describe('clearError', () => {
  it('clears the settings store error', () => {
    useSettingsStore.setState({ error: 'boom' });
    useSettingsStore.getState().clearError();
    expect(useSettingsStore.getState().error).toBeNull();
  });
  it('clears the backup store error', () => {
    useBackupStore.setState({ error: 'Invalid backup file: x' });
    useBackupStore.getState().clearError();
    expect(useBackupStore.getState().error).toBeNull();
  });
});
