/** Wraps a promise's resolve/reject so only the first call has any effect; runs onSettle once. */
export function settleOnce<T>(
  resolve: (value: T) => void,
  reject: (reason: Error) => void,
  onSettle?: () => void,
) {
  let settled = false;
  const finish = () => {
    settled = true;
    onSettle?.();
  };
  return {
    isSettled: () => settled,
    resolve(value: T) {
      if (settled) return;
      finish();
      resolve(value);
    },
    reject(reason: Error) {
      if (settled) return;
      finish();
      reject(reason);
    },
  };
}
