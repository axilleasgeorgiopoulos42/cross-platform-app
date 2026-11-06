# Expenses Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Expenses tab around a date-range picker, a daily-spending bar chart and an expandable per-category list.

**Architecture:** Pure, tested domain functions (`range`, `chart`, `groupByCategory`) feed three new presentational components (`RangePicker`, `SpendChart`, `CategoryList`); the screen composes them. One filtered set (range + search + category) feeds the total, chart and list. The existing `filterTransactions` is reused by passing the range as `from`/`to`, so `search.ts` does not change.

**Tech Stack:** Expo SDK 58, React Native 0.88 (web primary), TypeScript strict, Zustand, Jest (jest-expo). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-05-expenses-redesign-design.md`

## Global Constraints

- No new dependencies; chart is hand-built from `View`s.
- Layering: SQLite -> services -> Zustand stores -> screens; components never import services or `getDb`.
- Styling only through theme tokens (`src/constants/theme.ts`); font weights 400/600 only; touch targets >= 44pt.
- Local-time, DST-safe day arithmetic (build dates with `new Date(y, m, d)`, never add 86 400 000 ms).
- Expenses only in chart and category list; income appears only in the summary line.
- Default range is the current calendar month.
- Gate for every task: `npx jest`, `npx tsc --noEmit` and `npx expo lint` all clean.

## Review Focus

- Range of one single day (from == to) gives exactly one chart bucket. (Task 2)
- Month stepping across year boundaries and into shorter months (Dec -> Jan, Jan -> Feb 28/29). (Task 1)
- A transaction at the last millisecond of `range.to` is counted; one at the next midnight is not. (Task 2)
- A range with no expenses, or only income, gives zero-height bars, no divide-by-zero, and an empty category list. (Tasks 2, 3, 5)
- Custom range with From > To shows an inline error and keeps the previously valid range. (Task 4)
- Deleting the last entry of an expanded category removes the group without a crash. (Tasks 3, 6)

---

### Task 1: Range model

**Files:**
- Create: `src/domains/expenses/range.ts`
- Test: `tests/domains/range.test.ts`

**Interfaces:**
- Produces:
  - `type RangePreset = 'week' | 'month' | '3months' | 'year' | 'custom'`
  - `interface DateRange { preset: RangePreset; from: number; to: number }` (`from` = local start of first day, `to` = last millisecond of last day)
  - `defaultRange(now?: number): DateRange` (month containing `now`, default `Date.now()`)
  - `rangeFor(preset: Exclude<RangePreset, 'custom'>, anchor: number): DateRange`
  - `customRange(from: number, to: number): DateRange`
  - `shiftRange(range: DateRange, delta: 1 | -1): DateRange`
  - `validateRange(from: number | null, to: number | null): string | null`
  - `rangeLabel(range: DateRange): string`
  - `inRange(range: DateRange, ts: number): boolean`
- Consumes: `startOfDay`, `endOfDay` from `src/lib/dates.ts`; `MONTH_NAMES` from `src/constants/months.ts`.

- [ ] **Step 1: Write failing tests** in `tests/domains/range.test.ts`, all dates built with `new Date(y, m, d)`:
  - `defaultRange` for 15 Nov 2026 -> `{preset:'month', from: 1 Nov 00:00, to: 30 Nov 23:59:59.999}`.
  - `rangeFor('week', Wed 4 Nov 2026)` -> Monday 2 Nov .. Sunday 8 Nov end.
  - `rangeFor('3months', 15 Nov 2026)` -> 1 Sep .. 30 Nov. `rangeFor('year', ...)` -> 1 Jan .. 31 Dec 2026.
  - `shiftRange` month: Dec 2026 +1 -> Jan 2027; Jan 2027 -1 -> Dec 2026; Jan 2027 +1 -> `to` is 28 Feb 2027 end; week +1 -> next Monday..Sunday; 3months +1 -> Dec..Feb; year -1 -> 2025.
  - `shiftRange` custom 10 Nov..12 Nov (3 days) +1 -> 13 Nov..15 Nov; -1 -> 7 Nov..9 Nov.
  - `validateRange(null, x)` / `(x, null)` -> message string; `(later, earlier)` -> message string; `(a, a)` and `(earlier, later)` -> `null`.
  - `rangeLabel`: month -> `'November 2026'`; year -> `'2026'`; week, 3months and custom each contain the year and the month name(s) (use `toContain`).
  - `inRange` includes `from` and `to` exactly, excludes `from - 1` and `to + 1`.
- [ ] **Step 2: Run** `npx jest tests/domains/range.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** the interface above in `range.ts`. Weeks start Monday. Build every boundary with `new Date(y, m, d)` / `endOfDay`; month/3months/year shifting moves the first day by whole months, never by ms. Custom shift moves by the range's calendar-day count (compute the count by counting days with `Date` construction, not by dividing ms). `rangeLabel` uses full `MONTH_NAMES`.
- [ ] **Step 4: Run** the same test file. Expected: PASS. Then `npx tsc --noEmit`.
- [ ] **Step 5: Commit** `feat: expense date range model`.

---

### Task 2: Chart bucketing

**Files:**
- Create: `src/domains/expenses/chart.ts`
- Test: `tests/domains/chart.test.ts`

**Interfaces:**
- Consumes: `DateRange` from `./range`; `Transaction` from `./types`; `startOfDay`, `startOfNextDay`, `endOfDay` from `src/lib/dates.ts`; `MONTH_NAMES`.
- Produces:
  - `interface Bucket { label: string; start: number; end: number; total: number }`
  - `bucketGranularity(range: DateRange): 'day' | 'week' | 'month'`
  - `bucketExpenses(txs: Transaction[], range: DateRange): Bucket[]`
  - `visibleLabelIndexes(count: number, max?: number): number[]` (default `max` 6)

- [ ] **Step 1: Write failing tests** in `tests/domains/chart.test.ts`:
  - Granularity: 31-day range -> `'day'`; 32 days -> `'week'`; 183 days -> `'week'`; 184 days -> `'month'`.
  - November 2026 -> 30 buckets; label of the first is `'1'`; days with no spending have `total: 0`.
  - Single-day range (from == to) -> exactly 1 bucket. (Review Focus)
  - Income transactions are ignored; two expenses on one day sum into that bucket.
  - A transaction at `range.to` exactly is counted in the last bucket; one at `range.to + 1` is in no bucket. (Review Focus)
  - Weekly: a 3-month range -> buckets start on Mondays, first and last bucket clamped to the range, sum of all bucket totals equals sum of in-range expenses.
  - Monthly: a 12-month year range -> 12 buckets, labels are short month names (`'Jan'`...).
  - A range spanning a DST change (31 days around late March or late October in any timezone) has one bucket per calendar day: assert `buckets.length` equals the calendar-day count and that `buckets[i].end + 1 === buckets[i+1].start`.
  - Empty list / income only -> all totals 0 (no NaN).
  - `visibleLabelIndexes(30)` has length <= 6, includes 0, strictly increasing, all `< 30`; `visibleLabelIndexes(3)` -> `[0,1,2]`; `visibleLabelIndexes(0)` -> `[]`.
- [ ] **Step 2: Run** `npx jest tests/domains/chart.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in `chart.ts`. Granularity by calendar-day count of the range (<=31 day, <=183 week, else month). Day label = day of month; week label = `'d Mon'` of the (clamped) bucket start using a 3-letter month; month label = 3-letter month. Walk buckets with `new Date(y, m, d + 1)`; assign each expense to its bucket in one pass.
- [ ] **Step 4: Run** the test file, then `npx jest` and `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: expense chart bucketing`.

---

### Task 3: Group expenses by category

**Files:**
- Modify: `src/domains/expenses/summary.ts`
- Modify: `tests/domains/summary.test.ts`

**Interfaces:**
- Produces: `interface CategoryGroup { category: Category; total: number; share: number; entries: Transaction[] }` and `groupByCategory(txs: Transaction[]): CategoryGroup[]`. Existing `categoryBreakdown` and `CategoryShare` stay unchanged.

- [ ] **Step 1: Write failing tests** appended to `summary.test.ts` (reusing its `tx` helper):
  - `[]` -> `[]`; income only -> `[]`; zero-amount-only expenses -> `[]`.
  - Two food (10 and 30) and one bills (60): groups ordered bills (total 60, share 0.6) then food (total 40, share 0.4); shares sum to 1.
  - `entries` contain only that category's expenses, newest `date` first, and each group's `entries.length` matches.
  - Removing the only entry of a category (call again without it) drops that group. (Review Focus)
- [ ] **Step 2: Run** `npx jest tests/domains/summary.test.ts`. Expected: FAIL (`groupByCategory is not a function`).
- [ ] **Step 3: Implement** `groupByCategory` in `summary.ts`, same total/share approach as `categoryBreakdown`.
- [ ] **Step 4: Run** `npx jest tests/domains/summary.test.ts` then `npx tsc --noEmit`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: group expenses by category with entries`.

---

### Task 4: RangePicker component

**Files:**
- Create: `src/components/RangePicker.tsx`
- Modify: `src/components/index.ts` (export `RangePicker`)

**Interfaces:**
- Consumes: `DateRange`, `RangePreset`, `rangeFor`, `customRange`, `shiftRange`, `validateRange`, `rangeLabel` from `../domains/expenses/range`; `DateField`; `Typography`; `useTheme`; `Feather`.
- Produces: `RangePicker({ range, onChange }: { range: DateRange; onChange(r: DateRange): void })`.

- [ ] **Step 1: Implement** the component, following the chip styling of `CategoryFilter.tsx`:
  - A row of five chips (`Week`, `Month`, `3 Months`, `Year`, `Custom`), selected one highlighted, `accessibilityRole="button"` with `accessibilityState={{ selected }}`.
  - Pressing a non-custom chip calls `onChange(rangeFor(preset, range.from))`; pressing `Custom` calls `onChange(customRange(range.from, range.to))`.
  - For non-custom presets, below the chips: `‹  {rangeLabel(range)}  ›` with two 44pt buttons labelled "Previous period" / "Next period" calling `onChange(shiftRange(range, -1 | 1))`.
  - For `custom`: two `DateField`s (From, To) holding local draft state seeded from `range`. Each change updates the draft; when `validateRange(draftFrom, draftTo)` is `null`, call `onChange(customRange(draftFrom, draftTo))`; otherwise render the returned message as red text (`colors.destructive`, `accessibilityRole="alert"`) and do not call `onChange`, so the screen keeps the last valid range. Re-seed drafts when `range.preset` changes to `custom`.
- [ ] **Step 2: Verify** `npx tsc --noEmit` and `npx expo lint` clean.
- [ ] **Step 3: Commit** `feat: range picker component`.

---

### Task 5: SpendChart component

**Files:**
- Create: `src/components/SpendChart.tsx`
- Modify: `src/components/index.ts` (export `SpendChart`)

**Interfaces:**
- Consumes: `Bucket`, `visibleLabelIndexes` from `../domains/expenses/chart`; `formatMoney`; `Currency`; `Typography`; `useTheme`.
- Produces: `SpendChart({ buckets, currency }: { buckets: Bucket[]; currency: Currency })`.

- [ ] **Step 1: Implement** the component:
  - Fixed plot height 140. One flex column per bucket, bar height = `total / max * 140`, `max` = largest bucket total; when `max === 0` all bars are height 0 and a muted baseline is shown (no division by zero). Bars with `total > 0` have `minHeight` 3.
  - Bar colour `colors.primary`; the selected bar uses a stronger/other token already in the theme (e.g. `colors.text`); no new colours.
  - Each bar is a `Pressable` (full column height so the tap target is tall) with `accessibilityLabel={`${bucket.label}: ${formatMoney(total, currency)}`}`; pressing toggles selection.
  - Above the plot: one caption line showing the selected bucket (`label — amount`), or the max value when nothing is selected.
  - Below the plot: x-axis labels only at `visibleLabelIndexes(buckets.length)`.
  - Render nothing (return `null`) when `buckets` is empty.
- [ ] **Step 2: Verify** `npx tsc --noEmit` and `npx expo lint` clean.
- [ ] **Step 3: Commit** `feat: spend chart component`.

---

### Task 6: CategoryList component

**Files:**
- Create: `src/components/CategoryList.tsx`
- Modify: `src/components/index.ts` (export `CategoryList`)

**Interfaces:**
- Consumes: `CategoryGroup` from `../domains/expenses/summary`; `CATEGORIES` from `../constants/categories`; `TransactionItem` (props `transaction`, `onDelete(id)`); `formatMoney`; `Currency`; `Feather`.
- Produces: `CategoryList({ groups, currency, onDelete }: { groups: CategoryGroup[]; currency: Currency; onDelete(id: string): void })`.

- [ ] **Step 1: Implement** the component, modelled on the row layout of `CategoryBreakdown.tsx` (icon, label, share bar, total):
  - Each row is a `Pressable` (min height 44) with a trailing chevron (`chevron-down` collapsed, `chevron-up` expanded), `accessibilityRole="button"`, `accessibilityState={{ expanded }}`, `accessibilityLabel` like `Food, €40.00, 2 entries`.
  - Local state `expanded: Set<Category>`; several rows may be open. Expansion state is by category, so a group that disappears and reappears is collapsed again without stale state.
  - An expanded group renders its `entries` with `TransactionItem`, passing `onDelete`.
  - Return `null` when `groups` is empty.
- [ ] **Step 2: Verify** `npx tsc --noEmit` and `npx expo lint` clean.
- [ ] **Step 3: Commit** `feat: expandable category list component`.

---

### Task 7: Compose the Expenses screen

**Files:**
- Modify: `app/(tabs)/expenses.tsx`
- Delete: `src/components/CategoryBreakdown.tsx` (and its export in `src/components/index.ts`)

**Interfaces:**
- Consumes: everything from Tasks 1-6; existing `filterTransactions`, `EMPTY_FILTER`, `TransactionFilter` from `search.ts`; `summarize` from `summary.ts`.

- [ ] **Step 1: Rewrite the screen** (keep FAB, add-transaction `Modal`, `handleSave`, `useTodayStart`, store wiring):
  - State: `range` (init `defaultRange()`), `filterOpen`, `filter` (`{ query, category }` part only).
  - One derived set: `rangeTxs = filterTransactions(transactions, { ...filter, from: range.from, to: range.to })` (`range.to` is already end of day, so `search.ts` stays untouched). From it: `summarize(rangeTxs)`, `bucketExpenses(rangeTxs, range)`, `groupByCategory(rangeTxs)`.
  - Layout in a `ScrollView`-style list (a `FlatList` with no data and a header component, or `Screen scroll`; keep bottom padding for the FAB): `RangePicker` + search icon button; when `filterOpen`, `SearchBar` + `CategoryFilter` only (the old From/To fields are gone; the range picker owns dates); summary card (expenses total large and red, income and net as smaller lines, "All time" caption kept); `SpendChart`; `CategoryList`; when `rangeTxs` has no expenses, `EmptyState` "No expenses in this range" (use `search` icon text variant "No matching transactions" when a search/category filter is active).
  - Closing the search panel clears `filter` (as today).
  - `handleSave`: after a successful add, if the new date is outside `range` set `range` to `rangeFor('month', values.date)`.
  - Delete uses the existing `deleteTransaction`.
  - Remove the now-unused `MonthSwitcher`, `CategoryBreakdown`, `filterByMonth`, `categoryBreakdown`, `shiftMonth`/`monthOf` imports from this file. `MonthSwitcher` and `filterByMonth` stay in the codebase (used by Calendar and Today).
- [ ] **Step 2: Delete** `CategoryBreakdown.tsx` and remove its line from `src/components/index.ts`.
- [ ] **Step 3: Verify** `npx jest`, `npx tsc --noEmit`, `npx expo lint`, then `npx expo export --platform web`. Expected: all green, export succeeds. (No browser available to agents: the manual check is the user's.)
- [ ] **Step 4: Commit** `feat: redesigned expenses screen with range, chart and category list`.

---

### Task 8: Docs and project log

**Files:**
- Modify: `README.md`, `ARCHITECTURE.md`, `API.md`, `PROJECT_LOG.md`

- [ ] **Step 1: Update docs.** README: Expenses tab description (range presets, daily bars, expandable categories). ARCHITECTURE: new `range`/`chart` modules and the three components, plus the reuse of `filterTransactions` with the range as `from`/`to`. API: signatures from the Interfaces blocks of Tasks 1-3.
- [ ] **Step 2: PROJECT_LOG.** Add the numbered history entry for this redesign (spec/plan paths, task commit SHAs), update section 1 feature/branch line, and add to section 7 the manual checks: (1) Month default shows the current month's bars; (2) Week/3 Months/Year/Custom change the chart and the stepper; (3) Custom with From after To shows the error and keeps the old chart; (4) tap a bar shows its amount; (5) tapping a category arrow opens its entries, edit and delete work; (6) search and category filter narrow chart and list; (7) dark theme and phone width. Note the PWA sub-project as the next spec.
- [ ] **Step 3: Verify** `npx jest`, `npx tsc --noEmit`, `npx expo lint` clean.
- [ ] **Step 4: Commit** `docs: expenses redesign`.
