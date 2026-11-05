# Cross-Platform App — Calendar & Expenses Tracker

## Overview

A minimal, local-only cross-platform mobile app with two tabs:

1. **Calendar** — monthly grid view, create/view/delete events on specific dates
2. **Expenses** — income/expense entries with running balance and category breakdown

No user accounts, no cloud sync, no network calls. All data lives on-device in SQLite.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 58 + React Native 0.88 |
| Language | TypeScript 6 (strict) |
| Platform | iOS + Android + Web |
| Navigation | Expo Router (file-based, 2-tab layout) |
| Local DB | expo-sqlite |
| State | Zustand 5 |
| Icons | @expo/vector-icons (Feather set) |
| Styling | StyleSheet API + centralized theme tokens |

## Architecture

```
SQLite (source of truth)
  → Service layer (typed queries, validation)
    → Zustand store (in-memory cache + actions)
      → React components (read state, call actions)
```

Each domain (calendar, expenses) is fully self-contained with its own types, service, and store. The two domains do not depend on each other.

## Folder Structure

```
app/
  _layout.tsx                   # Root layout (DB init, fonts)
  (tabs)/
    _layout.tsx                 # 2-tab bar (Calendar, Expenses)
    index.tsx                   # Calendar tab
    expenses.tsx                # Expenses tab

src/
  db/
    client.ts                   # SQLite connection singleton
    migrations.ts               # Schema creation (CREATE TABLE IF NOT EXISTS)
  domains/
    calendar/
      types.ts                  # CalendarEvent type
      service.ts                # CRUD + date-range queries
      store.ts                  # Zustand store
    expenses/
      types.ts                  # Transaction type, Category union
      service.ts                # CRUD + balance + monthly summary
      store.ts                  # Zustand store
  components/
    index.ts                    # Barrel export
    Screen.tsx                  # (existing) Safe area + scroll wrapper
    Card.tsx                    # (existing) Themed card container
    Button.tsx                  # (existing) 4-variant button
    Typography.tsx              # (existing) 5-variant text
    CalendarGrid.tsx            # NEW: Monthly 7-column grid
    DayCell.tsx                 # NEW: Single day in the grid
    EventItem.tsx               # NEW: Event row with delete
    TransactionItem.tsx         # NEW: Transaction row
    CategoryPicker.tsx          # NEW: Fixed-list category selector
    Modal.tsx                   # NEW: Bottom sheet / modal wrapper
    FAB.tsx                     # NEW: Floating action button
    EmptyState.tsx              # NEW: Centered empty message
  constants/
    theme.ts                    # (existing) Colors, spacing, radius, fontSize
    categories.ts               # NEW: Fixed expense categories with icons
  hooks/
    useTheme.ts                 # (existing) System color scheme hook
  lib/
    storage.ts                  # (existing, keep for potential future use)
  types/
    common.ts                   # (existing) Shared types
```

### Files Removed from Scaffold

- `app/(tabs)/explore.tsx` — replaced by expenses tab
- `app/(tabs)/settings.tsx` — not needed for MVP
- `src/services/example.ts` — placeholder, no longer needed
- `src/lib/api.ts` — no network calls in this app

## Data Model

### events

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID via `crypto.randomUUID()` |
| title | TEXT | NOT NULL | Event name, max display ~50 chars |
| date | INTEGER | NOT NULL | Unix timestamp (ms), midnight of the event day |
| time | TEXT | NULLABLE | "HH:mm" format, or null for all-day |
| created_at | INTEGER | NOT NULL | Unix timestamp (ms) |

### transactions

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID via `crypto.randomUUID()` |
| type | TEXT | NOT NULL | 'income' or 'expense' |
| amount | REAL | NOT NULL | Positive number; validation in service layer |
| category | TEXT | NOT NULL | One of the fixed category list |
| note | TEXT | NULLABLE | Optional description |
| date | INTEGER | NOT NULL | Unix timestamp (ms) |
| created_at | INTEGER | NOT NULL | Unix timestamp (ms) |

## Domain: Calendar

### Types

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  date: number;      // midnight of event day, unix ms
  time: string | null; // "HH:mm" or null for all-day
  createdAt: number;
}
```

### Service API

- `calendarService.getEventsForMonth(db, year, month): Promise<CalendarEvent[]>` — all events within the calendar month
- `calendarService.getEventsForDate(db, date): Promise<CalendarEvent[]>` — events on a specific day, sorted by time (nulls first = all-day)
- `calendarService.create(db, data: { title: string; date: number; time: string | null }): Promise<CalendarEvent>` — validates title is non-empty
- `calendarService.remove(db, id): Promise<void>`

### Store

```typescript
interface CalendarStore {
  events: CalendarEvent[];         // events for the currently viewed month
  selectedDate: number | null;     // currently tapped date (midnight ms)
  currentMonth: { year: number; month: number }; // 0-indexed month
  loading: boolean;
  error: string | null;

  loadMonth(year: number, month: number): Promise<void>;
  selectDate(date: number | null): void;
  addEvent(title: string, date: number, time: string | null): Promise<void>;
  deleteEvent(id: string): Promise<void>;
  nextMonth(): void;
  prevMonth(): void;
}
```

### UI: Calendar Tab (`app/(tabs)/index.tsx`)

**Layout (top to bottom):**
1. Month/year header with left/right arrow buttons (e.g. "◀ November 2026 ▶")
2. Weekday labels row (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
3. Calendar grid — 6 rows × 7 columns of `DayCell` components
4. Selected-date event list (appears below grid when a date is tapped)
5. "Add Event" button in the event list area (or FAB)

**DayCell behavior:**
- Shows day number
- Small dot below the number if events exist on that day (themed `primary` color)
- Tapped state: highlighted background (`primary` with low opacity)
- Days outside current month: dimmed text (`textSecondary`)
- Today: subtle ring or bold text

**Event list (when date selected):**
- Card below the grid showing the selected date formatted ("Wed, Nov 5")
- List of events for that date — each row shows time (or "All day") and title
- Delete button (trash icon) on each event row, with confirmation
- "Add Event" button at bottom of the list
- Empty state: "No events on this day"

**Add Event modal:**
- Title text input (required, auto-focused)
- Date pre-filled from selected date (editable)
- Optional time input (toggle between "All day" and time picker)
- "Save" button — calls `addEvent`, closes modal, refreshes grid

## Domain: Expenses

### Types

```typescript
type Category =
  | 'food'
  | 'transport'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'shopping'
  | 'other';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: Category;
  note: string | null;
  date: number;
  createdAt: number;
}

interface BalanceSummary {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
}
```

### Categories (Fixed List)

| Key | Label | Feather Icon |
|---|---|---|
| food | Food | `coffee` |
| transport | Transport | `navigation` |
| bills | Bills | `file-text` |
| entertainment | Entertainment | `music` |
| health | Health | `heart` |
| shopping | Shopping | `shopping-bag` |
| other | Other | `more-horizontal` |

Income transactions use category "other" and icon `dollar-sign`.

### Service API

- `expenseService.getAll(db): Promise<Transaction[]>` — sorted by date DESC
- `expenseService.create(db, data: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>` — validates `amount > 0`
- `expenseService.remove(db, id): Promise<void>`
- `expenseService.getBalance(db): Promise<BalanceSummary>` — totals across all transactions

### Store

```typescript
interface ExpenseStore {
  transactions: Transaction[];
  balance: BalanceSummary;
  loading: boolean;
  error: string | null;

  loadTransactions(): Promise<void>;
  addTransaction(data: Omit<Transaction, 'id' | 'createdAt'>): Promise<void>;
  deleteTransaction(id: string): Promise<void>;
}
```

### UI: Expenses Tab (`app/(tabs)/expenses.tsx`)

**Layout (top to bottom):**
1. Balance card — shows income (green), expenses (red), net balance (large number)
2. FlatList of transactions sorted by date DESC
3. FAB (bottom-right) to add a new transaction

**Transaction row:**
- Left: category icon (Feather) + category label
- Center: note text (truncated if long), date below in `textSecondary`
- Right: amount — green with `+` prefix for income, red with `−` prefix for expense
- Swipe left to reveal delete, or long-press for delete confirmation

**Add Transaction modal:**
- Type toggle: Income / Expense (two-button segmented control)
- Amount input (numeric keyboard, auto-focused)
- Category picker: horizontal scroll of category chips, each showing icon + label
- Optional note text input
- Date defaults to today
- "Save" button — validates amount > 0, calls `addTransaction`, closes modal

## Shared Components

### Modal

Wraps content in a `Modal` (React Native) with a semi-transparent backdrop. Props: `visible`, `onClose`, `title`. Renders a rounded-top card that slides up. Close on backdrop tap.

### FAB

Floating action button positioned `bottom: 24, right: 24` (above tab bar safe area). Circular, `primary` background, `+` icon in `primaryForeground`. Size: 56×56 (meets 44pt minimum). Themed shadow/elevation.

### EmptyState

Centered text with `textSecondary` color. Props: `message: string`, optional `icon` (Feather icon name).

### CalendarGrid

Pure component. Props: `year`, `month`, `events` (array), `selectedDate`, `onSelectDate`, `today`. Computes the 6×7 grid of dates for the given month (including padding days from prev/next months). Renders `DayCell` for each.

### DayCell

Props: `day`, `isCurrentMonth`, `isToday`, `isSelected`, `hasEvents`, `onPress`. Renders day number, dot indicator, and handles tap.

### CategoryPicker

Horizontal `ScrollView` of category chips. Props: `selected`, `onSelect`, `type` (income/expense — filters available categories). Each chip: icon + label, highlighted when selected.

### TransactionItem

Props: `transaction`, `onDelete`. Renders icon, category, note, date, and styled amount. Delete via swipe or button.

### EventItem

Props: `event`, `onDelete`. Renders time (or "All day"), title, and delete button.

## Tab Navigation

Replace the current 3-tab layout with 2 tabs:

| Tab | Route | Icon (Feather) | Label |
|---|---|---|---|
| Calendar | `index` | `calendar` | Calendar |
| Expenses | `expenses` | `credit-card` | Expenses |

Tab bar uses theme tokens: `surface` background, `border` top border, `primary` active tint, `textSecondary` inactive tint.

## Database Initialization

In `app/_layout.tsx`:
1. Import `getDb` and `runMigrations`
2. In a `useEffect`, open the DB and run migrations
3. Hold a `dbReady` boolean state — render children only when true
4. Show nothing (or splash) while loading

`runMigrations` uses `CREATE TABLE IF NOT EXISTS` for both tables — idempotent, no versioning needed for v1.

## Design Decisions

**No calendar library.** A custom 7-column grid is ~80 lines and gives full control over theming and behavior. Libraries like `react-native-calendars` add weight and fight customization.

**No edit flow.** Events and transactions can be created and deleted, not edited. This is the simplest useful MVP. Edit can be added later without structural changes (add an `update` to service + store, add edit modal).

**System font, not custom.** The design system search recommended Inter, but React Native's system fonts (SF Pro on iOS, Roboto on Android) are already clean sans-serifs that match the minimal style. No font loading overhead.

**No date picker library.** For calendar events, the date is pre-filled from the tapped grid cell. For expenses, the date defaults to today. A full date picker can be added later if needed.

**Feather icons via @expo/vector-icons.** Already bundled with Expo — no extra dependency. Consistent stroke style, good coverage for our use cases.

## Edge Cases

- **Empty state on first launch:** Both tabs show empty states with helpful messages, no crashes on empty arrays
- **Month with no events:** Grid renders normally, no dots, tapping a date shows "No events"
- **Negative balance:** Display the negative number in red, no special handling needed
- **Very long event titles:** Truncate with `numberOfLines={1}` and ellipsis
- **Rapid taps on FAB:** Disable the FAB while modal is open
- **Today indicator across midnight:** `today` is computed on mount and when tab gains focus
