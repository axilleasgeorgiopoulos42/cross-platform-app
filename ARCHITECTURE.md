# Architecture

## Layers

```
SQLite (expo-sqlite)
  -> services (src/domains/*/service.ts, plain async functions taking a db handle)
    -> Zustand stores (src/domains/*/store.ts, call getDb() + services)
      -> screens (app/) and components (src/components)
```

Components never call services or `getDb()`; they read store state and call store actions. Services receive the `SQLiteDatabase` as their first argument, which makes them testable without a device.

## Folder map

- `app/` Expo Router routes: `(tabs)/{index,calendar,expenses}.tsx`, `event/[id].tsx`, `transaction/[id].tsx`, `settings.tsx`, `_layout.tsx`.
- `src/domains/{calendar,expenses,settings,backup}/` each with `types.ts`, `service.ts`, `store.ts` (expenses also has `summary.ts`, backup has `filename.ts`).
- `src/components/` shared UI (Screen, Card, Button, forms, CalendarGrid, CategoryBreakdown, ...).
- `src/lib/` pure helpers and platform adapters (`money`, `dates`, `time`, `swipe`, `settleOnce`, `submitGuard`, `storage`, `confirm`, `files`).
- `src/hooks/` `useTheme`, `useSwipe`.
- `src/constants/` theme, categories, currencies, months.
- `src/db/` `client.ts` (opens `cross-platform.db`), `migrations.ts`.
- `tests/` jest tests (`db/`, `domains/`, `lib/`) plus `helpers/testDb.ts`.

## Schema (version 2)

- `events(id TEXT PK, title, date INTEGER, time TEXT, created_at INTEGER, notes TEXT)`; `notes` was added in v2.
- `transactions(id TEXT PK, type, amount REAL, category, note, date INTEGER, created_at INTEGER)`.
- `settings(key TEXT PK, value TEXT)` with keys `currency` and `theme`; added in v2.

Dates are epoch milliseconds.

## Migrations

`src/db/migrations.ts` reads `PRAGMA user_version` and applies each step whose version is above it, in order, setting `user_version` after each step. v1 creates `events` and `transactions`; v2 adds `events.notes` (guarded by a `PRAGMA table_info` check) and creates `settings`. Existing v1 data is preserved.

## Web vs native

- Platform files use `.web.ts` pairs: `src/lib/confirm.ts` (`Alert.alert`) vs `confirm.web.ts` (`window.confirm`); `src/lib/files.ts` (native stub that throws) vs `files.web.ts` (download/pick a text file). Hence the backup UI is web-only.
- On web, expo-sqlite runs on wa-sqlite (WebAssembly). `metro.config.js` adds `wasm` to `assetExts` so the bundler serves it.
- `vercel.json` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (cross-origin isolation for the web SQLite build) and sets the build to `npx expo export --platform web` with output `dist`.

## Testing

Unit tested: services, backup validation and restore, migrations, summary helpers and pure `src/lib` helpers. Service tests run against a real SQLite engine through the sql.js-backed adapter in `tests/helpers/testDb.ts`. Screens and components are verified manually only (no UI tests).
