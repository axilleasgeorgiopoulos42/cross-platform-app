# Cross-Platform App v2 — Screens & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grow the 2-tab calendar/expenses app into a 3-tab app (Today, Calendar, Expenses) with edit screens, a Settings screen, backup/restore, currency, and monthly expense insights.

**Architecture:** Keep the layered shape (SQLite → service → Zustand store → components). Data model first: schema v2 (event notes, settings table), then services/stores, then pure summary logic, then UI. Logic lives in pure functions or service functions that are unit-tested against a real in-memory SQLite (sql.js); UI is verified with `tsc` and a manual web run.

**Tech Stack:** Expo SDK 58, React Native 0.88, React 19, TypeScript 6 strict, expo-router, expo-sqlite (wa-sqlite on web), Zustand 5, Feather icons, Jest (jest-expo) + sql.js for tests.

**Spec:** None written separately. The scope below is the spec; it comes from the screens/features proposal in the 2026-11-05 conversation. The user did not answer the "planner vs money tracker" question, so the plan weights both equally. Ruling to ledger if wrong: re-order tasks 9 and 10.

## Scope (the spec)

Screens (3 tabs + stack screens):
- **Today** tab (new, route `/`): today's events, this month's net balance, quick-add event and quick-add expense.
- **Calendar** tab (route `/calendar`): existing grid + swipe between months + "jump to today".
- **Expenses** tab: month filter, month totals, category breakdown, list.
- **Event detail/edit** (`/event/[id]`), **Transaction detail/edit** (`/transaction/[id]`): edit and delete.
- **Settings** (`/settings`, opened from a header gear on each tab): currency (EUR/USD/GBP), theme (system/light/dark), backup export/import (web only), clear all data.

Features: edit events/transactions, event notes, delete confirmation, currency formatting, backup/restore JSON, swipe months.
Out of scope: recurring events, budgets, search, reminders, cloud sync, native-platform backup UI.

## Global Constraints

- Expo SDK 58, React Native 0.88, TypeScript 6 strict. Add packages with `npx expo install <pkg>` (dev tools: `npm i -D`).
- Routes live in `app/` (not `src/app/`). Non-route code lives in `src/`.
- `StyleSheet` only. Theme tokens from `src/constants/theme.ts` only (`colors`, `spacing`, `radius`, `fontSize`); no raw hex in new components. Feather icons only, no emoji. Touch targets at least 44pt.
- Layering: components call stores, stores call services, services take `db: SQLiteDatabase`. Components never import services or `getDb`.
- Must work on web: `Alert.alert` is a no-op on web, so use the `confirmAction` helper (Task 6). Anything native-only needs a `.web.ts` counterpart or a guard.
- Local only: no backend, no auth, no network calls.
- Colors named in code are `background, surface, surfaceAlt, border, text, textSecondary, primary, primaryForeground, destructive, success, warning` (there is no `card`).
- Commit inside the `cross-platform-app` repo (it has its own `.git`), one commit per task, message ending with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Pushing to `main` auto-deploys to Vercel, so push only at Task 11.

## Review Focus

1. **Existing installs must upgrade without data loss.** A device with `user_version = 0` and real rows must reach schema v2 with rows intact and `notes = NULL`. (Task 2 test.)
2. **A bad backup must never destroy data.** Malformed, wrong-version, or foreign JSON is rejected before anything is deleted, and a failure mid-restore rolls back. (Task 5 tests.)
3. **Empty months must not produce NaN.** A month with no expenses, or only income, gives an empty breakdown and zero totals, never `NaN%` or a divide-by-zero. (Task 4 tests.)
4. **Edits obey the same rules as creates.** Empty event title and amount <= 0 are rejected on update; unknown ids throw a clear error. (Task 3 tests.)
5. **Detail screens opened for a missing id** (deleted item, page reload on `/event/abc`) show "not found" with a way back, not a crash. (Task 7 manual step.)
6. Money formatting never shows `-0.00` or `-€0.00`. (Task 1 test.)

---

### Task 1: Test infrastructure + money formatting

**Files:**
- Modify: `cross-platform-app/package.json` (jest config, `test` script, devDeps)
- Create: `cross-platform-app/tests/setup.ts`, `tests/helpers/testDb.ts`
- Create: `cross-platform-app/src/constants/currencies.ts`, `src/lib/money.ts`
- Test: `cross-platform-app/tests/lib/money.test.ts`

**Interfaces:**
- Produces: `type Currency = 'EUR' | 'USD' | 'GBP'`; `CURRENCIES: ReadonlyArray<Currency>`; `formatMoney(amount: number, currency: Currency): string`; `createTestDb(): Promise<SQLiteDatabase>` (sql.js-backed, implements `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`, `withTransactionAsync`).

- [ ] **Step 1: Commit leftover local changes.** Run `git status`. The working tree has uncommitted `package.json`, `package-lock.json`, `eslint.config.js`, `.gitignore` (from `expo lint` and `vercel link`). Review `git diff`, then commit them as `chore: add eslint config and ignore vercel files`. Do not stage `.env.local` or `.vercel/`.
- [ ] **Step 2: Install.** `npx expo install jest-expo jest @types/jest -- --save-dev`, then `npm i -D sql.js @types/sql.js`. Add `"test": "jest"` and a `jest` block: `preset: "jest-expo"`, `testEnvironment: "node"`, `testMatch: ["<rootDir>/tests/**/*.test.ts"]`, `setupFiles: ["<rootDir>/tests/setup.ts"]`. If the preset fails under `node`, fall back to `babel-jest` with `babel-preset-expo` and ledger a Ruling.
- [ ] **Step 3: `tests/setup.ts`** sets `globalThis.crypto ??= require('crypto').webcrypto` (services call `crypto.randomUUID()`).
- [ ] **Step 4: `tests/helpers/testDb.ts`** exports `createTestDb()`: `initSqlJs()` then a new `Database`, wrapped in an object cast to `SQLiteDatabase` with `execAsync(sql)`, `runAsync(sql, params)`, `getAllAsync<T>(sql, params)` (prepare/bind/`getAsObject` loop), `getFirstAsync<T>` (first row or `null`), and `withTransactionAsync(fn)` (`BEGIN`, await fn, `COMMIT`, or `ROLLBACK` then rethrow).
- [ ] **Step 5: Write the failing test** `tests/lib/money.test.ts`:
  - `formats EUR`: `formatMoney(1234.5, 'EUR')` is `'€1,234.50'`; USD gives `'$1,234.50'`; GBP gives `'£1,234.50'`.
  - `formats negatives`: `formatMoney(-5, 'USD')` is `'-$5.00'`.
  - `never shows negative zero`: `formatMoney(-0, 'EUR')` and `formatMoney(0.004, 'EUR')` and `formatMoney(-0.004, 'EUR')` are all `'€0.00'`.
- [ ] **Step 6: Run** `npx jest tests/lib/money.test.ts`. Expected: FAIL, cannot find module `src/lib/money`.
- [ ] **Step 7: Implement** `formatMoney` in `src/lib/money.ts` using `Intl.NumberFormat('en-US', { style: 'currency', currency })`, normalising `Math.abs(amount) < 0.005` to `0` first. Implement `src/constants/currencies.ts`.
- [ ] **Step 8: Run** `npx jest` then `npx tsc --noEmit`. Expected: 3 passed, tsc clean.
- [ ] **Step 9: Commit** `feat: add jest harness, sql.js test db, money formatting`.

---

### Task 2: Schema v2 + settings domain (data model first)

**Files:**
- Modify: `src/db/migrations.ts`, `src/domains/calendar/types.ts`, `src/domains/calendar/service.ts` (map `notes`)
- Create: `src/domains/settings/types.ts`, `service.ts`, `store.ts`
- Test: `tests/db/migrations.test.ts`, `tests/domains/settings.test.ts`

**Interfaces:**
- Consumes: `createTestDb`, `Currency`/`CURRENCIES` (Task 1).
- Produces: `CalendarEvent.notes: string | null`; `type ThemePreference = 'system' | 'light' | 'dark'`; `interface AppSettings { currency: Currency; theme: ThemePreference }`; `DEFAULT_SETTINGS: AppSettings = { currency: 'EUR', theme: 'system' }`; `settingsService.get(db): Promise<AppSettings>`; `settingsService.set(db, patch: Partial<AppSettings>): Promise<AppSettings>`; `useSettingsStore` with state `settings`, `loaded`, actions `load(): Promise<void>`, `setCurrency(c: Currency): Promise<void>`, `setTheme(t: ThemePreference): Promise<void>`.

- [ ] **Step 1: Write failing tests** in `tests/db/migrations.test.ts`:
  - `fresh database reaches version 2`: after `runMigrations`, `PRAGMA user_version` is 2, `PRAGMA table_info(events)` includes `notes`, table `settings` exists.
  - `v1 database upgrades without losing rows`: create the old `events`/`transactions` tables with `execAsync`, insert one row in each, leave `user_version` at 0, run migrations, then assert both rows are intact and `notes` is `null`.
  - `running migrations twice is a no-op`.
- [ ] **Step 2: Write failing tests** in `tests/domains/settings.test.ts`: `get returns defaults on empty db`; `set persists and get returns it`; `set rejects unsupported currency` (`'XYZ'` throws `Unsupported currency`); `stored garbage theme falls back to default` (write `theme = 'neon'` directly, `get` returns `'system'`).
- [ ] **Step 3: Run** `npx jest tests/db tests/domains/settings.test.ts`. Expected: FAIL.
- [ ] **Step 4: Implement `runMigrations(db)`** with `PRAGMA user_version`: step to 1 = existing `CREATE TABLE IF NOT EXISTS` statements; step to 2 = `ALTER TABLE events ADD COLUMN notes TEXT` only if `PRAGMA table_info(events)` lacks it, plus `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`; set `user_version = 2`. Each step runs only when the current version is below it.
- [ ] **Step 5: Implement** `settingsService` (key/value rows, validate against `CURRENCIES` and the theme union, merge over `DEFAULT_SETTINGS`), the store (calls `getDb()`), and add `notes` to `CalendarEvent` and `toEvent`.
- [ ] **Step 6: Run** `npx jest` and `npx tsc --noEmit`. Expected: all pass, tsc clean (fix any `CalendarEvent` construction sites that now need `notes`).
- [ ] **Step 7: Commit** `feat: schema v2 with event notes and settings domain`.

---

### Task 3: Update operations in services and stores

**Files:**
- Modify: `src/domains/calendar/service.ts`, `store.ts`; `src/domains/expenses/service.ts`, `store.ts`
- Test: `tests/domains/calendar.test.ts`, `tests/domains/expenses.test.ts`

**Interfaces:**
- Consumes: Task 2 schema and `CalendarEvent.notes`.
- Produces:
  - `calendarService.create(db, data: { title: string; date: number; time: string | null; notes?: string | null })`
  - `calendarService.getById(db, id: string): Promise<CalendarEvent | null>`
  - `calendarService.update(db, id: string, patch: { title?: string; date?: number; time?: string | null; notes?: string | null }): Promise<CalendarEvent>`; throws `Event not found`, `Event title cannot be empty`
  - `expenseService.getById(db, id: string): Promise<Transaction | null>`
  - `expenseService.update(db, id: string, patch: Partial<Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>>): Promise<Transaction>`; throws `Transaction not found`, `Amount must be greater than 0`
  - Calendar store: `addEvent(title, date, time, notes?: string | null)`, `updateEvent(id, patch): Promise<void>`, `fetchEvent(id): Promise<CalendarEvent | null>`
  - Expense store: `updateTransaction(id, patch): Promise<void>`, `fetchTransaction(id): Promise<Transaction | null>`

- [ ] **Step 1: Write failing tests.** Calendar: `update changes title, time and notes`; `update with time null clears time`; `update rejects blank title`; `update on unknown id throws Event not found`; `getById returns null for unknown id`; `create stores notes`. Expenses: `update changes category and note`; `update rejects amount 0 and negative`; `update on unknown id throws Transaction not found`; `update recomputes getBalance` (change an expense amount, balance follows).
- [ ] **Step 2: Run** `npx jest tests/domains`. Expected: FAIL (`update is not a function`).
- [ ] **Step 3: Implement** the service methods (read row, merge patch, validate, `UPDATE`, return the mapped row). Implement store actions that set `error` on failure and reload as `addEvent`/`addTransaction` already do. `fetchEvent`/`fetchTransaction` return the service result without touching list state.
- [ ] **Step 4: Run** `npx jest` and `npx tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: edit and lookup operations for events and transactions`.

---

### Task 4: Expense summaries (pure functions)

**Files:**
- Create: `src/domains/expenses/summary.ts`
- Test: `tests/domains/summary.test.ts`

**Interfaces:**
- Consumes: `Transaction`, `Category`, `BalanceSummary`.
- Produces: `filterByMonth(txs: Transaction[], year: number, month: number): Transaction[]` (local-time month, `month` 0-11); `summarize(txs: Transaction[]): BalanceSummary`; `categoryBreakdown(txs: Transaction[]): Array<{ category: Category; total: number; share: number }>` (expenses only, sorted by total descending, `share` in 0..1).

- [ ] **Step 1: Write failing tests:**
  - `filterByMonth includes first and last millisecond of the month and excludes neighbours` (use `new Date(y, m, 1)` and `new Date(y, m + 1, 0, 23, 59, 59, 999)`).
  - `filterByMonth wraps December correctly` (month 11 does not include January).
  - `summarize on empty list is all zeros`.
  - `summarize nets income minus expenses`.
  - `categoryBreakdown on empty list returns []`.
  - `categoryBreakdown ignores income`; income-only input returns `[]` and no NaN anywhere.
  - `categoryBreakdown shares sum to 1 and are sorted descending`.
- [ ] **Step 2: Run** `npx jest tests/domains/summary.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Guard the zero-total case before dividing.
- [ ] **Step 4: Run** `npx jest`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: pure month filtering and category breakdown`.

---

### Task 5: Backup domain + web file I/O

**Files:**
- Create: `src/domains/backup/types.ts`, `src/domains/backup/service.ts`, `src/lib/files.web.ts`, `src/lib/files.ts`
- Test: `tests/domains/backup.test.ts`

**Interfaces:**
- Consumes: `calendarService`, `expenseService`, `settingsService`, `createTestDb`.
- Produces: `interface BackupFile { version: 1; exportedAt: number; events: CalendarEvent[]; transactions: Transaction[]; settings: AppSettings }`; `buildBackup(db): Promise<BackupFile>`; `parseBackup(text: string): BackupFile` (throws `Error('Invalid backup file: <reason>')`); `restoreBackup(db, backup: BackupFile): Promise<{ events: number; transactions: number }>` (replaces all data atomically); `clearAllData(db): Promise<void>`; `downloadTextFile(name: string, text: string): void`; `pickTextFile(): Promise<string | null>` (`null` if cancelled). The native `files.ts` exports the same names and throws `Not supported on this platform`.

- [ ] **Step 1: Write failing tests:**
  - `round trip`: seed db A with 2 events (one with notes) and 2 transactions, `buildBackup`, `parseBackup(JSON.stringify(...))`, `restoreBackup` into empty db B, then `buildBackup(B)` equals the original apart from `exportedAt`.
  - `restore replaces rather than merges`: restoring the same backup twice leaves 2 events, not 4.
  - `parseBackup rejects`: `''`, `'not json'`, `'{"version":2}'`, an event with no title, a transaction with amount -1, a transaction with category `'crypto'`, and `'[]'`. Each throws a message starting `Invalid backup file`.
  - `failed restore keeps existing data`: seed db with 1 event, call `restoreBackup` with a hand-built object whose second event has `title: null`, expect it to throw and expect the original event to still be present.
  - `clearAllData empties events and transactions but keeps settings defaults readable`.
- [ ] **Step 2: Run** `npx jest tests/domains/backup.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `parseBackup` (full structural validation including `CATEGORIES` keys, type union, finite positive amounts, string ids) and `restoreBackup` inside `db.withTransactionAsync` (delete all, insert all, write settings). `files.web.ts`: build a `Blob`, click a temporary `<a download>`; `pickTextFile` creates an `<input type="file" accept="application/json">` and reads the file with `FileReader`.
- [ ] **Step 4: Run** `npx jest` and `npx tsc --noEmit`. Expected: all pass.
- [ ] **Step 5: Commit** `feat: backup export, validation and atomic restore`.

---

### Task 6: UI foundations (confirm, forms, swipe, time validation)

**Files:**
- Create: `src/lib/confirm.ts`, `src/lib/confirm.web.ts`, `src/lib/swipe.ts`, `src/lib/time.ts`, `src/hooks/useSwipe.ts`
- Create: `src/components/EventForm.tsx`, `src/components/TransactionForm.tsx`
- Modify: `src/components/index.ts`, `app/(tabs)/index.tsx` and `app/(tabs)/expenses.tsx` (use the forms inside their existing Add modals)
- Test: `tests/lib/swipe.test.ts`, `tests/lib/time.test.ts`

**Interfaces:**
- Produces:
  - `confirmAction(title: string, message: string, confirmLabel?: string): Promise<boolean>` (web: `window.confirm`; native: `Alert.alert` with Cancel/confirm)
  - `swipeDirection(dx: number, dy: number, threshold?: number): 'left' | 'right' | null` (default threshold 50; null when `|dy| > |dx|` or below threshold)
  - `useSwipe(handlers: { onLeft(): void; onRight(): void }): PanResponderInstance['panHandlers']`
  - `isValidTime(input: string): boolean` (`HH:MM`, 00:00 to 23:59)
  - `EventForm` props `{ initial?: Partial<EventFormValues>; submitLabel: string; onSubmit(values: EventFormValues): void | Promise<void> }`, where `EventFormValues = { title: string; time: string | null; notes: string | null }`; the form disables submit for a blank title or an invalid time.
  - `TransactionForm` props `{ initial?: Partial<TransactionFormValues>; submitLabel: string; onSubmit(values: TransactionFormValues): void | Promise<void> }`, where `TransactionFormValues = { type: 'income' | 'expense'; amount: number; category: Category; note: string | null }`; disables submit unless amount > 0.

- [ ] **Step 1: Write failing tests.** `swipe.test.ts`: `-80,0 gives 'left'`; `80,0 gives 'right'`; `30,0 gives null`; `80,120 gives null` (mostly vertical). `time.test.ts`: accepts `'09:05'`, `'23:59'`; rejects `'24:00'`, `'9:5'`, `'12:60'`, `''`, `'ab:cd'`.
- [ ] **Step 2: Run** `npx jest tests/lib`. Expected: FAIL.
- [ ] **Step 3: Implement** `swipe.ts`, `time.ts`, `useSwipe.ts` (PanResponder calling `swipeDirection` on release; `onMoveShouldSetPanResponder` true only for mostly-horizontal moves so vertical scrolling still works), `confirm.ts` / `confirm.web.ts`.
- [ ] **Step 4: Extract** the existing modal bodies into `EventForm` and `TransactionForm` (moving the current inputs, All-day switch, type toggle and `CategoryPicker`; add a Notes `TextInput` to `EventForm`), and use them in both screens. Behaviour of the existing add flows must not change.
- [ ] **Step 5: Verify.** `npx jest` (all pass), `npx tsc --noEmit` (clean), then `npx expo start --web` and add one event with a note and one expense. Expected: both save and appear as before.
- [ ] **Step 6: Commit** `feat: shared forms, confirm helper, swipe and time validation`.

---

### Task 7: Detail/edit screens + row navigation + delete confirmation

**Files:**
- Create: `app/event/[id].tsx`, `app/transaction/[id].tsx`
- Modify: `src/components/EventItem.tsx`, `src/components/TransactionItem.tsx` (row press navigates; delete goes through `confirmAction`), `app/_layout.tsx` (register screens with titles)

**Interfaces:**
- Consumes: `EventForm`, `TransactionForm`, `confirmAction` (Task 6); `fetchEvent`, `updateEvent`, `deleteEvent`, `fetchTransaction`, `updateTransaction`, `deleteTransaction` (Task 3).
- Produces: routes `/event/<id>` and `/transaction/<id>`. Saving or deleting calls `router.back()`.

- [ ] **Step 1: Implement** each detail screen: `useLocalSearchParams<{ id: string }>()`, load via `fetchEvent` / `fetchTransaction` in an effect, render loading state, then the form with `submitLabel="Save"` and a destructive Delete `Button` that awaits `confirmAction`. If the result is `null`, render `EmptyState message="Not found"` and a "Go back" `Button` (use `router.canGoBack()` else `router.replace('/')`).
- [ ] **Step 2: Wire rows.** `EventItem` and `TransactionItem` rows are pressable (`router.push`); the trash icon stays but now awaits `confirmAction('Delete event', 'This cannot be undone.', 'Delete')` before calling `onDelete`. Keep the trash hit area at least 44pt.
- [ ] **Step 3: Typecheck.** `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 4: Verify on web** (`npx expo start --web`):
  1. Tap an event: edit title and notes, Save. Expected: returns to the list, change visible.
  2. Tap trash: confirm dialog appears; Cancel keeps it, OK deletes it.
  3. Edit a transaction's amount; Expected: the balance card updates.
  4. Open `/event/does-not-exist` directly. Expected: "Not found" with a working back button, no crash (Review Focus 5).
  5. Reload the page while on `/event/<real id>`. Expected: the event still loads.
- [ ] **Step 5: Commit** `feat: event and transaction detail screens with delete confirmation`.

---

### Task 8: Settings screen, theme override, currency applied

**Files:**
- Create: `app/settings.tsx`
- Modify: `src/hooks/useTheme.ts` (honor `settings.theme`), `app/_layout.tsx` (load settings after migrations; register `settings` and hide the `(tabs)` stack header), `app/(tabs)/_layout.tsx` (gear `headerRight` linking to `/settings`), `src/components/TransactionItem.tsx` and `app/(tabs)/expenses.tsx` (use `formatMoney` with the stored currency)

**Interfaces:**
- Consumes: `useSettingsStore` (Task 2), `formatMoney`, `buildBackup`/`parseBackup`/`restoreBackup`/`clearAllData`, `downloadTextFile`/`pickTextFile` (Task 5), `confirmAction`.
- Produces: Settings screen sections Currency (3 chips), Theme (3 chips), Backup (Export, Import; rendered only when `Platform.OS === 'web'`), Danger zone (Clear all data, confirmed).

- [ ] **Step 1: Implement** `useTheme` so `theme: 'light' | 'dark'` overrides the system scheme and `'system'` follows it. Settings loads once in `_layout.tsx` after `runMigrations`; render nothing extra while `!loaded`.
- [ ] **Step 2: Implement** the Settings screen. Export downloads `crosscal-backup-YYYY-MM-DD.json`. Import: pick file, `parseBackup`, `confirmAction` ("Replace all current data?"), `restoreBackup`, reload both stores, show a success line with counts; any `Invalid backup file` error is shown inline and nothing changes. Clear all data: confirm, `clearAllData`, reload stores.
- [ ] **Step 3: Apply currency.** Replace every `toFixed(2)` money display in `expenses.tsx` and `TransactionItem.tsx` with `formatMoney`; sign prefix stays outside (`+` / `−` with `Math.abs`).
- [ ] **Step 4: Typecheck.** `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 5: Verify on web:**
  1. Gear opens Settings; back returns.
  2. Switch currency to USD. Expected: Expenses amounts show `$`.
  3. Theme Dark. Expected: whole app dark immediately; reload keeps it.
  4. Export, then Clear all data, then Import the file. Expected: data returns exactly.
  5. Import a random `.txt` file. Expected: inline "Invalid backup file" and existing data unchanged.
  6. Check there is no double header on the tab screens.
- [ ] **Step 6: Commit** `feat: settings screen with currency, theme and backup`.

---

### Task 9: Today tab + Calendar polish

**Files:**
- Move: `app/(tabs)/index.tsx` to `app/(tabs)/calendar.tsx` (use `git mv`)
- Create: `app/(tabs)/index.tsx` (Today)
- Modify: `app/(tabs)/_layout.tsx` (tab order Today, Calendar, Expenses; icons `sun`, `calendar`, `credit-card`), `app/(tabs)/calendar.tsx` (swipe on the grid, "Today" header button)

**Interfaces:**
- Consumes: `useSwipe` (Task 6), `EventForm`, `TransactionForm`, `summarize`/`filterByMonth` (Task 4), `formatMoney`, both stores.
- Produces: Today screen showing the date heading, today's events (`EventItem`), a month-net `Card` (this month's income, expenses, net), and two buttons "Add event" / "Add expense" that open the existing `Modal` with the matching form (event date = start of today).

- [ ] **Step 1: Move and re-point** the calendar file; keep behaviour. Update `Tabs.Screen` names (`index`, `calendar`, `expenses`).
- [ ] **Step 2: Calendar.** Wrap the `CalendarGrid` in a `View` with `{...panHandlers}`: left swipe calls `nextMonth`, right calls `prevMonth`. Add a header-right "Today" `Pressable` (44pt) that calls `loadMonth(thisYear, thisMonth)` and `selectDate(startOfToday)`.
- [ ] **Step 3: Today screen.** On focus (`useFocusEffect`) call `loadMonth(now.getFullYear(), now.getMonth())` and `loadTransactions()`, since the calendar store may be on another month. Today's events are those whose `date` falls on today. Empty state: `EmptyState message="Nothing planned today"`. Month card uses `summarize(filterByMonth(transactions, y, m))`.
- [ ] **Step 4: Typecheck.** `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 5: Verify on web:**
  1. App opens on Today. Quick-add an event; it appears in the list immediately.
  2. Quick-add an expense; the month card net changes.
  3. On Calendar, swipe left/right on the grid (use browser touch emulation); the month changes and vertical scroll still works.
  4. Navigate to a past month, then tap the Today button. Expected: current month with today selected.
  5. Go to a different month in Calendar, then open Today. Expected: today's events still appear.
- [ ] **Step 6: Commit** `feat: today tab and calendar swipe and jump-to-today`.

---

### Task 10: Expenses month filter + category breakdown

**Files:**
- Create: `src/components/CategoryBreakdown.tsx`, `src/components/MonthSwitcher.tsx`
- Modify: `src/components/index.ts`, `app/(tabs)/expenses.tsx`, `app/(tabs)/calendar.tsx` (use `MonthSwitcher` in place of its inline header)

**Interfaces:**
- Consumes: `filterByMonth`, `summarize`, `categoryBreakdown` (Task 4), `formatMoney`, `CATEGORIES`.
- Produces: `MonthSwitcher` props `{ year: number; month: number; onPrev(): void; onNext(): void }`; `CategoryBreakdown` props `{ items: Array<{ category: Category; total: number; share: number }>; currency: Currency }` (one row per item: Feather icon, label, a bar whose width is `share * 100%` in `primary`, amount; renders nothing when `items` is empty).

- [ ] **Step 1: Implement** the two components using only theme tokens; chevron buttons are at least 44pt with `hitSlop`.
- [ ] **Step 2: Expenses screen.** Local state `{ year, month }` starting at the current month, with `MonthSwitcher` at the top. The balance card shows the selected month's income, expenses and net from `summarize(filterByMonth(...))`, with a small "All time" caption row using the store's existing `balance`. `FlatList` data is the filtered list. Add `CategoryBreakdown` above the list. The empty message is "No transactions this month" when the filter yields nothing.
- [ ] **Step 3: Typecheck.** `npx tsc --noEmit`. Expected: clean.
- [ ] **Step 4: Verify on web:**
  1. Add expenses in two different categories this month. Expected: bars proportional, largest first.
  2. Step to the previous month. Expected: card and list zero/empty, no breakdown, no `NaN`.
  3. Add income only in a month. Expected: breakdown hidden, net positive.
- [ ] **Step 5: Commit** `feat: expenses month filter and category breakdown`.

---

### Task 11: Docs, full verification, deploy

**Files:**
- Create: `README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `API.md` (in `cross-platform-app/`)

- [ ] **Step 1: Write the docs, concise.** README: what the app is, screens, run/test/deploy commands, the PWA install steps. ARCHITECTURE: layer diagram, schema v2, migration approach (`user_version`), where logic is tested. DEVELOPMENT: setup, scripts, test harness (sql.js), web-vs-native notes (`.web.ts` pairs, no `Alert.alert`). API: the domain service and store signatures from Tasks 2 to 5 (there is no HTTP API; say so).
- [ ] **Step 2: Full check.** `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web`. Expected: all green, `dist` produced.
- [ ] **Step 3: Commit** `docs: readme, architecture, development and api reference`.
- [ ] **Step 4: Push** with `git push origin main` (this is the first push of the plan; it triggers a Vercel auto-deploy). Wait for the deployment, then open `https://cross-platform-app-navy.vercel.app` and run the Task 8 steps 4 and 5 (export, clear, import, bad file) against production.
- [ ] **Step 5: Phone check.** On the iPhone PWA, confirm an existing event/expense from v1 is still present after the update (Review Focus 1 on real data), then report to the user.
