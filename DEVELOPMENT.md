# Development

## Setup

```bash
npm install
npx expo start --web
```

Scripts: `npm test` (jest), `npm run typecheck` (`tsc --noEmit`), `npm run lint` (`expo lint`), `npm run web`. Production build: `npx expo export --platform web`.

## Test harness

Jest uses `jest-expo` with `testEnvironment: node`, matches `tests/**/*.test.ts`, and loads `tests/setup.ts`. `createTestDb()` in `tests/helpers/testDb.ts` returns an `SQLiteDatabase`-shaped object backed by sql.js (execAsync, runAsync, getAllAsync, getFirstAsync, withTransactionAsync).

Writing a service test:

```ts
import { createTestDb } from '../helpers/testDb';
import { runMigrations } from '../../src/db/migrations';
import { settingsService } from '../../src/domains/settings/service';

it('get returns defaults on empty db', async () => {
  const db = await createTestDb();
  await runMigrations(db);
  expect(await settingsService.get(db)).toEqual({ currency: 'EUR', theme: 'system' });
});
```

## Adding a migration step

In `src/db/migrations.ts`, bump `SCHEMA_VERSION`, add an `if (version < N)` block after the existing ones, make it idempotent (`IF NOT EXISTS`, check `PRAGMA table_info` before `ALTER TABLE`), set `PRAGMA user_version`, and extend `tests/db/migrations.test.ts` (including upgrading from the previous version with data). If the shape of exported data changes, update `src/domains/backup` and the backup `version`.

## Adding a screen or route

Create a file under `app/` (Expo Router; `[id].tsx` for dynamic routes) and register it in `app/_layout.tsx` if it needs stack options. Put logic in a domain service and expose it through a store; the screen only uses stores and components.

## Platform notes

- `Alert.alert` does not work on web. Use `confirmAction(title, message, label)` from `src/lib/confirm`.
- File download and pick exist only on web (`src/lib/files.web.ts`). Platform-specific code follows the `.web.ts` pair convention.
- Add dependencies with `npx expo install <pkg>`.

## PWA build and icons

- Local production build with the service worker: `npx expo export --platform web && node scripts/pwa-postbuild.js` (prints `PWA: <n> files, <x> MB, version <hash>`; rerunning on the same export prints the same version). Serve `dist/` over HTTP with the COOP/COEP headers from `vercel.json` to try it; the worker only registers in production builds, never under `expo start`.
- Regenerate icons only when the artwork changes: `node scripts/generate-icons.js` (needs the `@resvg/resvg-js` devDependency), then commit the PNGs in `public/icons/` and the replaced `assets/` images.
- Tests for the pure PWA modules are in `tests/pwa/` (run with `npx jest tests/pwa`). The worker is checked against a fake `self`/`caches` harness; real browser behaviour is checked by hand (PROJECT_LOG section 7).

## Recovering from a bad deploy

- Fix the problem and redeploy. Installed apps pick up the fixed worker on their next online launch, sometimes only on the second launch.
- Optional kill switch: deploy a `sw.js` that deletes every `planner-*` cache and calls `self.registration.unregister()` (for example `self.addEventListener('install', () => self.skipWaiting()); self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('planner-')).map((k) => caches.delete(k)))).then(() => self.registration.unregister())));`). Remove it again once the app has recovered.
- Users must NOT clear website data or delete the home-screen app to recover: that deletes their local SQLite data. If they must, export a backup from Settings first.

## Commit and deploy

Pushing `main` auto-deploys to Vercel (https://cross-platform-app-navy.vercel.app). Other branches get preview deployments. Before pushing run jest, `tsc --noEmit`, `expo lint` and `expo export --platform web`.

## Known limitations

Backup UI is web-only. No recurring events, budgets, reminders or sync. Search covers events (title, notes) and transactions (note, category, date range) only. Data is local to one browser or device.
