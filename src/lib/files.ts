// Native stub: file download/pick is only implemented on web (see files.web.ts).
export function downloadTextFile(_name: string, _text: string): void {
  throw new Error('Not supported on this platform');
}

export function pickTextFile(): Promise<string | null> {
  return Promise.reject(new Error('Not supported on this platform'));
}
