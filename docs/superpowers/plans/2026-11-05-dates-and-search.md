# Dates and Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user pick the date of events and expenses (and move existing ones), and search events and transactions from their tabs.

**Architecture:** Pure, unit-tested helpers (`dates`, `text`, `searchEvents`, `filterTransactions`) sit under new UI: a `DateField` component, a `SearchBar`, and search/filter modes on the Calendar and Expenses screens. No schema change. Layering stays SQLite -> services -> Zustand stores -> screens; components never import services or `getDb`.

**Tech Stack:** Expo SDK 58, React Native 0.88 (+ web), TypeScript 6 strict, expo-router 58, Zustand 5, expo-sqlite, Jest (jest-expo, `tests/**/*.test.ts` only), `@react-native-community/datetimepicker` (native only).

**Spec:** `docs/superpowers/specs/2026-11-05-dates-and-search-design.md`

## Global Constraints

- Local-only; no backend; no new DB columns or migrations.
- Dates are **local start-of-day timestamps** (`startOfDay` in `src/lib/dates.ts`).
- Style only through `src/constants/theme.ts` tokens (Sage palette); font weights `'400'`/`'600'` only; no raw hex in components.
- Components never import services or `getDb`; stores are the only callers of `getDb`.
- No `eslint-disable`, no `@ts-ignore`; `npx expo lint` must stay 0 errors / 0 warnings.
- Jest covers `.ts` tests only (no component-test harness); UI behavior is verified by the manual checks in Task 9.
- Web is the primary target; native must still type-check and run.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Verification commands (run from the repo root): `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web`.

## Rulings made while planning (spec deviations)

- **Spec R4 is partly stale.** `useCalendarStore.addEvent(title, date, time, notes?)` already takes a `date`; only the Calendar and Today *screens* choose the date (selected day / today). So there is **no store signature change**; screens pass `values.date`. `API.md` needs no signature edit.
- **Accent-insensitive search.** To satisfy the spec's Greek/diacritics review item, matching ignores case and diacritics via a shared `normalizeText` (NFD, strip combining marks, lowercase). Cost if wrong: `é` matches `e`.
- **Search matches category key or label** (for example "food" and "Food").
- **Filter bounds:** `from` = start of that local day, `to` = end of that local day (`startOfNextDay(to) - 1`).

## Review Focus

1. Non-existent dates (`2026-02-31`, `2025-02-29`) must clear the field, not roll over into March: Task 1 tests.
2. Local-day boundaries on DST change days: `fromDateInputValue` must return local midnight on 23h/25h days: Task 1 tests.
3. Regex characters, padding spaces and Greek text in a query must neither throw nor mis-match: Task 2 and 3 tests.
4. Editing an event's date into a month that is not loaded must still show it in search: Task 2 test (`loadAllForSearch` + `updateEvent`).
5. An expense saved with a far-past or future date: the view jumps to that month and the row is visible: Task 6 (`monthOf` tested in Task 1).

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/dates.ts` (modify) | + `toDateInputValue`, `fromDateInputValue`, `endOfDay`, `monthOf` |
| `src/lib/text.ts` (create) | `normalizeText`, `matchesQuery` |
| `src/domains/calendar/search.ts` (create) | `searchEvents` |
| `src/domains/expenses/search.ts` (create) | `TransactionFilter`, `EMPTY_FILTER`, `isFilterActive`, `filterTransactions` |
| `src/domains/calendar/service.ts` (modify) | + `getAll` |
| `src/domains/calendar/store.ts` (modify) | + `allEvents`, `loadAllForSearch` |
| `src/components/DateField.tsx` (create) | date input: web `<input type=date>`, native picker |
| `src/components/SearchBar.tsx` (create) | text field with icon and clear button |
| `src/components/CategoryFilter.tsx` (create) | "All" + category chips |
| `src/components/EventForm.tsx`, `TransactionForm.tsx` (modify) | + `date` |
| `src/components/EventItem.tsx` (modify) | + `showDate` |
| `app/(tabs)/calendar.tsx`, `index.tsx`, `expenses.tsx`, `app/event/[id].tsx`, `app/transaction/[id].tsx` (modify) | wire dates and search |
| `tests/lib/dates.test.ts`, `tests/lib/text.test.ts`, `tests/domains/calendarSearch.test.ts`, `tests/domains/expenseSearch.test.ts` | tests |
| `README.md`, `API.md`, `ARCHITECTURE.md`, `PROJECT_LOG.md` (modify) | docs |

---

### Task 1: Date helpers

**Files:**
- Modify: `src/lib/dates.ts`
- Test: `tests/lib/dates.test.ts` (append a new `describe`)

**Interfaces:**
- Produces:
  - `toDateInputValue(ts: number): string` : local `YYYY-MM-DD`, zero-padded.
  - `fromDateInputValue(s: string): number | null` : local start of day; `null` for empty, malformed, or non-existent dates (`2026-02-31`, `2025-02-29`, month 13).
  - `endOfDay(ts: number): number` : last millisecond of the local day, `startOfNextDay(ts) - 1`.
  - `monthOf(ts: number): { year: number; month: number }` : local year and month 0 to 11.

- [ ] **Step 1: Write the failing tests** in a new `describe('date input helpers')` block:
  - `toDateInputValue(new Date(2026, 0, 5, 23, 59).getTime())` is `'2026-01-05'`.
  - `fromDateInputValue('2026-03-08')` equals `new Date(2026, 2, 8).getTime()`.
  - `fromDateInputValue('2024-02-29')` equals `new Date(2024, 1, 29).getTime()` (leap day is valid); `'2025-02-29'`, `'2026-02-31'`, `'2026-13-01'`, `'2026-1-5'`, `''`, `'abc'` all give `null`.
  - DST: for the last Sunday of March and of October 2026 (reuse the file's `lastSunday` helper), `fromDateInputValue(toDateInputValue(start))` equals `start`, and `endOfDay(start) + 1` equals `startOfNextDay(start)`.
  - `monthOf(new Date(2026, 11, 31, 23, 59).getTime())` is `{ year: 2026, month: 11 }`.
- [ ] **Step 2: Run to verify failure.** Run: `npx jest tests/lib/dates.test.ts`. Expected: FAIL (the new functions are not defined).
- [ ] **Step 3: Implement** the four functions in `src/lib/dates.ts`. For `fromDateInputValue`: match the strict pattern `^\d{4}-\d{2}-\d{2}$`, build `new Date(y, m - 1, d)`, and return `null` unless the constructed date reads back the same year, month and day (this rejects roll-over).
- [ ] **Step 4: Run to verify pass.** Run: `npx jest tests/lib/dates.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/lib/dates.ts tests/lib/dates.test.ts` then `git commit -m "feat: date input helpers"`.

---

### Task 2: Text matching, event search, event loading for search

**Files:**
- Create: `src/lib/text.ts`, `src/domains/calendar/search.ts`
- Modify: `src/domains/calendar/service.ts`, `src/domains/calendar/store.ts`
- Test: `tests/lib/text.test.ts` (create), `tests/domains/calendarSearch.test.ts` (create)

**Interfaces:**
- Produces:
  - `normalizeText(s: string): string` : `s.normalize('NFD')` with the range `̀-ͯ` removed, then `toLowerCase()`, then trimmed.
  - `matchesQuery(haystacks: Array<string | null | undefined>, query: string): boolean` : true when the normalized query is non-empty and is a substring of any normalized haystack. Plain `includes`, never a RegExp. `null`/`undefined` haystacks are skipped.
  - `searchEvents(events: CalendarEvent[], query: string): CalendarEvent[]` : matches `title` and `notes`; empty or whitespace-only query returns `[]`; sorted by `date` ascending, then `time` ascending with `null` (all day) first.
  - `calendarService.getAll(db: SQLiteDatabase): Promise<CalendarEvent[]>` : `SELECT * FROM events ORDER BY date, time`.
  - Store: state `allEvents: CalendarEvent[]` (initial `[]`); action `loadAllForSearch(): Promise<void>` fills it (errors go to `error`, never thrown). `addEvent`, `updateEvent` and `deleteEvent` also call `get().loadAllForSearch()` after their existing refreshes, so an open search never goes stale.
- Consumes: `CalendarEvent` from `src/domains/calendar/types`; `createTestDb` from `tests/helpers/testDb`; `runMigrations`. Mirror `tests/domains/calendarToday.test.ts` for mocking `src/db/client`.

- [ ] **Step 1: Write the failing tests.**
  - `tests/lib/text.test.ts`: `normalizeText('Καφές')` equals `normalizeText('καφες')`; `matchesQuery(['Coffee beans'], 'FEE')` is true; `matchesQuery(['a(b'], '(')` is true; `matchesQuery(['x'], '*')` and `matchesQuery(['x'], '\\')` do not throw and return false; `matchesQuery(['x'], '   ')` is false; a `null` haystack is skipped.
  - `tests/domains/calendarSearch.test.ts`, pure part: `searchEvents` matches title and notes case-insensitively; returns `[]` for `''`; sorts by date then time with all-day first; a Greek title matches an accent-less query.
  - Same file, DB part (mock `getDb` to return `createTestDb()` after migrations): create events in two different months with `calendarService.create`; `loadAllForSearch` fills `allEvents` with both; with `currentMonth` set to the original month, `updateEvent(id, { date: <a third month> })` leaves `allEvents` containing that event with the new date; `deleteEvent` removes it from `allEvents`.
- [ ] **Step 2: Run to verify failure.** Run: `npx jest tests/lib/text.test.ts tests/domains/calendarSearch.test.ts`. Expected: FAIL (modules and members missing).
- [ ] **Step 3: Implement** the helpers, `getAll`, and the store additions per the Interfaces block.
- [ ] **Step 4: Run to verify pass.** Run: `npx jest`. Expected: all suites PASS.
- [ ] **Step 5: Commit.** `git add src/lib/text.ts src/domains/calendar tests` then `git commit -m "feat: event search, text matching and all-events loading"`.

---

### Task 3: Transaction filter

**Files:**
- Create: `src/domains/expenses/search.ts`
- Test: `tests/domains/expenseSearch.test.ts` (create)

**Interfaces:**
- Consumes: `matchesQuery` (Task 2), `endOfDay` (Task 1), `CATEGORIES` from `src/constants/categories` (items are `{ key: Category; label: string; icon: string }`), `Transaction` and `Category` from `src/domains/expenses/types`.
- Produces:
  - `interface TransactionFilter { query: string; category: Category | null; from: number | null; to: number | null }`
  - `const EMPTY_FILTER: TransactionFilter` : `{ query: '', category: null, from: null, to: null }`.
  - `isFilterActive(f: TransactionFilter): boolean` : true when `query.trim() !== ''` or any of `category`, `from`, `to` is non-null.
  - `filterTransactions(txs: Transaction[], f: TransactionFilter): Transaction[]` : all set criteria AND-ed. The query matches `note` plus the category's key and label. `category` is an exact match. `from` is inclusive at that timestamp (callers pass start of day). `to` is inclusive through `endOfDay(to)`. Result sorted by `date` descending.

- [ ] **Step 1: Write the failing tests** covering: each criterion alone (query on note; query on category label `'Food'` and on key `'food'`; category; from only; to only); combined criteria; a transaction at 23:59:59.999 on the `to` day is included and one at 00:00 of the next day is excluded; `from` includes the start of that day; a query containing regex characters and surrounding spaces does not throw; a Greek note `'Καφές'` matches `'καφες'`; `isFilterActive(EMPTY_FILTER)` is false and is true when each single field is set; an inactive filter returns all transactions, newest first.
- [ ] **Step 2: Run to verify failure.** Run: `npx jest tests/domains/expenseSearch.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** per the Interfaces block.
- [ ] **Step 4: Run to verify pass.** Run: `npx jest tests/domains/expenseSearch.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit.** `git add src/domains/expenses/search.ts tests/domains/expenseSearch.test.ts` then `git commit -m "feat: transaction filter"`.

---

### Task 4: DateField, SearchBar and CategoryFilter components

**Files:**
- Create: `src/components/DateField.tsx`, `src/components/SearchBar.tsx`, `src/components/CategoryFilter.tsx`
- Modify: `package.json` and the lockfile (via the install command), `src/components/index.ts` (add exports if that barrel exports the other components)

**Interfaces:**
- Consumes: `toDateInputValue`, `fromDateInputValue`, `startOfDay` (Task 1 and existing); theme tokens; `CATEGORIES`.
- Produces:
  - `DateField({ label: string; value: number | null; onChange(ts: number | null): void; error?: string | null; testID?: string })`.
  - `SearchBar({ value: string; onChangeText(v: string): void; placeholder: string; autoFocus?: boolean })` : text input with a leading search icon and a trailing clear button (`accessibilityLabel="Clear search"`).
  - `CategoryFilter({ selected: Category | null; onSelect(c: Category | null): void })` : horizontal chips, first chip "All" (selected when `selected` is `null`).

- [ ] **Step 1: Install the native picker.** Run: `npx expo install @react-native-community/datetimepicker`. Expected: dependency added to `package.json`.
- [ ] **Step 2: Implement `DateField`.** Web (`Platform.OS === 'web'`): render a DOM `<input type="date">` through `React.createElement`, with `value` from `toDateInputValue` (or `''`), `onChange` calling `onChange(fromDateInputValue(e.target.value))`, `aria-label={label}`, and an inline style from theme tokens (text colour, 1px `colors.border` border, `colors.surface` background, `radius.md`, 16px font, minimum height 44, `colorScheme` set from `isDark`). Native: a pressable showing the formatted date that opens `DateTimePicker` in `date` mode and calls `onChange(startOfDay(selected.getTime()))`. The label sits above the control; `error` shows below in `colors.destructive` with `accessibilityRole="alert"`.
- [ ] **Step 3: Implement `SearchBar` and `CategoryFilter`** with theme tokens, 44pt minimum touch targets and accessibility labels. `CategoryFilter` reuses the chip look of `CategoryPicker`.
- [ ] **Step 4: Verify.** Run: `npx tsc --noEmit` and `npx expo lint`. Expected: no errors, no warnings.
- [ ] **Step 5: Commit.** `git add package.json package-lock.json src/components` then `git commit -m "feat: DateField, SearchBar, CategoryFilter components"`.

---

### Task 5: Date in the event form and its three screens

**Files:**
- Modify: `src/components/EventForm.tsx`, `app/(tabs)/calendar.tsx`, `app/(tabs)/index.tsx`, `app/event/[id].tsx`

**Interfaces:**
- Consumes: `DateField` (Task 4).
- Produces: `EventFormValues` becomes `{ title: string; date: number; time: string | null; notes: string | null }`. `EventFormProps.initial` may contain `date`. The form's date state is `number | null`; Save is disabled while it is `null`, and the field shows the inline error "Choose a date" once the user has cleared it. `resetOnSubmit` resets the date to `initial?.date ?? null`.

- [ ] **Step 1: Extend `EventForm`** per the Interfaces block (the date field goes above the all-day switch; the all-day and time logic stays unchanged).
- [ ] **Step 2: Wire the screens.**
  - Calendar: pass `initial={{ date: selectedDate ?? undefined }}` to the Add Event form; `handleSave` calls `addEvent(values.title, values.date, values.time, values.notes)` and no longer needs the `selectedDate == null` early return (the FAB stays disabled without a selection).
  - Today: pass `initial={{ date: startOfDay(Date.now()) }}`; `handleAddEvent` uses `values.date`.
  - Event detail: add `date: event.date` to `initial`. `handleSave` already forwards `values`, which now include `date`, so `updateEvent` moves the event.
- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit`, `npx expo lint`, `npx jest`. Expected: clean, all tests pass.
- [ ] **Step 4: Commit.** `git add src/components/EventForm.tsx app` then `git commit -m "feat: date field on the event form"`.

---

### Task 6: Date in the expense form and its three screens

**Files:**
- Modify: `src/components/TransactionForm.tsx`, `app/(tabs)/expenses.tsx`, `app/(tabs)/index.tsx`, `app/transaction/[id].tsx`

**Interfaces:**
- Consumes: `DateField` (Task 4), `monthOf` (Task 1).
- Produces: `TransactionFormValues` gains `date: number`. The default is `startOfDay(Date.now())` when `initial.date` is absent. Save is disabled while the date is `null`, with the same inline error as the event form.

- [ ] **Step 1: Extend `TransactionForm`** (the date field goes below the amount; reset restores `initial?.date` or today).
- [ ] **Step 2: Wire the screens.**
  - Expenses `handleSave`: call `addTransaction(values)` (drop `{ ...values, date: Date.now() }`); on success (`useExpenseStore.getState().error === null`) call `setView(monthOf(values.date))`. A failed add must not change the month.
  - Today `handleAddExpense`: `addTransaction(values)`.
  - Transaction detail: add `date: transaction.date` to `initial`.
- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit`, `npx expo lint`, `npx jest`. Expected: clean, all tests pass.
- [ ] **Step 4: Commit.** `git add src/components/TransactionForm.tsx app` then `git commit -m "feat: date field on the expense form"`.

---

### Task 7: Calendar search

**Files:**
- Modify: `app/(tabs)/calendar.tsx`, `src/components/EventItem.tsx`

**Interfaces:**
- Consumes: `searchEvents`, store `allEvents` and `loadAllForSearch` (Task 2), `SearchBar` (Task 4).
- Produces: `EventItem` gains an optional `showDate?: boolean`. When true, the left column shows the short date (for example "Mar 5") above the time or "All day".

- [ ] **Step 1: Add search state to the Calendar screen:** `searchOpen: boolean` and `query: string`. A search icon button (Feather `search`, 44pt, `accessibilityLabel="Search events"`) sits in the header row. Pressing it toggles `searchOpen`, calls `loadAllForSearch()` when opening, and clears `query` when closing.
- [ ] **Step 2: Render.** When `searchOpen`, show `SearchBar` under the header. When `query.trim() !== ''`, replace the grid and the selected-day section with the `searchEvents(allEvents, query)` list (`EventItem` with `showDate`; tapping opens `/event/<id>` as it does today), or `EmptyState` "No matching events" with icon `search`; hide the FAB. Closing search restores the grid.
- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit`, `npx expo lint`, `npx jest`. Expected: clean, all tests pass.
- [ ] **Step 4: Commit.** `git add app src/components/EventItem.tsx` then `git commit -m "feat: calendar search"`.

---

### Task 8: Expenses search and filters

**Files:**
- Modify: `app/(tabs)/expenses.tsx`

**Interfaces:**
- Consumes: `filterTransactions`, `isFilterActive`, `EMPTY_FILTER`, `TransactionFilter` (Task 3); `SearchBar`, `CategoryFilter`, `DateField` (Task 4); `summarize` from `src/domains/expenses/summary`; `formatMoney`.

- [ ] **Step 1: Add state** `filterOpen: boolean` and `filter: TransactionFilter` (initial `EMPTY_FILTER`). A search icon in the switcher row toggles `filterOpen`; closing resets `filter` to `EMPTY_FILTER`.
- [ ] **Step 2: Panel.** When open, render above the list: a `SearchBar` (note and category), a `CategoryFilter`, and two `DateField`s labelled "From" and "To". The values are the start-of-day timestamps the field returns.
- [ ] **Step 3: Result mode.** When `isFilterActive(filter)`: the data is `filterTransactions(transactions, filter)`; hide `MonthSwitcher`, the monthly summary card and the category breakdown; show one line "N results" with the income, expense and net of `summarize(results)` formatted in the selected currency; empty results show `EmptyState` "No matching transactions". When the filter is inactive, behavior is unchanged.
- [ ] **Step 4: Verify.** Run: `npx tsc --noEmit`, `npx expo lint`, `npx jest`. Expected: clean, all tests pass.
- [ ] **Step 5: Commit.** `git add app` then `git commit -m "feat: expenses search and filters"`.

---

### Task 9: Docs, full verification, preview

**Files:**
- Modify: `README.md`, `API.md`, `ARCHITECTURE.md`, `PROJECT_LOG.md`

- [ ] **Step 1: Docs.** README: features list (choose dates, search). `API.md`: calendar store `allEvents` and `loadAllForSearch()`; `calendarService.getAll`; the new modules `searchEvents`, `filterTransactions`, `normalizeText`/`matchesQuery`; the new `dates.ts` helpers. `ARCHITECTURE.md`: `DateField`, `SearchBar`, `CategoryFilter` and the search modules. `PROJECT_LOG.md`: one numbered line for this work with commit SHAs and the planning rulings above.
- [ ] **Step 2: Full verification.** Run: `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web`. Expected: all green, lint 0 errors and 0 warnings.
- [ ] **Step 3: Commit and push.** `git add README.md API.md ARCHITECTURE.md PROJECT_LOG.md`, then `git commit -m "docs: dates and search"`, then `git push -u origin feat/dates-and-search`. This creates the Vercel preview; do not merge to `main`.
- [ ] **Step 4: Manual checks on the preview (the user, with throwaway data):** add an event on a chosen date from Calendar and from Today; edit an event into another month and find it there; backdated and future expenses (the view jumps to that month); clear a date field (Save is blocked and the error shows); search events by title and notes, with Greek text and with `(`; Expenses search plus category plus From/To; Dark theme; reload during an open search.
