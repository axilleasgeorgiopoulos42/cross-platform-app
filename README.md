# Cross-platform Calendar and Expenses

A local-only calendar and expense tracker built with Expo (SDK 58), React Native 0.88, TypeScript (strict), Expo Router, expo-sqlite and Zustand. It is deployed as a web app and installed on an iPhone as a PWA.

## Screens

- **Today** (tab): events for the current day.
- **Calendar** (tab): month grid with events; swipe left/right to change month, "Jump to today" to return.
- **Expenses** (tab): income and expense list with a month filter, balance summary and a category breakdown.
- **Event detail**: view, edit and delete an event (with notes).
- **Transaction detail**: view, edit and delete a transaction.
- **Settings**: currency, theme, JSON backup export/import (web only), clear all data.

## Features

- Event notes; edit and delete with a confirmation prompt.
- Currency: EUR, USD or GBP.
- Theme override: system, light or dark.
- JSON backup export and import (web only), validated before anything is changed.
- Clear all data (events and transactions; settings are kept).
- Month filter and category breakdown on Expenses.

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

Open the deployed link in Safari (production: https://cross-platform-app-navy.vercel.app), tap Share, then **Add to Home Screen**.

## Your data

All data lives in a SQLite database stored locally in the browser (or on the device). Nothing is sent to a server and there is no sync. Clearing site data or switching browser/device loses it, so use the backup export in Settings to protect or move your data and import to restore it.

See `ARCHITECTURE.md`, `DEVELOPMENT.md` and `API.md` for details.
