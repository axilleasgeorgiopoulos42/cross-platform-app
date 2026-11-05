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
- `src/domains/{calendar,expenses,settings,backup}/` each with `types.ts`, `service.ts`, `store.ts` (calendar and expenses also have a pure `search.ts`, expenses has `summary.ts`, `range.ts` and `chart.ts`, backup has `filename.ts`).
- `src/components/` shared UI (Screen, Card, Button, forms, CalendarGrid, `DateField`, `SearchBar`, `CategoryFilter`, `RangePicker`, `SpendChart`, `CategoryList`, ...).
- `src/lib/` pure helpers and platform adapters (`money`, `dates`, `text`, `time`, `swipe`, `settleOnce`, `submitGuard`, `storage`, `confirm`, `files`).
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
- `vercel.json` sends `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` (cross-origin isolation for the web SQLite build) and sets the build to `npx expo export --platform web` with output `dist`. A catch-all rewrite to `/index.html` serves the SPA for deep links and reloads (real files are served first).

## Dates and search

- `DateField` (`src/components/DateField.tsx`) is a labelled date control: a DOM `<input type="date">` on web and `@react-native-community/datetimepicker` on native. It reports a local-midnight timestamp (or `null` when cleared) and shows an optional error. `EventForm` and `TransactionForm` carry a required `date`; the Today and Calendar screens pass a default (Today screens use `dayStart` from `useTodayStart`); after saving a transaction the Expenses month view jumps to the saved date's month.
- `SearchBar` (text input with search icon and clear button) and `CategoryFilter` (chip row, "All" plus each category) are presentational and stateless; the screens own the query/filter state.
- Search is a pure-filter design. The domain `search.ts` modules (`searchEvents`, `filterTransactions`) take plain arrays and criteria and return new arrays; matching goes through `normalizeText`/`matchesQuery` in `src/lib/text.ts` (case-, accent- and Greek final-sigma-insensitive, plain substring, no regex so characters like `(` are safe). There is no SQL search.
- Calendar search needs every event, not just the visible month: the store keeps `allEvents` (loaded by `loadAllForSearch()` via `calendarService.getAll`) and add/update/delete refresh it. Expenses already holds all transactions in `transactions`, so it filters those directly. `EventItem` takes `showDate` so search results show the date.

## Expenses range, chart and categories

- `src/domains/expenses/range.ts` is the pure range model: `DateRange { preset, from, to }` with presets `week` (Monday start), `month`, `3months`, `year` and `custom`; helpers build, step (`shiftRange`), validate and label a range. The Expenses screen holds the range in local state (default: the current month) and passes it to the existing `filterTransactions` as `from`/`to`, merged with the search query and category filter. So chart, summary and category list all read the same filtered array; no new store state or SQL.
- `src/domains/expenses/chart.ts` buckets expenses for the chart: day buckets up to 31 days, week buckets up to 183 days, month buckets beyond that (`bucketGranularity`, `bucketExpenses`), plus pure helpers for label thinning (`visibleLabelIndexes`) and bar sizing (`barHeight`).
- `groupByCategory` in `summary.ts` groups expenses per category with their entries (newest first) for the list. `calendarDayCount` in `src/lib/dates.ts` (DST-safe inclusive day count) is shared by `range.ts` and `chart.ts`.
- Components: `RangePicker` (preset chips, stepper, custom From/To with local drafts so an invalid pair never reaches the screen), `SpendChart` (View-based bars, tap to select), `CategoryList` (expandable rows; entries reuse `TransactionItem`; row text from the pure `categoryRowLabel`). `MonthSwitcher` and `filterByMonth` are kept but the screen no longer uses them.

## Testing

Unit tested: services, backup validation and restore, migrations, summary helpers and pure `src/lib` helpers (including `dates` and `text`), and the pure search/filter modules, and the range and chart modules. Service tests run against a real SQLite engine through the sql.js-backed adapter in `tests/helpers/testDb.ts`. Screens and components are verified manually only (no UI tests).
