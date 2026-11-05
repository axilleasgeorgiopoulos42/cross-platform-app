# Expenses Redesign — Design Spec

Roadmap items 3 (Charts) and 4 (Installable app) from the dates-and-search roadmap. This spec covers **sub-project A: Expenses redesign**. Sub-project B (PWA install) is recorded at the end and gets its own spec and plan. Status: awaiting user review.

## Goal

Redesign the Expenses tab so the user can see, for a chosen period (default: current month), a bar chart of expense totals, and below it a list of expense categories that each expand to show every entry of that category.

## Decisions agreed with the user

- Chart: **daily spending bars** (grouped by week or month for long ranges). No cumulative line.
- Range: **presets plus custom** (Week / Month / 3 Months / Year / Custom), default Month, prev/next stepper; Custom uses the existing From/To date fields.
- The **category list replaces the flat transaction list**; search and the category filter stay and narrow both chart and list.
- Chart implementation: **hand-built bars from `View`s**; no new dependency.
- Phone app: **free PWA** (sub-project B), split from this work.

## Non-goals

Income charts, cumulative line, new dependencies, schema changes, recurring items, reminders, native packaging.

## Constraints

- Layering unchanged: SQLite -> services -> Zustand stores -> screens; components never import services or `getDb`.
- Styling through theme tokens (Sage palette); font weights 400/600 only. Web is the primary target; native must still compile.
- Local-only; no backend. Local-time days (DST-safe).

## Design

### Data layer (pure functions, tested first)

- `src/domains/expenses/range.ts`
  - `type RangePreset = 'week' | 'month' | '3months' | 'year' | 'custom'`; `interface DateRange { preset; from: number; to: number }` (`from` = start of first day, `to` = end of last day, local).
  - `defaultRange(now)` -> current calendar month.
  - `rangeFor(preset, anchor)` -> range of that preset containing `anchor` (week = Monday-Sunday; 3months = the three calendar months ending with the anchor's month; year = calendar year).
  - `shiftRange(range, delta)` -> previous/next period of the same preset; for `custom`, shifts by the range's length in days.
  - `validateRange(from, to)` -> error string when `from > to`, else null. The UI shows it inline instead of returning zero results silently.
- `src/domains/expenses/chart.ts`
  - `bucketExpenses(txs, range)` -> `{ label, start, end, total }[]`. Granularity: day when the range spans <= 31 days, week when <= 183 days, month otherwise. Counts expenses only, includes empty buckets (total 0), and clamps first/last buckets to the range.
- `src/domains/expenses/summary.ts`
  - Add `groupByCategory(txs)` -> `{ category, total, share, entries }[]`, sorted by total descending, entries newest first. `categoryBreakdown` stays.
- Store: holds the current `DateRange`; filtering uses `filterTransactions` (existing query/category filter) plus the range. The same filtered set feeds the total, the chart and the category list.

### UI (top to bottom)

1. Range chips and a `‹ label ›` stepper; Custom shows From/To `DateField`s and inline validation.
2. Total expenses for the range (large), with income and net as a smaller line.
3. `SpendChart`: bars, max-value label, a few x-axis labels, tap a bar to show that bucket's amount. Accessible label per bar.
4. `SearchBar` and `CategoryFilter` (existing).
5. `CategoryList` replaces `CategoryBreakdown`: icon, name, total, share bar, chevron (44pt hit area). Tapping expands to that category's entries rendered with `TransactionItem` (tap to edit, delete as today). Several rows can be open at once; expansion state is local to the screen.
6. Empty state: "No expenses in this range".

New components: `RangePicker`, `SpendChart`, `CategoryList` (in `src/components/`, exported from the index). `CategoryBreakdown` and `MonthSwitcher` are removed if nothing else uses them.

### Error handling

Invalid custom range shows an inline message and keeps the previous valid range for the chart. Store load errors surface as today.

### Testing

Unit tests (jest, sql.js not needed): `range` (each preset, stepping across month/year boundaries, custom shift, validation), `chart` (granularity thresholds, empty buckets, range clamping, DST day, expense-only), `groupByCategory` (ordering, shares, zero-expense case). Existing suites must stay green; `tsc` and lint clean. Manual web check by the user on a Vercel preview.

## Sub-project B (separate spec and plan): PWA install

Agreed direction only; not designed here. Free route: web manifest (name, icons, `display: standalone`, theme colour), iOS home-screen icons and meta tags, small service worker for offline use (data is already local). Trade-off: not an App Store app; iOS limits PWA storage and background features. A paid Apple Developer account plus EAS builds is the alternative if App Store distribution is ever needed.
