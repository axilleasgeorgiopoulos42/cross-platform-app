import { createSubmitGuard } from '../../src/lib/submitGuard';

describe('createSubmitGuard', () => {
  it('skips a second concurrent call', async () => {
    const guard = createSubmitGuard();
    let release!: () => void;
    const fn = jest.fn(() => new Promise<void>((r) => { release = r; }));
    const first = guard.run(fn);
    const second = await guard.run(fn);
    expect(second).toBe(false);
    expect(fn).toHaveBeenCalledTimes(1);
    release();
    expect(await first).toBe(true);
  });

  it('releases after resolve', async () => {
    const guard = createSubmitGuard();
    const fn = jest.fn(async () => {});
    await guard.run(fn);
    expect(guard.isRunning()).toBe(false);
    expect(await guard.run(fn)).toBe(true);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('releases after reject and rethrows', async () => {
    const guard = createSubmitGuard();
    await expect(guard.run(async () => { throw new Error('x'); })).rejects.toThrow('x');
    expect(guard.isRunning()).toBe(false);
    expect(await guard.run(async () => {})).toBe(true);
  });
});
