# PROJECT_LOG — read this first

Compact, chronological record of what was asked and what was done in this project, so any AI (or human) starting a fresh session can pick up without the old conversation. **Update it after every user prompt** (see "How to maintain" at the bottom). Facts here were true when written; when a fact matters, verify it against the code (`git log`, the files themselves).

## 1. Snapshot

- **What:** a minimal, local-only calendar + expense tracker. No backend, no auth, no cloud sync. Data lives in the device/browser (SQLite; wa-sqlite on web).
- **Stack:** Expo SDK 58, React Native 0.88, React 19, TypeScript 6 strict, expo-router (routes in `app/`, not `src/app/`), expo-sqlite, Zustand 5, Feather icons, Jest (jest-expo) + sql.js for tests. StyleSheet only, theme tokens only (`src/constants/theme.ts`), system fonts.
- **Layers:** SQLite -> services (`src/domains/*/service.ts`, take `db`) -> Zustand stores (`store.ts`, call `getDb()`) -> screens/components. Components never import services or `getDb`. See `ARCHITECTURE.md`, `DEVELOPMENT.md`, `API.md`, `README.md`.
- **Repos (important):** this app has **its own git repo** (`cross-platform-app/.git`, remote `github.com/axilleasgeorgiopoulos42/cross-platform-app`). The folder sits inside a larger home-directory git repo; **never commit app files to the outer repo**. Plans/specs were first written to the outer repo (`Projects/docs/superpowers/{plans,specs}`); copies live in `docs/history/` here.
- **Deploy:** Vercel project `lsg10/cross-platform-app`, GitHub-connected (push to `main` auto-deploys to production; other branches get preview deployments). Production URL: https://cross-platform-app-navy.vercel.app . The user installs it on an iPhone via Safari > Share > Add to Home Screen (web app; there is **no** web manifest, so it is not a real PWA). `vercel.json` sets COOP/COEP headers (needed by wa-sqlite) and an SPA rewrite. `metro.config.js` adds `wasm` to `assetExts`.
- **Features / branch status:** screens are Today, Calendar, Expenses, event and transaction detail, Settings. Event and transaction forms have a date field (`DateField`; web `<input type=date>`, native `@react-native-community/datetimepicker`), and Calendar and Expenses have search (Expenses also has a category filter; From/To dates come via the Custom range preset). Dates and search is merged to `main`. Current work: Expenses redesign on branch `feat/expenses-redesign` (range presets Week/Month/3 Months/Year/Custom defaulting to the month, daily/weekly/monthly spend bars, expandable per-category list), not yet pushed. Next sub-project: make it a real phone app via PWA (manifest, icons, service worker); it still needs its own spec.
- **Native / Expo Go:** the user could not get Expo Go working; EAS builds were investigated but not set up (EAS CLI not logged in; iOS native distribution needs a paid Apple Developer account). Web is the supported target.
- **Review/process tooling used:** superpowers skills (brainstorming, writing-plans, subagent-driven-development, finishing-a-development-branch) and ui-ux-pro-max. The SDD ledger lived in `.superpowers/sdd/<plan>/` (git-ignored; deleted at the end), so its rulings and deferred items are preserved in sections 4-5 below.

## 2. Standing preferences from the user (see also their auto-memory)

- Strict layered/modular architecture, API-first thinking, free-first tech, design tokens + dark/light themes, consistent errors/logging, data model first then services then UI, docs (README/ARCHITECTURE/API/DEVELOPMENT) for every project.
- Short answers. Ask only when genuinely blocked. The user wants all necessary fixes done without being asked step by step.
- Commit messages end with a `Co-Authored-By: Claude ... <noreply@anthropic.com>` line (use the model named in the session's attribution reminder).
- Never push `main` casually: it deploys to the user's live phone app, which holds their real data.

## 3. Prompt-by-prompt history

Session A (before the v2 work; summarised from an earlier context):
1. "Recap the project cross platform app" / "not the habit finance tracker" -> the user wants `cross-platform-app`, not `habit-finance-tracker` (its files show as deleted in the outer repo; ignore).
2. "Minimal app: calendar for user events + a separate expenses tracker; use ui-ux-pro-max + superpowers" -> brainstormed (event = title + date + optional time; fixed category list), wrote spec + 7-task plan, "No move on and implement it".
3. Implemented plan v1 (2 tabs: Calendar, Expenses; SQLite + Zustand). Commits on `main`: `f31eb7d` scaffold, `10afba9` theme type fixes, `ae5e76b` DB layer + 2-tab nav, `a641c4f` calendar domain, `134c84f` expenses domain, `f76b28d` stores, `572a560` shared components + calendar screen, `502d57b` expenses screen, `96c612e` review fixes (DST-safe day filter, amount validation).

Session B (this log's first session):
4. "push to remote" -> `main` pushed (`10afba9..96c612e`).
5. "run it on web first" -> Metro could not resolve `wa-sqlite.wasm`; added `metro.config.js` (`assetExts.push('wasm')`). Blank screen came from DB init failing silently: `app/_layout.tsx` now catches init errors and shows them. User confirmed web works.
6. "add a web-compatible sqlite polyfill" -> not needed: expo-sqlite 58 ships wa-sqlite for web; only the Metro wasm config was missing.
7. "see if it works on my phone" / "does not work with expo, I want to connect with github cli and run it with a link" / "run it on my iPhone without Expo Go" -> chose the web-app route (user picked it over a paid native build). `npx expo export --platform web`, `vercel.json` (headers), `vercel link` + `vercel deploy --prod`. Commit `7ecfac1` pushed to `main`. Prod URL above. User confirmed it works on the phone.
8. "design a plan for how many screens and what features" -> proposed Today / Calendar / Expenses tabs + edit screens + Settings; features: backup/restore, editing, currency, delete confirmation. (The user never answered the "planner vs money tracker" question; plan weights both equally.)
9. `/writing-plans` -> wrote `docs/history/2026-11-05-v2-screens-and-features.md` (11 tasks, Review Focus list).
10. "subagent driven is better" -> executed the plan with fresh implementer + reviewer subagents per task on branch `feat/v2-screens-features` (see section 4).
11. "continue with the next task" (x2) -> status answers while a task was still running.
12. "Do the review" / "Commit the edit and then do the whole review" -> Task 11 review + final whole-branch review (Opus). Verdict: no data-loss path; six Important issues (section 4). The lint fix had already been committed by the implementer (`5a8c5b8`).
13. "compact all the changes after every prompt into a file for future AI sessions, then continue with all the necessary fixing" -> this file; the fix pass for the six Important findings (four commits) and its re-review.
14. (session resumed after context compaction; no new user text) -> ran the scoped re-review (clean), recorded it here, committed this log + AGENTS.md + docs/history, pushed the branch for a Vercel preview.
15. "on the expenses the reload does not work" / "Still does the same" -> could not reproduce (preview routes 200, no headless browser available); asked for URL + symptom. "merge to main and lets see from there" -> merged `feat/v2-screens-features` into `main` (`d97730d`), pushed; production redeployed, `/expenses`, `/calendar`, `/settings` now return 200 on https://cross-platform-app-navy.vercel.app. Reload symptom still unconfirmed on the phone.
16. Sage glass theme brief (palette, frosted cards/tab bar, accent glow, 12/20px radii, weights 400/600, 0.35s transitions) -> tokens in `src/constants/theme.ts` (+ `card`, `tabBar`, `glow`), helpers in `src/lib/glass.ts` (web-only backdrop blur/transition/glow), Card/Button/FAB/Modal/Screen/tab bar restyled; tab bar floats over content (Screen/FAB inset by `tabBarHeight`). Branch `feat/sage-theme`, preview only; native has translucent fill without blur.
17. "merge it" -> merged `feat/sage-theme` into `main` and pushed; production redeploys.
18. Dates and search (sub-project 1; spec/plan commits `0bf6e0c`, `9859531`) -> built on branch `feat/dates-and-search` with subagent-driven development: date helpers `a1ed29f`; event search, text matching and all-events loading `d609e81` + fix `cb5152a` (Greek final sigma, store/sort tests); transaction filter `a09924c`; `DateField`/`SearchBar`/`CategoryFilter` `f70624a`; date field on the event form `b7ad2d1` and expense form `9069d84`; calendar search `0d64729`; expenses search and filters `c008309`; docs (Task 9, the last commit on the branch). Rulings: search is accent- and Greek-final-sigma-insensitive; spec requirement R4 was stale, so no store signature change (`addEvent` unchanged); Today screens use `dayStart` from `useTodayStart` for default dates because `Date.now()` in render fails react-hooks/purity; push held back until the final review. Deferred minors are in section 6. Not pushed or merged yet.
19. "Prossed" (proceed) -> final self-review of `feat/dates-and-search` (jest 116 pass, tsc + lint clean, no blocking findings); pushed the branch for a Vercel preview. `main` untouched; section 7 manual checks are the user's.
20. "merge it" -> merged `feat/dates-and-search` into `main` (`d02278b`), pushed; production redeploys. Manual checks were not confirmed by the user before merge.
21. "Redesign Expenses: a graph by range (default monthly, daily bars) and an expandable per-category list; also make it a phone app via PWA, as a separate sub-project" -> brainstormed decisions A/B/A (presets with a stepper and chart granularity by length; categories expand inline; one filtered array feeds chart, summary and list). Spec `docs/superpowers/specs/2026-11-05-expenses-redesign-design.md` (`05b170f`), plan `docs/superpowers/plans/2026-11-05-expenses-redesign.md` (`dde8af5`). Built on `feat/expenses-redesign` with subagent-driven development: range model `00fde21`; chart bucketing `f9c2caa` + `293e83b` (shared `calendarDayCount` in `src/lib/dates.ts`); `groupByCategory` `ed25efa`; `RangePicker` `8b8790a`; `SpendChart` `9be3777` (exports pure `barHeight`); `CategoryList` `7185e69`, `3f73a02`, `e94defd` (pure `categoryRowLabel`); redesigned screen `9c6dda7` (`CategoryBreakdown` deleted; `MonthSwitcher`/`filterByMonth` kept, unused by the screen); docs (this entry's commit). Not pushed or merged. PWA is the next sub-project, not started.
22. Final review of `feat/expenses-redesign` found income entries unreachable (only `TransactionItem` route was via expense groups) and unbounded chart buckets for long custom ranges -> fix wave: year granularity (>1100 days) and `validateRange` minimum year 1900 (`21c9044`), expandable Income section in `CategoryList` with `incomeEntries` and an any-transaction empty state (`79e4eed`), Custom re-tap re-seeds drafts (`ce99914`), docs corrected. Gate: jest, tsc, lint, web export.
23. "start the PWA spec" (sub-project B of the Expenses redesign; entries 21-22 are on `feat/expenses-redesign`, PR #1) -> brainstormed on branch `feat/pwa-install` (from `main`): full offline with silent updates, generated Sage icon, name "Planner", dependency-free approach (post-export script writes `dist/sw.js` and injects head tags). Spec: `docs/superpowers/specs/2026-11-06-pwa-install-design.md`. Awaiting the user's spec review before writing the plan. Note: iPhone home-screen apps have storage separate from Safari (use Backup export/import once).
24. "Yes subagent driven, continue" -> built on `feat/pwa-install`: `public/` manifest and icons, `scripts/pwa/*` pure helpers with tests, `scripts/pwa-postbuild.js` (writes `dist/sw.js`, injects head tags), `registerServiceWorker` (web/native pair) called from `app/_layout.tsx`, `vercel.json` build command and `sw.js`/manifest headers, README/ARCHITECTURE/DEVELOPMENT docs. Real `expo export` + post-build ran clean (Expo copies `public/` into `dist/`, so no copy fallback was needed). Not pushed; no browser or iPhone test was possible, so section 7 PWA checks are the user's. Final review fix wave: the worker now rejects (install) and refuses to cache (runtime) `text/html` responses for non-HTML URLs, since the SPA rewrite masks missing assets; README/ARCHITECTURE corrections; DEVELOPMENT "Recovering from a bad deploy" recipe. Follow-ups: Feather-only icon import (cuts ~4.4 MB of unused vector-icon fonts from the 6.4 MB precache), `<title>` still "cross-platform-app", the coin glyph shows "$", and Safari COEP-credentialless / blob-worker interception is unverified (manual check 3 is the gate).
25. "i need you to make the bottom 3 buttons not so low ... because of a white bar it has at the bottom" (user confirmed: in the home-screen app) -> branch `fix/tab-bar-safe-area`: the viewport meta had no `viewport-fit=cover`, so iOS standalone reported a 0 bottom safe-area inset and showed a strip below the tab bar. `scripts/pwa/inject-head.js` now adds/normalises `viewport-fit=cover` (4 tests; idempotent; also heals an already-injected page). The tab bar already adds `insets.bottom` (expo-router BottomTabBar), so no screen code changed. Not verified on a device: check on the Vercel preview that the three tabs sit above the home indicator with no white strip, in light and dark, and that the top header and the floating add button still look right.

## 4. Plan v2 execution record (branch `feat/v2-screens-features`, base `7ecfac1`)

Plan: `docs/history/2026-11-05-v2-screens-and-features.md`. Scope = 3 tabs (Today, Calendar, Expenses), event + transaction detail/edit screens, Settings (currency EUR/USD/GBP, theme override, JSON backup export/import [web only], clear all data), event notes, delete confirmations, month filter + category breakdown, swipe months + Jump to today.

| Task | What | Commits |
|---|---|---|
| 1 | Jest harness, sql.js `createTestDb`, `formatMoney`, `Currency` | `4a2fd3d` chore (eslint config, gitignore), `d727456`, fix `eb1cc91` (jest deps to devDependencies) |
| 2 | Schema v2 (`events.notes`, `settings` table, `PRAGMA user_version` migrations) + settings domain | `069ab97` |
| 3 | `update`/`getById` in services + store `updateX`/`fetchX`, `addEvent(..., notes?)` | `65af56c` |
| 4 | Pure `filterByMonth` / `summarize` / `categoryBreakdown` | `be0b0f7` |
| 5 | Backup domain (`buildBackup`/`parseBackup`/`restoreBackup`/`clearAllData`), `files.web.ts` | `2ab47a5`, fix `62f68ff` (pickTextFile settles once) |
| 6 | `confirmAction`, `EventForm`/`TransactionForm`, `useSwipe`, `isValidTime`, `swipeDirection` | `2da1fc4`, fix `6015957` (submit guard, `resetOnSubmit`) |
| 7 | `/event/[id]`, `/transaction/[id]` screens, row navigation, delete confirm | `cffeecf` |
| 8 | Settings screen, theme override, currency formatting everywhere, backup store | `6310275`, fix `ada08a0` (clear stale errors) |
| 9 | Today tab, Calendar swipe + Jump to today (`index.tsx` = Today, `calendar.tsx` = Calendar) | `eb172d2` |
| 10 | Expenses month filter, `MonthSwitcher`, `CategoryBreakdown`, `shiftMonth` | `7306d02` |
| 11 | README/ARCHITECTURE/DEVELOPMENT/API docs + lint cleanup (0 errors/0 warnings) | `4526cb1`, `5a8c5b8` |
| Final fix pass (six Important findings from the Opus whole-branch review) | see below | `e37941a`, `91aa194`, `b34ee2c`, `44d2f0d` |

Final review findings (all Important, fixed in the final fix pass): (1) `vercel.json` had no SPA rewrite so reload/deep-link on any non-root route returned 404 in production (verified on the live site; also affected v1) -> rewrite added; (2) no `unstable_settings.initialRouteName` and detail screens used bare `router.back()` -> deep link had no way back -> `unstable_settings = { anchor: '(tabs)' }` (expo-router 58.0.30 deprecates `initialRouteName`) + `goBack()` helper; (3) stale "today" after resuming the app on a later day -> `AppState`-aware today hook; (4) Expenses save while viewing a past month gave no feedback -> view returns to the current month after a successful save; (5) Today called the shared `loadMonth`, moving the Calendar tab's month -> Today has its own `todayEvents` / `loadToday()` in the calendar store; (6) backup export revoked the blob URL too early (iOS) and import input/accept/fallback were fragile -> deferred revoke, input attached to DOM, `.json` accept, fallback only when `cancel` unsupported, softer success message.

Scoped re-review of the fix pass (sonnet, `5a8c5b8..44d2f0d`): all six findings ADDRESSED, no new Critical/Important breakage. Minors: `loadToday` has no sequence guard and does not clear `error` first; Calendar's month events are not reloaded on app resume (only `today` refreshes). Known behavior: a failed Expenses add still closes the modal and discards input (pre-existing).

Verification state: `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform web` were green at each commit reported by the implementers. **No UI has been exercised in a browser or on a phone by an AI** (no browser tooling in the session); the plan's manual steps are still the user's to run (checklist in section 7).

## 5. Rulings made on the user's behalf (all of them)

- Work on branch `feat/v2-screens-features`, not `main` (push to main deploys to the live app); merge to `main` is the user's decision.
- Task 1 committed leftover tracked changes (`.gitignore`, `package.json`, lockfile, `eslint.config.js`).
- Store `updateEvent`/`updateTransaction` swallow errors into the store's `error` and resolve; detail screens must read `error` after the call and only navigate on success.
- `clearAllData` deletes events and transactions only; stored settings (currency/theme) are kept.
- Subagents cannot run a browser, so manual web steps in the plan were deferred to the user; implementers verified with jest/tsc/web export instead.
- Forms get `resetOnSubmit` (default true) and an in-flight submit guard; edit screens pass `resetOnSubmit={false}` and a `key`.
- Calendar's "Jump to today" button lives in the screen body (the navigator `headerRight` holds the Settings gear on every tab).
- Detail-screen fallbacks go to `/calendar` (event) and `/expenses` (transaction) because `/` is now Today.
- Task 11 was split: implementer wrote docs and ran checks; the controller handles push/deploy.
- The lint failures found in Task 11 were treated as a gap in that task and fixed with behavior-preserving changes (no `eslint-disable`, no config edits).

## 6. Open backlog (deferred minors; none blocks merge unless noted)

- Docs: `API.md` omits that `calendarService.update` / `expenseService.update` also throw `Event title cannot be empty` / `Amount must be greater than 0`, and documents `exportBackup`/`importBackup`/`clearData` as plain values (they return Promises); README says "PWA" but there is no manifest (add one or reword).
- `refreshStores()` runs in the same `try` as `restoreBackup` (a reload failure after a successful restore looks like a failed import).
- DST tests pass trivially in a non-DST timezone (pin `TZ` in jest); `isSameLocalDay` is unused in production code; inline `dayEnd` duplicates `startOfNextDay` in places.
- UI polish: net 0 shown green; "All time" row not red when negative and under-labelled; hitSlop overlap between next-chevron and Today button; chips use role button not radio; error texts lack `accessibilityRole="alert"`; no `KeyboardAvoidingView` on native; invalid time only shows a red border; inputs lack accessibility labels.
- Tests: no component-level tests for forms; no store-level test for backup import ordering; settings `Unsupported theme` / partial-patch cases untested; `testDb.ts` uses `as any` casts and only array params.
- Re-review minors: no sequence guard in `loadToday`; Calendar month list not refreshed on app resume; failed Expenses add closes the modal and drops input.
- Dates and search minors: iOS native picker may need two taps / a different display mode; web date error is not linked via `aria-invalid`/`aria-describedby`; an empty Safari date input has no hint; native `DateField` cannot clear a date; calendar search results show month+day without the year; "No matching events" may flash before data loads; an inverted From>To range silently returns zero results; un-indented ternary in the `expenses.tsx` header; add modals left open across midnight keep a stale default date; prettier noise in `calendar.tsx`.
- Expenses redesign minors: `SpendChart` bars are narrower than 44pt at ~30 buckets and selection is keyed by index; `RangePicker` has no component tests and its `onChange` fires even when the new valid range equals the current; `groupByCategory` duplicates ~6 lines of `categoryBreakdown`; `handleSave` closes the modal even if the add fails (pre-existing).
- Small: `.gitignore` blanket `.env*`; settingsService `this.get` pattern; migration v2 step could be one transaction; `tsconfig` `types: ["jest","node"]` makes jest globals visible in app code; fetch failure on detail screens shows "Not found".

## 7. Next steps and manual checks (owner: the user, on a Vercel preview, with throwaway data)

Expenses redesign (branch `feat/expenses-redesign`, not yet pushed; push creates a preview; do not merge to `main` before these pass). Then spec the PWA sub-project.

1. Default Month shows the current month's daily bars.
2. Week / 3 Months / Year / Custom change the chart and the stepper.
3. Custom with From after To shows the error and keeps the old chart.
4. Tap a bar: its amount shows.
5. Tap a category arrow: its entries open; edit and delete work.
6. Search and category filter narrow the chart and the list together.
7. Dark theme and phone width.
8. Add an income item, open it from the Income section (expand the Income row), edit it, then delete it.
9. Custom range: type a From year like 2026 on desktop (no freeze; years before 1900 show the error); a multi-decade range shows yearly bars.

PWA install (branch `feat/pwa-install`; run on the Vercel preview, then production):

1. Open the preview in Safari, Share > Add to Home Screen: label is "Planner", icon is the green tile.
2. Launch from the home screen: full-screen, no Safari bars, content not hidden by the notch or home bar, light and dark themes correct.
3. Add a transaction, enable airplane mode, force-quit, relaunch: the app opens and the transaction is still there.
4. Deploy a trivial change, launch online once, force-quit, relaunch: the new version shows with no prompt.
5. Settings > Backup export in Safari, import in the installed app: data appears.

Risk: the home-screen app has its own storage, separate from Safari; nothing carries over except via Backup export/import (also in README).

Dates and search (branch `feat/dates-and-search`, not yet pushed; the controller pushes after the final review, which creates the preview; do not merge to `main` before these pass):

1. Add an event on a chosen date from the Calendar tab and from Today; confirm it appears on that day.
2. Edit an event into another month and find it there.
3. Add backdated and future expenses; the Expenses range switches to that month.
4. Clear a date field: Save is blocked and the error shows.
5. Search events by title and by notes, with Greek text (accents, final sigma) and with `(`.
6. Expenses: search plus category plus a Custom From/To range together.
7. Dark theme; reload during an open search.

Earlier checks (v2 branch, mostly done when it was merged):

1. Push `feat/v2-screens-features` (creates a Vercel preview) and reload on `/calendar` and `/event/<id>`: must not 404.
2. iPhone home-screen app: Settings > Export, confirm the file exists in Files, Clear all data, Import it, then try a bad file (nothing may change).
3. Real v1 data survives the upgrade: export a backup from production first, then open the preview/new build (different origin -> separate storage, so restore the backup there).
4. Open a detail URL directly, Save, confirm you land somewhere sensible.
5. Calendar month -> Today -> back to Calendar with a date selected.
6. Theme Dark + reload; currency USD on Expenses and Today.
7. Only after the checks pass: merge to `main` (auto-deploys to the live app).

## 8. How to maintain this file

After **every user prompt**, append one numbered line to section 3 (what was asked, what changed, commit SHAs) and update sections 4-7 if state changed (new rulings, new backlog items, resolved items removed). Keep entries to a few lines; link to commits rather than pasting diffs. Never record secrets or tokens. If this file and the code disagree, the code wins: fix the file.
