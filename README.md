# Cross-platform Calendar and Expenses

A local-only calendar and expense tracker built with Expo (SDK 58), React Native 0.88, TypeScript (strict), Expo Router, expo-sqlite and Zustand. It is deployed as a web app and installed on an iPhone as a PWA.

## Screens

- **Today** (tab): events for the current day.
- **Calendar** (tab): month grid with events; swipe left/right to change month, "Jump to today" to return, search across all events.
- **Expenses** (tab): a range picker (Week, Month, 3 Months, Year, Custom; defaults to the current month) with a previous/next stepper, a balance summary, a bar chart of spending (daily bars for up to 31 days, weekly or monthly bars for longer ranges; tap a bar to see its amount), an expandable per-category list (tap a category arrow to see, edit and delete its entries), and search with a category filter that narrows the chart and list together.
- **Event detail**: view, edit and delete an event (with notes).
- **Transaction detail**: view, edit and delete a transaction.
- **Settings**: currency, theme, JSON backup export/import (web only), clear all data.

## Features

- Event notes; edit and delete with a confirmation prompt.
- Currency: EUR, USD or GBP.
- Theme override: system, light or dark.
- JSON backup export and import (web only), validated before anything is changed.
- Clear all data (events and transactions; settings are kept).
- Range presets, spend chart and expandable category list on Expenses.
- Choose the date when adding or editing an event or a transaction (so an item can be moved to another day or backdated). Web uses a native date input; iOS/Android use the platform date picker.
- Search: the Calendar tab searches all events by title and notes; the Expenses tab searches notes and categories, with a category filter, and its date range comes from the range picker (Custom takes From/To dates). Matching ignores case, accents and Greek final sigma.

## Commands

```bash
npm install
npx expo start --web             # dev server in the browser
npm test                         # jest
npx tsc --noEmit                 # typecheck
npx expo lint                    # lint
npx expo export --platform web   # production web build into dist/
```

## Install on an iPhone

Open the deployed link in Safari (production: https://cross-platform-app-navy.vercel.app), tap Share, then **Add to Home Screen**. Keep the name **Planner** and tap Add.

The home-screen app opens full-screen and is designed to work offline once the first launch has finished its initial download (stay online until it has loaded). Updates are silent: a new version downloads in the background and must finish before the app is closed, so it may take one or two launches to appear. There is no prompt.

**The home-screen app has its own storage, separate from Safari.** Data you entered in a Safari tab will not appear in the installed app. To move it, open Settings > Backup and export in Safari, then import that file once in the home-screen app.

## Your data

All data lives in a SQLite database stored locally in the browser (or on the device). Nothing is sent to a server and there is no sync. Clearing site data or switching browser/device loses it, so use the backup export in Settings to protect or move your data and import to restore it.

See `ARCHITECTURE.md`, `DEVELOPMENT.md` and `API.md` for details.
