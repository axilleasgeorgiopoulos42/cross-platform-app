# Dates and Search — Design Spec

Sub-project 1 of 5 in the "what else can we add" roadmap (see Roadmap). Status: awaiting user review.

## Roadmap (agreed with the user)

| # | Sub-project | Notes |
|---|---|---|
| 1 | **Dates and search** (this spec) | Date field on forms; per-tab search |
| 2 | Recurring events and expenses | Schema change |
| 3 | Charts | Spending over time, month-to-month comparison |
| 4 | Installable app | Manifest, icon, offline caching; required by 5 |
| 5 | Reminders | Real web push (user's choice): needs installed home-screen app, iOS 16.4+, and a small Vercel function. First non-local part of the app; privacy trade-off to be specced there |

Each sub-project gets its own spec, plan and build.

## Goal

Let the user choose the date of an event or expense, move an existing item to another day, and search events and transactions from their tabs.

## Non-goals

Recurrence, charts, a global search screen, reminders, time zones other than the device's, any schema change.

## Constraints

- Local-only; no backend. No new database columns (`events.date`, `transactions.date` already exist as local start-of-day / instant timestamps).
- Layering unchanged: SQLite -> services -> Zustand stores -> screens; components never import services or `getDb`.
- Styling through existing theme tokens (`src/constants/theme.ts`, Sage palette); font weights 400/600 only.
- Web is the primary target (iPhone home-screen web app); native must still compile and behave.

## Requirements

### R1. DateField component
- `src/components/DateField.tsx`: props `{ label, value: number | null, onChange(ts: number | null), error?, testID? }`.
- Web: a native `<input type="date">` rendered through a web-only branch, styled with theme tokens (text, border, surface, 12px radius). Native: the platform date picker (`@react-native-community/datetimepicker`, installed with `npx expo install`).
- `value` and `onChange` use a **local start-of-day timestamp**. Cleared input yields `null`.
- Pure helpers in `src/lib/dates.ts`: `toDateInputValue(ts): string` (`YYYY-MM-DD`, local) and `fromDateInputValue(s): number | null` (local start of day; `null` for empty or invalid, including `2026-02-31`).

### R2. Event form
- `EventForm` gains a required date. `EventFormValues` gains `date: number`.
- Default when adding: the selected calendar day (Calendar tab) or today (Today tab). When editing: the event's current date.
- Empty or invalid date: inline error "Choose a date", Save blocked (reuses the existing submit guard).
- The optional time field is unchanged.
- Saving an edit with a changed date moves the event; the Calendar and Today lists reflect it (existing store refreshes already cover `currentMonth` and `todayEvents`).

### R3. Expense form
- `TransactionForm` gains a date. `TransactionFormValues` gains `date: number`. Default: today. Editing: the transaction's current date. Backdating and future dates are both allowed.
- Empty or invalid date: inline error, Save blocked.
- Expenses `handleSave` passes the chosen date instead of `Date.now()`. After a successful add, the viewed month switches to the month of the saved date (replaces "switch to current month"). A failed add does not change the month.

### R4. Store/service contracts
- `addEvent` takes the date from form values rather than from `selectedDate`. Signature change documented in `docs/API.md`.
- `addTransaction` already takes `date`; no change.
- Services reject nothing new (dates are validated in the forms and helpers).

### R5. Search — Calendar
- A search icon in the Calendar screen header area toggles a search field above the content; clearing/closing it restores the month grid.
- Pure function `searchEvents(events, query): CalendarEvent[]` in `src/domains/calendar/search.ts`: case-insensitive, trimmed, substring match on `title` and `notes`; empty query returns `[]` (the screen shows the grid instead); results sorted by date, then time.
- While a query is non-empty, the tab shows a flat results list instead of the grid. Each row shows title, date and time; tapping opens `/event/<id>`. Empty results show "No matching events".
- Search must cover all events, not only the loaded month: add `calendarService.getAll(db)` and a store action `loadAllForSearch()` called when the search field first opens.

### R6. Search — Expenses
- Search icon toggles a filter panel above the list: text field (note + category, case-insensitive substring), category chips (single select, reusing `CategoryPicker` styling, "All" default), and optional From/To `DateField`s.
- Pure function `filterTransactions(transactions, { query, category, from, to }): Transaction[]` in `src/domains/expenses/search.ts`. `from` is inclusive at start of day, `to` inclusive through end of day; both optional.
- **Month switcher interaction:** when any of query, category, from or to is set, the list shows `filterTransactions` results across all months and the month switcher plus monthly summary are replaced by a "N results · total" line (income, expenses, net of the results). When none is set, behavior is unchanged.
- Empty results show "No matching transactions".

### R7. Accessibility and feel
- All new controls have labels and a 44pt minimum touch target; search toggle icons have `accessibilityLabel`.
- Inline errors use `accessibilityRole="alert"`.
- Panels use the Sage card style; transitions follow the existing 0.35s rule.

## Review focus (inputs the tests do not cover by construction)

1. Invalid dates such as `2026-02-31` and leap days.
2. Dates around DST changes: start-of-day arithmetic must not drift or skip a day.
3. Search queries with regex characters (`(`, `*`, `\`), leading/trailing spaces, and diacritics/Greek text.
4. Editing an event's date to a different month while that month is not the loaded one.
5. Expense saved with a future or far-past date: the view jumps to that month and the item is visible.
6. Search open while data changes (an edit saves, a backup is imported): results refresh, no stale rows.

## Testing

- Unit (jest): `toDateInputValue`/`fromDateInputValue` (valid, empty, invalid, leap day, DST dates with `TZ` pinned), `searchEvents`, `filterTransactions` (each filter alone and combined, boundaries, regex characters, Greek text), `calendarService.getAll`, store `loadAllForSearch`.
- Form tests are not added (the project has no component-test harness); form behavior is covered by manual checks.
- Manual checks on the Vercel preview: add event on a chosen date; edit an event to another month; backdated and future expenses; search both tabs; range plus category filter; Dark theme.

## Documentation

Update `README.md` (features), `docs/API.md` (new store members, changed `addEvent` signature), `docs/ARCHITECTURE.md` (DateField, search modules) and append to `PROJECT_LOG.md`.

## Open decisions (rulings made in this spec)

- Search is substring, not fuzzy or tokenized — small data, predictable results.
- Filters search across all months rather than being scoped to the viewed month — a search that hides matches is surprising.
- No debounce — pure in-memory filtering over a small list.
