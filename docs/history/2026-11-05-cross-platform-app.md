# Cross-Platform Calendar & Expenses App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a minimal two-tab mobile app with calendar event tracking and expense logging, local-only with SQLite.

**Architecture:** Two self-contained domains (calendar, expenses) each with types → service → Zustand store → screens. SQLite is the single source of truth. Expo Router provides file-based 2-tab navigation. Existing themed components (Screen, Card, Button, Typography) are reused; new shared components (Modal, FAB, EmptyState, CalendarGrid) are added.

**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript 6 (strict), expo-sqlite, Zustand 5, @expo/vector-icons (Feather)

**Spec:** `docs/superpowers/specs/2026-11-05-cross-platform-app-design.md`

## Global Constraints

- TypeScript strict mode (`"strict": true` in tsconfig)
- No network calls, no user accounts, no cloud sync
- All IDs are UUIDs via `crypto.randomUUID()`
- All timestamps are Unix milliseconds (INTEGER in SQLite, `number` in TS)
- Expo SDK 58 — use `npx expo install` for all new dependencies
- StyleSheet API only — no NativeWind, no styled-components
- System fonts only — no custom font loading
- Feather icons via `@expo/vector-icons` (bundled with Expo)
- Run `npx tsc --noEmit` before declaring any task done

## Review Focus

1. **Empty arrays fed to calendar grid** — month with zero events must render a normal grid with no dots and no crash. Add empty-month render verification to Task 5.
2. **Amount validation bypass** — `expenseService.create` must reject `amount <= 0` and non-numeric input. Add validation tests to Task 3.
3. **Month boundary arithmetic** — `getEventsForMonth` must use first-of-month 00:00:00.000 through last-of-month 23:59:59.999 in local time, not UTC or rolling-30-day. Add boundary test to Task 2.
4. **Calendar grid padding days** — months that start mid-week need leading days from the previous month; months that end mid-week need trailing days. Grid must always render exactly 42 cells (6×7). Add padding test to Task 5.
5. **Negative balance display** — a balance of -€50 must render as a red negative number, not crash or show NaN. Add negative-balance rendering to Task 6.

---

### Task 1: Scaffold — Install deps, DB layer, clean up placeholders

**Files:**
- Modify: `cross-platform-app/package.json` (add expo-sqlite)
- Create: `cross-platform-app/src/db/client.ts`
- Create: `cross-platform-app/src/db/migrations.ts`
- Modify: `cross-platform-app/app/_layout.tsx` (add DB init)
- Delete: `cross-platform-app/app/(tabs)/explore.tsx`
- Delete: `cross-platform-app/app/(tabs)/settings.tsx`
- Delete: `cross-platform-app/src/services/example.ts`
- Delete: `cross-platform-app/src/lib/api.ts`
- Modify: `cross-platform-app/app/(tabs)/_layout.tsx` (2 tabs with Feather icons)
- Create: `cross-platform-app/app/(tabs)/expenses.tsx` (placeholder)
- Modify: `cross-platform-app/app/(tabs)/index.tsx` (placeholder)
- Modify: `cross-platform-app/src/components/index.ts` (barrel stays, will grow later)

**Interfaces:**
- Consumes: existing scaffold files
- Produces:
  - `getDb(): Promise<SQLiteDatabase>` — async singleton from `src/db/client.ts`
  - `runMigrations(db: SQLiteDatabase): Promise<void>` — creates `events` and `transactions` tables idempotently from `src/db/migrations.ts`

- [ ] **Step 1: Install expo-sqlite**

Run: `cd cross-platform-app && npx expo install expo-sqlite`

- [ ] **Step 2: Implement `src/db/migrations.ts`**

Export `runMigrations(db: SQLiteDatabase): Promise<void>`. Call `db.execAsync()` with two `CREATE TABLE IF NOT EXISTS` statements:

- `events`: `id TEXT PRIMARY KEY, title TEXT NOT NULL, date INTEGER NOT NULL, time TEXT, created_at INTEGER NOT NULL`
- `transactions`: `id TEXT PRIMARY KEY, type TEXT NOT NULL, amount REAL NOT NULL, category TEXT NOT NULL, note TEXT, date INTEGER NOT NULL, created_at INTEGER NOT NULL`

- [ ] **Step 3: Implement `src/db/client.ts`**

Export `getDb(): Promise<SQLiteDatabase>`. Opens `SQLite.openDatabaseAsync('cross-platform.db')` once, caches the promise, returns it.

- [ ] **Step 4: Wire DB init into `app/_layout.tsx`**

Add `dbReady` state. In `useEffect`, call `getDb()` then `runMigrations(db)`, set `dbReady = true`. Render `<Stack>` children only when `dbReady` is true.

- [ ] **Step 5: Delete unused scaffold files**

Remove: `app/(tabs)/explore.tsx`, `app/(tabs)/settings.tsx`, `src/services/example.ts`, `src/lib/api.ts`.

- [ ] **Step 6: Replace tab layout with 2 tabs + Feather icons**

Rewrite `app/(tabs)/_layout.tsx`:
- Import `Feather` from `@expo/vector-icons`
- Two `Tabs.Screen` entries: `index` (title "Calendar", icon `calendar`) and `expenses` (title "Expenses", icon `credit-card`)
- Remove the emoji `TabIcon` component
- Keep theme-aware `tabBarStyle`, `tabBarActiveTintColor`, `tabBarInactiveTintColor`

- [ ] **Step 7: Replace `app/(tabs)/index.tsx` with Calendar placeholder**

Render `<Screen><Typography variant="h2">Calendar</Typography></Screen>`.

- [ ] **Step 8: Create `app/(tabs)/expenses.tsx` placeholder**

Render `<Screen><Typography variant="h2">Expenses</Typography></Screen>`.

- [ ] **Step 9: Typecheck**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add cross-platform-app/
git commit -m "feat: scaffold DB layer, 2-tab navigation, remove placeholders"
```

---

### Task 2: Calendar Domain — Types + Service

**Files:**
- Create: `cross-platform-app/src/domains/calendar/types.ts`
- Create: `cross-platform-app/src/domains/calendar/service.ts`

**Interfaces:**
- Consumes: `getDb` from `src/db/client`, `runMigrations` from `src/db/migrations`, `SQLiteDatabase` from `expo-sqlite`
- Produces:
  - Type: `CalendarEvent { id: string; title: string; date: number; time: string | null; createdAt: number }`
  - `calendarService.getEventsForMonth(db: SQLiteDatabase, year: number, month: number): Promise<CalendarEvent[]>`
  - `calendarService.getEventsForDate(db: SQLiteDatabase, date: number): Promise<CalendarEvent[]>` — sorted by time, nulls first
  - `calendarService.create(db: SQLiteDatabase, data: { title: string; date: number; time: string | null }): Promise<CalendarEvent>` — rejects empty title
  - `calendarService.remove(db: SQLiteDatabase, id: string): Promise<void>`

- [ ] **Step 1: Create `src/domains/calendar/types.ts`**

Export the `CalendarEvent` interface as specified.

- [ ] **Step 2: Implement `src/domains/calendar/service.ts`**

Export `calendarService` object with four methods:

- `getEventsForMonth`: compute `start = new Date(year, month, 1).getTime()` and `end = new Date(year, month + 1, 1).getTime() - 1`. Query `SELECT * FROM events WHERE date >= ? AND date <= ? ORDER BY date, time`.
- `getEventsForDate`: compute day start (midnight) and day end (23:59:59.999). Query with `ORDER BY time IS NOT NULL, time` (nulls/all-day first).
- `create`: validate `title.trim()` is non-empty (throw if not). Generate UUID, compute `createdAt = Date.now()`. `INSERT INTO events`. Return the created object.
- `remove`: `DELETE FROM events WHERE id = ?`.

Map DB rows (snake_case `created_at`) to TS interface (camelCase `createdAt`).

- [ ] **Step 3: Typecheck**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add cross-platform-app/src/domains/calendar/
git commit -m "feat: add calendar domain types and service"
```

---

### Task 3: Expenses Domain — Types + Service + Categories

**Files:**
- Create: `cross-platform-app/src/domains/expenses/types.ts`
- Create: `cross-platform-app/src/domains/expenses/service.ts`
- Create: `cross-platform-app/src/constants/categories.ts`

**Interfaces:**
- Consumes: `SQLiteDatabase` from `expo-sqlite`
- Produces:
  - Types: `Category` (union of 7 string literals), `Transaction { id: string; type: 'income' | 'expense'; amount: number; category: Category; note: string | null; date: number; createdAt: number }`, `BalanceSummary { totalIncome: number; totalExpenses: number; balance: number }`
  - `CATEGORIES: Array<{ key: Category; label: string; icon: string }>` from `src/constants/categories.ts`
  - `expenseService.getAll(db): Promise<Transaction[]>` — sorted by date DESC
  - `expenseService.create(db, data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>` — rejects `amount <= 0`
  - `expenseService.remove(db, id): Promise<void>`
  - `expenseService.getBalance(db): Promise<BalanceSummary>`

- [ ] **Step 1: Create `src/domains/expenses/types.ts`**

Export `Category` union type, `Transaction` interface, and `BalanceSummary` interface as specified in the spec.

- [ ] **Step 2: Create `src/constants/categories.ts`**

Export `CATEGORIES` array:

```typescript
export const CATEGORIES = [
  { key: 'food', label: 'Food', icon: 'coffee' },
  { key: 'transport', label: 'Transport', icon: 'navigation' },
  { key: 'bills', label: 'Bills', icon: 'file-text' },
  { key: 'entertainment', label: 'Entertainment', icon: 'music' },
  { key: 'health', label: 'Health', icon: 'heart' },
  { key: 'shopping', label: 'Shopping', icon: 'shopping-bag' },
  { key: 'other', label: 'Other', icon: 'more-horizontal' },
] as const satisfies ReadonlyArray<{ key: Category; label: string; icon: string }>;
```

Export `INCOME_ICON = 'dollar-sign'` for income transactions.

- [ ] **Step 3: Implement `src/domains/expenses/service.ts`**

Export `expenseService` object with four methods:

- `getAll`: `SELECT * FROM transactions ORDER BY date DESC`. Map rows.
- `create`: validate `amount > 0` (throw if not). Generate UUID, set `createdAt = Date.now()`. `INSERT INTO transactions`. Return created object.
- `remove`: `DELETE FROM transactions WHERE id = ?`.
- `getBalance`: `SELECT type, SUM(amount) as total FROM transactions GROUP BY type`. Compute `totalIncome`, `totalExpenses`, `balance = totalIncome - totalExpenses`. Return `{ totalIncome: 0, totalExpenses: 0, balance: 0 }` when no rows.

- [ ] **Step 4: Typecheck**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add cross-platform-app/src/domains/expenses/ cross-platform-app/src/constants/categories.ts
git commit -m "feat: add expenses domain types, service, and categories"
```

---

### Task 4: Zustand Stores — Calendar + Expenses

**Files:**
- Create: `cross-platform-app/src/domains/calendar/store.ts`
- Create: `cross-platform-app/src/domains/expenses/store.ts`

**Interfaces:**
- Consumes: `calendarService` from Task 2, `expenseService` from Task 3, `getDb` from Task 1
- Produces:
  - `useCalendarStore` — Zustand hook: state `events`, `selectedDate`, `currentMonth`, `loading`, `error`; actions `loadMonth`, `selectDate`, `addEvent`, `deleteEvent`, `nextMonth`, `prevMonth`
  - `useExpenseStore` — Zustand hook: state `transactions`, `balance`, `loading`, `error`; actions `loadTransactions`, `addTransaction`, `deleteTransaction`

- [ ] **Step 1: Implement `src/domains/calendar/store.ts`**

`create()` from Zustand. Initial state: `events: []`, `selectedDate: null`, `currentMonth: { year: new Date().getFullYear(), month: new Date().getMonth() }`, `loading: false`, `error: null`.

Actions:
- `loadMonth(year, month)`: set loading, call `calendarService.getEventsForMonth`, set events, unset loading. Wrap in try/catch setting error.
- `selectDate(date)`: set `selectedDate`.
- `addEvent(title, date, time)`: call `calendarService.create`, then `loadMonth` for current month.
- `deleteEvent(id)`: call `calendarService.remove`, then `loadMonth`.
- `nextMonth()`: increment month (wrap year at 12), call `loadMonth`, clear `selectedDate`.
- `prevMonth()`: decrement month (wrap year at 0), call `loadMonth`, clear `selectedDate`.

- [ ] **Step 2: Implement `src/domains/expenses/store.ts`**

`create()` from Zustand. Initial state: `transactions: []`, `balance: { totalIncome: 0, totalExpenses: 0, balance: 0 }`, `loading: false`, `error: null`.

Actions:
- `loadTransactions()`: set loading, call `expenseService.getAll` and `expenseService.getBalance`, set both, unset loading.
- `addTransaction(data)`: call `expenseService.create`, then `loadTransactions`.
- `deleteTransaction(id)`: call `expenseService.remove`, then `loadTransactions`.

- [ ] **Step 3: Typecheck**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add cross-platform-app/src/domains/
git commit -m "feat: add calendar and expenses Zustand stores"
```

---

### Task 5: Shared Components + Calendar Screen

**Files:**
- Create: `cross-platform-app/src/components/Modal.tsx`
- Create: `cross-platform-app/src/components/FAB.tsx`
- Create: `cross-platform-app/src/components/EmptyState.tsx`
- Create: `cross-platform-app/src/components/CalendarGrid.tsx`
- Create: `cross-platform-app/src/components/DayCell.tsx`
- Create: `cross-platform-app/src/components/EventItem.tsx`
- Modify: `cross-platform-app/src/components/index.ts` (add exports)
- Modify: `cross-platform-app/app/(tabs)/index.tsx` (full calendar screen)

**Interfaces:**
- Consumes: `useCalendarStore` from Task 4, `Card`/`Button`/`Typography`/`Screen` from existing components, `useTheme`, theme tokens, `Feather` from `@expo/vector-icons`
- Produces: fully interactive Calendar tab

- [ ] **Step 1: Implement `Modal.tsx`**

Props: `visible: boolean`, `onClose: () => void`, `title: string`, `children: ReactNode`.

Use React Native's `Modal` with `transparent`, `animationType="slide"`. Render a `Pressable` backdrop (black at 50% opacity, `onPress={onClose}`) containing a bottom-aligned card (`surface` background, top border radius `radius.lg`, padding `spacing.lg`). Title rendered with `Typography variant="h3"`. Children below.

- [ ] **Step 2: Implement `FAB.tsx`**

Props: `onPress: () => void`, `disabled?: boolean`.

`Pressable`, position absolute `bottom: 24, right: 24`. 56×56 circle, `primary` background, centered `Feather` icon `plus` in `primaryForeground` at size 24. Pressed state: `opacity: 0.8`. Disabled state: `opacity: 0.5`. `testID="fab"`.

- [ ] **Step 3: Implement `EmptyState.tsx`**

Props: `message: string`, `icon?: string` (Feather icon name).

Centered `View` with flex 1. If icon provided, render `Feather` icon in `textSecondary` at size 48 with `spacing.md` margin below. Render message with `Typography variant="body" secondary`.

- [ ] **Step 4: Implement `DayCell.tsx`**

Props: `day: number`, `isCurrentMonth: boolean`, `isToday: boolean`, `isSelected: boolean`, `hasEvents: boolean`, `onPress: () => void`.

`Pressable`, fixed width/height (calculated as `(screenWidth - 2 * spacing.md) / 7`). Day number centered. Styles:
- Not current month: `textSecondary` color at 40% opacity
- Today: bold text
- Selected: `primary` background at 15% opacity, rounded
- Has events: 6×6 dot below number in `primary` color

- [ ] **Step 5: Implement `CalendarGrid.tsx`**

Props: `year: number`, `month: number`, `events: CalendarEvent[]`, `selectedDate: number | null`, `onSelectDate: (date: number) => void`, `today: number`.

Compute 42-cell grid:
1. Find first day of month (`new Date(year, month, 1).getDay()`) — adjust for Monday start
2. Fill leading cells from previous month
3. Fill current month days
4. Fill trailing cells from next month
5. For each cell, determine `hasEvents` by checking if any event's `date` matches that cell's midnight timestamp

Render weekday header row (Mon–Sun) using `Typography variant="caption"`. Then 6 rows of 7 `DayCell` each. Verify: empty events array renders 42 cells with no dots (Review Focus #1 and #4).

- [ ] **Step 6: Implement `EventItem.tsx`**

Props: `event: CalendarEvent`, `onDelete: (id: string) => void`.

Row layout: left side shows time (`event.time ?? "All day"`) in `Typography variant="caption"`, title in `Typography variant="body"` with `numberOfLines={1}`. Right side: `Pressable` trash icon (`Feather` name `trash-2`, size 18, `destructive` color). `onPress` calls `onDelete(event.id)`.

Min height 44 for touch target.

- [ ] **Step 7: Update `src/components/index.ts` barrel**

Add exports for `Modal`, `FAB`, `EmptyState`, `CalendarGrid`, `DayCell`, `EventItem`.

- [ ] **Step 8: Implement Calendar screen `app/(tabs)/index.tsx`**

Full implementation:
1. Call `useCalendarStore` for state and actions
2. `useEffect` on mount: call `loadMonth(currentMonth.year, currentMonth.month)`
3. Compute `today = new Date().setHours(0,0,0,0)` on mount
4. Layout:
   - Month/year header: `Pressable` left arrow (`chevron-left`), `Typography variant="h2"` with month name + year, `Pressable` right arrow (`chevron-right`). Arrows call `prevMonth()`/`nextMonth()`.
   - `CalendarGrid` with current month/year, events, selectedDate, onSelectDate, today
   - If `selectedDate !== null`: `Card` showing formatted date, list of events for that date (filter `events` by selectedDate), each rendered with `EventItem`. If no events: `EmptyState message="No events on this day"`. `Button` "Add Event" at bottom.
5. Add Event modal (using `Modal` component): `TextInput` for title (auto-focused), "All day" toggle (default on), time input when toggle off, pre-filled date. "Save" button calls `addEvent`, closes modal.
6. No FAB on this screen — "Add Event" button lives inside the selected-date card.

- [ ] **Step 9: Typecheck**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add cross-platform-app/src/components/ cross-platform-app/app/
git commit -m "feat: build shared components and calendar screen"
```

---

### Task 6: Expenses Screen

**Files:**
- Create: `cross-platform-app/src/components/TransactionItem.tsx`
- Create: `cross-platform-app/src/components/CategoryPicker.tsx`
- Modify: `cross-platform-app/src/components/index.ts` (add exports)
- Modify: `cross-platform-app/app/(tabs)/expenses.tsx` (full expenses screen)

**Interfaces:**
- Consumes: `useExpenseStore` from Task 4, `CATEGORIES`/`INCOME_ICON` from Task 3, `Modal`/`FAB`/`EmptyState`/`Card`/`Button`/`Typography`/`Screen` from Tasks 1+5, `useTheme`, `Feather`
- Produces: fully interactive Expenses tab

- [ ] **Step 1: Implement `TransactionItem.tsx`**

Props: `transaction: Transaction`, `onDelete: (id: string) => void`.

Row layout using `Card` with `onPress` (long-press delete):
- Left: `Feather` icon (look up from `CATEGORIES` by `transaction.category`, or `INCOME_ICON` if `transaction.type === 'income'`) + category label via `Typography variant="caption"`
- Center: `transaction.note` (if set) with `Typography variant="body" numberOfLines={1}`, date below formatted as `DD/MM/YYYY` in `textSecondary`
- Right: amount with `Typography variant="body"`. Green (`success`) with `+` for income, red (`destructive`) with `−` for expense. Format to 2 decimal places.

Delete: `Pressable` trash icon on the right edge, same pattern as `EventItem`. Min row height 56 for touch target + readability.

- [ ] **Step 2: Implement `CategoryPicker.tsx`**

Props: `selected: Category`, `onSelect: (cat: Category) => void`, `type: 'income' | 'expense'`.

Horizontal `ScrollView` with `showsHorizontalScrollIndicator={false}`. Map `CATEGORIES` to chips. Each chip: `Pressable` with `Feather` icon + label text. Selected chip: `primary` background with `primaryForeground` text. Unselected: `surfaceAlt` background with `text` color. Chip height 40, border radius `radius.full`, horizontal padding `spacing.md`. Gap `spacing.sm` between chips.

When `type === 'income'`, show only the "other" category (income doesn't need category selection — auto-assigned).

- [ ] **Step 3: Update `src/components/index.ts`**

Add exports for `TransactionItem` and `CategoryPicker`.

- [ ] **Step 4: Implement Expenses screen `app/(tabs)/expenses.tsx`**

Full implementation:
1. Call `useExpenseStore` for state and actions
2. `useEffect` on mount: call `loadTransactions()`
3. Layout:
   - Balance `Card` at top: three rows — "Income" with green `balance.totalIncome` formatted to 2 decimals, "Expenses" with red `balance.totalExpenses`, "Balance" with large `balance.balance` (red if negative, `text` color otherwise). Use `Typography variant="h1"` for balance number, `variant="caption"` for labels.
   - `FlatList` of `transactions`, each rendered with `TransactionItem`. `keyExtractor` by `id`. `ListEmptyComponent` renders `EmptyState message="No transactions yet"`.
   - `FAB onPress` opens add-transaction modal
4. Add Transaction modal:
   - Type toggle: two `Button` components side by side — "Income" (`variant={type === 'income' ? 'primary' : 'secondary'}`) and "Expense" (same pattern). Default to "expense".
   - Amount `TextInput` with `keyboardType="decimal-pad"`, auto-focused, large font
   - `CategoryPicker` (hidden when type is "income")
   - Note `TextInput` (optional, placeholder "Add a note...")
   - "Save" `Button variant="primary"` — validate amount > 0, call `addTransaction({ type, amount: parseFloat(amount), category, note: note || null, date: Date.now() })`, close modal, clear form

Handle negative balance display (Review Focus #5): the balance number renders in `destructive` color when `balance.balance < 0`.

- [ ] **Step 5: Typecheck**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add cross-platform-app/src/components/ cross-platform-app/app/
git commit -m "feat: build expenses screen with transaction list and balance"
```

---

### Task 7: Polish + Verification

**Files:**
- Possibly modify: any screen or component for visual consistency
- No new files

**Interfaces:**
- Consumes: everything built in Tasks 1–6
- Produces: a polished, consistent, type-clean app

- [ ] **Step 1: Typecheck the full project**

Run: `cd cross-platform-app && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 2: Launch and verify Calendar tab**

Run: `cd cross-platform-app && npx expo start`

Test:
1. App boots, Calendar tab is active, grid renders current month with no crashes
2. Navigate months with arrows — grid updates, no stale data
3. Tap a date — selected-date card appears below with "No events" empty state
4. Tap "Add Event" — modal opens, enter title, save — event appears in list and dot appears on grid
5. Delete the event — disappears from list and dot removed
6. Navigate to a different month and back — events persist

- [ ] **Step 3: Verify Expenses tab**

Test:
1. Switch to Expenses tab — balance shows €0.00, empty state message
2. Tap FAB — modal opens with "Expense" selected by default
3. Enter amount, pick category, add note, save — transaction appears in list, balance updates
4. Add an income transaction — green amount, balance goes positive
5. Add expenses until balance is negative — balance number shows in red
6. Delete a transaction — list and balance update

- [ ] **Step 4: Fix any visual inconsistencies found**

Apply theme tokens consistently. Verify dark mode renders correctly on both tabs. Ensure all touch targets meet 44pt minimum. No emoji anywhere — only Feather icons.

- [ ] **Step 5: Commit**

```bash
git add cross-platform-app/
git commit -m "chore: polish UI, verify full app flow"
```
