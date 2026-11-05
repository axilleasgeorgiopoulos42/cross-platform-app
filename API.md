# API

There is no HTTP API; this documents the in-app domain services and stores. Services take `db: SQLiteDatabase` first. Dates are epoch ms; month is 0-11.

## Types

```ts
CalendarEvent { id; title; date: number; time: string | null; notes: string | null; createdAt: number }
Transaction { id; type: 'income' | 'expense'; amount: number; category: Category; note: string | null; date: number; createdAt: number }
Category = 'food' | 'transport' | 'bills' | 'entertainment' | 'health' | 'shopping' | 'other'
BalanceSummary { totalIncome; totalExpenses; balance }
AppSettings { currency: 'EUR' | 'USD' | 'GBP'; theme: 'system' | 'light' | 'dark' }   // defaults EUR, system
BackupFile { version: 1; exportedAt: number; events: CalendarEvent[]; transactions: Transaction[]; settings: AppSettings }
```

## calendarService (`src/domains/calendar/service.ts`)

```ts
getEventsForMonth(db, year, month): Promise<CalendarEvent[]>
getEventsForDate(db, date): Promise<CalendarEvent[]>
create(db, { title, date, time, notes? }): Promise<CalendarEvent>          // throws 'Event title cannot be empty'
getById(db, id): Promise<CalendarEvent | null>
update(db, id, { title?, date?, time?, notes? }): Promise<CalendarEvent>   // throws 'Event not found'
remove(db, id): Promise<void>
```

## expenseService (`src/domains/expenses/service.ts`)

```ts
getAll(db): Promise<Transaction[]>                                          // newest first
create(db, Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction>     // throws 'Amount must be greater than 0'
getById(db, id): Promise<Transaction | null>
update(db, id, Partial<Pick<Transaction, 'type' | 'amount' | 'category' | 'note' | 'date'>>): Promise<Transaction>  // 'Transaction not found'
remove(db, id): Promise<void>
getBalance(db): Promise<BalanceSummary>
```

## settingsService (`src/domains/settings/service.ts`)

```ts
get(db): Promise<AppSettings>
set(db, patch: Partial<AppSettings>): Promise<AppSettings>   // throws 'Unsupported currency: X' / 'Unsupported theme: X'
```

## Backup (`src/domains/backup/service.ts`)

```ts
parseBackup(text: string): BackupFile
buildBackup(db): Promise<BackupFile>
restoreBackup(db, backup: BackupFile): Promise<{ events: number; transactions: number }>   // atomic replace
clearAllData(db): Promise<void>                                                            // events + transactions; keeps settings
```

`BackupFile.version` is 1. `parseBackup` validates everything before any write and throws errors whose message starts with `Invalid backup file` (bad JSON, unsupported version, invalid events/transactions/settings, duplicate ids). `backupFilename(now: Date)` returns `crosscal-backup-YYYY-MM-DD.json`.

## Summary helpers (`src/domains/expenses/summary.ts`)

```ts
filterByMonth(txs: Transaction[], year: number, month: number): Transaction[]
summarize(txs: Transaction[]): BalanceSummary
categoryBreakdown(txs: Transaction[]): CategoryShare[]   // { category, total, share }; expenses only, sorted desc; [] if none
```

## formatMoney (`src/lib/money.ts`)

```ts
formatMoney(amount: number, currency: Currency): string   // en-US Intl currency format; values under 0.005 shown as 0
```

## Stores (Zustand)

- `useCalendarStore`: state `events, selectedDate, currentMonth {year, month}, loading, error`; actions `loadMonth(year, month)`, `selectDate(date | null)`, `addEvent(title, date, time, notes?)`, `updateEvent(id, patch)`, `fetchEvent(id)`, `deleteEvent(id)`, `nextMonth()`, `prevMonth()`.
- `useExpenseStore`: state `transactions, balance, loading, error`; actions `loadTransactions()`, `addTransaction(data)`, `updateTransaction(id, patch)`, `fetchTransaction(id)`, `deleteTransaction(id)`.
- `useSettingsStore`: state `settings, loaded, error`; actions `load()`, `clearError()`, `setCurrency(c)`, `setTheme(t)`.
- `useBackupStore`: state `error`; actions `clearError()`, `exportBackup(): {filename, json} | null`, `previewBackup(text): {events, transactions} | null` (validates only), `importBackup(text): counts | null` (refreshes the other stores), `clearData(): boolean`.

Store actions catch errors and put the message in `error` instead of throwing.
