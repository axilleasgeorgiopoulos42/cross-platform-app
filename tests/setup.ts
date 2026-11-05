// Services call crypto.randomUUID(); provide it under Node.
if (!(globalThis as { crypto?: unknown }).crypto) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (globalThis as { crypto?: unknown }).crypto = require('crypto').webcrypto;
}
