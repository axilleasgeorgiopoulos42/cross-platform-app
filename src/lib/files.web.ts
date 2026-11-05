import { settleOnce } from './settleOnce';

// How long after the window regains focus we wait before treating an empty
// file input as "cancelled" (gives onchange time to fire first).
// Only used when the input has no `cancel` event. Long enough for a slow
// iCloud download to deliver `change` first.
const FOCUS_CANCEL_DELAY_MS = 3000;
// WebKit can fail blob downloads whose URL is revoked too early.
const REVOKE_DELAY_MS = 60_000;

export function downloadTextFile(name: string, text: string): void {
  if (typeof document === 'undefined') throw new Error('Not supported on this platform');
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

export function pickTextFile(): Promise<string | null> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Not supported on this platform'));
  }
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    let timer: ReturnType<typeof setTimeout> | undefined;
    const onFocus = () => {
      // Fallback for browsers without a reliable `cancel` event.
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        if (!input.files || input.files.length === 0) session.resolve(null);
      }, FOCUS_CANCEL_DELAY_MS);
    };
    const session = settleOnce<string | null>(resolve, reject, () => {
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener('focus', onFocus);
      input.remove();
    });

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        session.resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') session.resolve(reader.result);
        else session.reject(new Error('Could not read file: unexpected content'));
      };
      reader.onerror = () =>
        session.reject(
          new Error(`Could not read file${reader.error ? `: ${reader.error.message}` : ''}`),
        );
      reader.readAsText(file);
    };
    input.oncancel = () => session.resolve(null);
    // Browsers with a `cancel` event report cancellation reliably; only the
    // others need the focus heuristic.
    if (!('oncancel' in input)) window.addEventListener('focus', onFocus);
    // Attached to the DOM: older iOS Safari drops `change` from detached inputs.
    document.body.appendChild(input);
    input.click();
  });
}
