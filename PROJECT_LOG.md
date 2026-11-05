# PROJECT_LOG — read this first

Compact, chronological record of what was asked and what was done in this project, so any AI (or human) starting a fresh session can pick up without the old conversation. **Update it after every user prompt** (see "How to maintain" at the bottom). Facts here were true when written; when a fact matters, verify it against the code (`git log`, the files themselves).

## 1. Snapshot

- **What:** a minimal, local-only calendar + expense tracker. No backend, no auth, no cloud sync. Data lives in the device/browser (SQLite; wa-sqlite on web).
- **Stack:** Expo SDK 58, React Native 0.88, React 19, TypeScript 6 strict, expo-router (routes in `app/`, not `src/app/`), expo-sqlite, Zustand 5, Feather icons, Jest (jest-expo) + sql.js for tests. StyleSheet only, theme tokens only (`src/constants/theme.ts`), system fonts.
- **Layers:** SQLite -> services (`src/domains/*/service.ts`, take `db`) -> Zustand stores (`store.ts`, call `getDb()`) -> screens/components. Components never import services or `getDb`. See `ARCHITECTURE.md`, `DEVELOPMENT.md`, `API.md`, `README.md`.
- **Repos (important):** this app has **its own git repo** (`cross-platform-app/.git`, remote `github.com/axilleasgeorgiopoulos42/cross-platform-app`). The folder sits inside a larger home-directory git repo; **never commit app files to the outer repo**. Plans/specs were first written to the outer repo (`Projects/docs/superpowers/{plans,specs}`); copies live in `docs/history/` here.
- **Deploy:** Vercel project `lsg10/cross-platform-app`, GitHub-connected (push to `main` auto-deploys to production; other branches get preview deployments). Production URL: https://cross-platform-app-navy.vercel.app . The user installs it on an iPhone via Safari > Share > Add to Home Screen (web app; there is **no** web manifest, so it is not a real PWA). `vercel.json` sets COOP/COEP headers (needed by wa-sqlite) and an SPA rewrite. `metro.config.js` adds `wasm` to `assetExts`.
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

- Forms have no date field: cannot move an event to another day or backdate an expense (plan gap; worth a follow-up now that Expenses filters by month).
- Docs: `API.md` omits that `calendarService.update` / `expenseService.update` also throw `Event title cannot be empty` / `Amount must be greater than 0`, and documents `exportBackup`/`importBackup`/`clearData` as plain values (they return Promises); README says "PWA" but there is no manifest (add one or reword).
- `refreshStores()` runs in the same `try` as `restoreBackup` (a reload failure after a successful restore looks like a failed import).
- DST tests pass trivially in a non-DST timezone (pin `TZ` in jest); `isSameLocalDay` is unused in production code; inline `dayEnd` duplicates `startOfNextDay` in places.
- UI polish: net 0 shown green; "All time" row not red when negative and under-labelled; hitSlop overlap between next-chevron and Today button; `CategoryBreakdown` rows lack combined a11y label; chips use role button not radio; error texts lack `accessibilityRole="alert"`; no `KeyboardAvoidingView` on native; invalid time only shows a red border; inputs lack accessibility labels.
- Tests: no component-level tests for forms; no store-level test for backup import ordering; settings `Unsupported theme` / partial-patch cases untested; `testDb.ts` uses `as any` casts and only array params.
- Re-review minors: no sequence guard in `loadToday`; Calendar month list not refreshed on app resume; failed Expenses add closes the modal and drops input.
- Small: `.gitignore` blanket `.env*`; settingsService `this.get` pattern; migration v2 step could be one transaction; `tsconfig` `types: ["jest","node"]` makes jest globals visible in app code; fetch failure on detail screens shows "Not found".

## 7. Next steps and manual checks (owner: the user, on a Vercel preview, with throwaway data)

1. Push `feat/v2-screens-features` (creates a Vercel preview) and reload on `/calendar` and `/event/<id>`: must not 404.
2. iPhone home-screen app: Settings > Export, confirm the file exists in Files, Clear all data, Import it, then try a bad file (nothing may change).
3. Real v1 data survives the upgrade: export a backup from production first, then open the preview/new build (different origin -> separate storage, so restore the backup there).
4. Open a detail URL directly, Save, confirm you land somewhere sensible.
5. Calendar month -> Today -> back to Calendar with a date selected.
6. Theme Dark + reload; currency USD on Expenses and Today.
7. Only after 1-3 pass: merge to `main` (auto-deploys to the live app).

## 8. How to maintain this file

After **every user prompt**, append one numbered line to section 3 (what was asked, what changed, commit SHAs) and update sections 4-7 if state changed (new rulings, new backlog items, resolved items removed). Keep entries to a few lines; link to commits rather than pasting diffs. Never record secrets or tokens. If this file and the code disagree, the code wins: fix the file.
