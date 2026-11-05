import { settleOnce } from '../../src/lib/settleOnce';

describe('settleOnce', () => {
  it('first resolve wins and later calls are ignored', () => {
    const res = jest.fn();
    const rej = jest.fn();
    const cleanup = jest.fn();
    const s = settleOnce<string | null>(res, rej, cleanup);
    s.resolve('file');
    s.resolve(null);
    s.reject(new Error('x'));
    expect(res).toHaveBeenCalledTimes(1);
    expect(res).toHaveBeenCalledWith('file');
    expect(rej).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(s.isSettled()).toBe(true);
  });

  it('first reject wins and later resolve is ignored', () => {
    const res = jest.fn();
    const rej = jest.fn();
    const s = settleOnce<string | null>(res, rej);
    s.reject(new Error('Could not read file'));
    s.resolve(null);
    expect(rej).toHaveBeenCalledTimes(1);
    expect(res).not.toHaveBeenCalled();
  });
});
