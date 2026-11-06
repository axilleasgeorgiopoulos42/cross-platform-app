# PWA install: design

Sub-project B of the Expenses redesign request ("make it an app on my phone"). Sub-project A (the Expenses redesign) is PR #1.

## Goal

Make the existing web build installable on an iPhone home screen as **Planner**, opening full-screen and working offline, at no cost and with no app-store account.

## What the user said

- Free PWA route, separate from the redesign.
- Full offline use, with **silent updates** (a new version applies on the next launch, no prompt).
- Simple generated icon (Sage-green tile, calendar and coin glyph). Name: **Planner**.

## Non-goals

- Push notifications, background sync, share targets, install prompts or banners.
- Android/desktop install polish (the manifest works there, but nothing is tested or tuned for it).
- Native (Expo iOS/Android) builds. `app.json` native fields are not changed.
- Syncing data between Safari and the installed app (see Risks).

## Global constraints

- No new runtime dependencies. One devDependency is allowed: `@resvg/resvg-js` (icon rendering only).
- Layering rules are unchanged: nothing in `src/` imports `scripts/`. The service-worker registration module is web-only and touches no services or stores.
- Theme values (accent `#2DB368`, light background `#F0F7F2`, dark background `#060D09`) come from `src/constants/theme.ts`; the script reads them, it does not copy hex codes.
- Service worker registers in production builds only (never under `expo start`).
- `vercel.json` cross-origin isolation headers (COOP `same-origin`, COEP `credentialless`) must keep working, because the web SQLite build needs them.

## Architecture

```
public/                      committed static files (Expo copies public/ to dist/)
  manifest.webmanifest
  icons/ icon-180.png icon-192.png icon-512.png icon-maskable-512.png
scripts/
  generate-icons.js          one-off: SVG -> PNGs (run by hand, output committed)
  pwa/precache.js            pure: file list -> filtered, sorted precache list
  pwa/inject-head.js         pure: html string -> html with manifest + iOS tags
  pwa/service-worker.js      pure: (version, files) -> sw.js source text
  pwa-postbuild.js           glue: reads dist/, writes dist/sw.js, patches dist/index.html
src/lib/registerServiceWorker.web.ts   + registerServiceWorker.ts (native no-op)
app/_layout.tsx              calls registerServiceWorker() once on mount
vercel.json                  buildCommand adds the post-build step; sw.js and manifest headers
```

**Build flow.** `npx expo export --platform web && node scripts/pwa-postbuild.js`. The post-build step:

1. Lists every file in `dist/`, excludes `sw.js`, `metadata.json` and source maps.
2. Computes a version hash over the file names plus their contents.
3. Writes `dist/sw.js` with that version and the precache list embedded.
4. Injects into `dist/index.html` `<head>`: `<link rel="manifest">`, `<link rel="apple-touch-icon" href="/icons/icon-180.png">`, `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-title=Planner`, `apple-mobile-web-app-status-bar-style=default`, and `theme-color` for light and dark (`prefers-color-scheme` media variants). Injection is idempotent.
5. Fails the build (non-zero exit) if `dist/index.html` has no `<head>` or the wasm file is missing from the list.

Head tags are injected by this step rather than `app/+html.tsx`, because Expo's docs do not say `+html.tsx` applies to the single-page output used here.

## Manifest

`name` and `short_name`: `Planner`. `display: standalone`, `start_url: /`, `scope: /`, `orientation: portrait`, `background_color` and `theme_color`: the light-theme values, icons 192, 512 and maskable 512. The existing `viewport-fit` behaviour of the app is unchanged; safe-area handling is checked on a phone (see Verification).

## Icons

`scripts/generate-icons.js` draws one SVG (rounded Sage-green tile, white calendar page with a coin glyph) and renders 180, 192, 512 and a maskable 512 (glyph inside the central 80% safe zone, full-bleed green background). PNGs are committed. The script is run manually, only when the artwork changes. `assets/icon.png` and `favicon.png` (Expo placeholders) are replaced with the same artwork at 1024 and 48 so the web favicon and native icon match.

## Service worker

Version `planner-<hash>`. Behaviour:

- **install:** open the new cache, `addAll` the precache list (fetched with `cache: 'reload'` so stale HTTP caches cannot poison it), then `skipWaiting()`. If any file fails, install fails and the old worker keeps running.
- **activate:** delete every `planner-*` cache except the current and the immediately previous one, then `clients.claim()`. Keeping one previous generation means an already-open old page can still lazy-load its own chunks.
- **fetch:** only same-origin `GET`. Navigations (`request.mode === 'navigate'`) are answered with the cached `/index.html`. Other requests are cache-first, falling back to the network, and cache successful network responses. Everything else (non-GET, cross-origin) passes through untouched.
- Responses are returned exactly as cached (the original `Response`, never rebuilt), so the COOP/COEP headers they were stored with survive. Navigation responses are served from the cache copy that came from a real Vercel response.
- **Silent update:** the browser re-fetches `sw.js` on every launch; a changed `sw.js` (new hash) installs, activates and claims. The running page keeps its old JS until the next launch, which then loads the new version. `vercel.json` sends `Cache-Control: no-cache` for `/sw.js` so the update check is never served stale.

Registration (`registerServiceWorker.web.ts`): `if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator)` register `/sw.js` after the `load` event. Registration errors are caught and logged, never thrown; the app works without a service worker. The native file is a no-op with the same signature.

## Risks and how the design handles them

1. **Separate storage on iPhone.** An app added to the home screen gets its own storage, separate from Safari. Data entered in a Safari tab will not appear in the installed app. Mitigation: use Settings > Backup to export from Safari and import in the installed app once. This goes in README and PROJECT_LOG. No code change.
2. **Cross-origin isolation.** If the worker rebuilt responses, COOP/COEP would be lost and the SQLite wasm would fail. Mitigation: serve cached originals; manual check below (the app must still open its data offline).
3. **A bad deploy cached forever.** Mitigation: the version hash changes with any file change, the install is atomic (all files or none), and `sw.js` is never HTTP-cached.
4. **iOS evicts storage of non-installed sites after inactivity.** Installed home-screen apps are exempt. This is the main reason to install.
5. **Precache size.** About 6.5 MB today (fonts, wasm, JS). Acceptable for a one-time download; the script prints the total and fails the build above 25 MB.

## Testing

Unit tests (Jest, node environment) on the pure modules in `scripts/pwa/`:

- `precache`: excludes `sw.js`, `metadata.json`, `.map`; includes wasm, js, fonts, icons, `index.html`; sorted; stable.
- `inject-head`: all tags present once; idempotent on a second run; throws without `<head>`; leaves existing tags intact.
- `service-worker` source: embeds the version and every file; contains no `skipWaiting` outside install; keep-previous-cache rule; only same-origin GET handled. Behaviour is checked by running the generated source against a small fake `self`/`caches` harness (install, activate pruning to two generations, fetch routing for navigate, asset cache hit, asset miss then cache, non-GET and cross-origin passthrough).
- Manifest: JSON parses, name and short name are `Planner`, required icons exist on disk with the declared sizes.

Registration is tiny and platform-specific, so it is covered by the manual checks only.

## Verification (manual, on the Vercel preview and then production)

1. Open the preview in Safari, Share > Add to Home Screen. The label is "Planner" and the icon is the green tile.
2. Launch from the home screen: full-screen, no Safari bars, content not hidden by the notch or home bar, light and dark themes both correct.
3. Add a transaction. Switch on airplane mode, force-quit, relaunch: the app opens and the transaction is still there.
4. Deploy a trivial change. Launch online once (the old version may show), force-quit, relaunch: the new version shows, with no prompt.
5. Settings > Backup export in Safari, import in the installed app: data appears.

## Docs to update

README (install and offline usage, the Safari-vs-home-screen storage note), ARCHITECTURE (PWA layer, build step, service worker contract), DEVELOPMENT (how to regenerate icons, how to test the service worker), PROJECT_LOG (entry and backlog).
