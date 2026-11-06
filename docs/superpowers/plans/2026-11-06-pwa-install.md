# PWA Install Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the web build installable on an iPhone home screen as "Planner", fully usable offline, with silent updates.

**Architecture:** Pure, unit-tested CommonJS helpers in `scripts/pwa/` build the precache list, inject iOS/manifest head tags and generate the service worker source. A glue script `scripts/pwa-postbuild.js` runs after `expo export` to patch `dist/`. Static files (manifest, icons) live in `public/`. A web-only module registers the worker in production.

**Tech Stack:** Node 22 CommonJS scripts, Jest (jest-expo preset, node environment), Expo SDK 58 web export, Vercel. One devDependency: `@resvg/resvg-js` (icon rendering).

**Spec:** `docs/superpowers/specs/2026-11-06-pwa-install-design.md`

## Global Constraints

- No new runtime dependencies. The only new devDependency is `@resvg/resvg-js`.
- Scripts are plain CommonJS `.js` (Node runs them directly; no TS toolchain at build time). Tests are `tests/pwa/*.test.ts` (jest `testMatch` is `tests/**/*.test.ts`) and load them with `require`.
- Nothing in `src/` or `app/` imports `scripts/`. Registration code is web-only (`.web.ts` plus a native no-op `.ts`, the pattern of `src/lib/confirm.ts`/`confirm.web.ts`). It touches no services or stores.
- Theme values: light background `#F0F7F2`, dark background `#060D09`, accent `#2DB368` (from `src/constants/theme.ts`). The scripts cannot import TS, so `scripts/pwa/colors.js` holds the two background values and a Jest test pins them (and the manifest colours) to `src/constants/theme.ts`.
- Service worker registers only when `process.env.NODE_ENV === 'production'`.
- `vercel.json` COOP `same-origin` and COEP `credentialless` headers stay. The worker returns the cached original `Response` objects, never rebuilt ones.
- Cache names are `planner-<version>`; `<version>` is the first 12 hex chars of a SHA-256.
- Commit trailer on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. Run `npx tsc --noEmit` and `npx expo lint` before the last step of each task and fix anything they report.
- Work on branch `feat/pwa-install`.

## Review Focus

Spec-implied failure modes, most likely first, each pinned by a test in the task that owns the code:

1. **One file fails to download during install** (flaky network): the new worker must fail to install, must not call `skipWaiting`, and must leave the old caches intact. (Task 2)
2. **Offline deep link or reload** (for example `/expenses` or `/event/3`): a navigation request must be answered with the cached `/index.html`, not a network error. (Task 2)
3. **Non-200 network responses** (404, 500, opaque): they must not be written to the cache, or one bad response is cached forever. (Task 2)
4. **Post-build run twice on the same `dist/`** (local rebuild, retried CI): head tags must not duplicate and the old `sw.js` must not be part of the new hash. (Tasks 1 and 3)
5. **Version churn**: running the post-build twice on unchanged files must give the same version, otherwise every launch re-downloads everything. (Task 3)

---

### Task 1: Precache list and head injection (pure helpers)

**Files:**
- Create: `scripts/pwa/colors.js`, `scripts/pwa/precache.js`, `scripts/pwa/inject-head.js`
- Test: `tests/pwa/precache.test.ts`, `tests/pwa/injectHead.test.ts`, `tests/pwa/colors.test.ts`

**Interfaces:**
- Produces:
  - `colors.js`: `module.exports = { light: '#F0F7F2', dark: '#060D09' }`
  - `precache.js`: `buildPrecacheList(files: string[]): string[]`. Input is paths relative to `dist/` using forward slashes (for example `index.html`, `_expo/static/js/web/entry-abc.js`). Output is URL paths with a leading `/`, sorted, de-duplicated, excluding `sw.js`, `metadata.json` and any `*.map`. `index.html` stays as `/index.html`.
  - `inject-head.js`: `injectHead(html: string, colors: { light: string; dark: string }): string`. Throws `Error` with message containing `<head>` when the HTML has no `<head>` tag.

- [ ] **Step 1: Write the failing tests**
  - `precache.test.ts`: (a) excludes `sw.js`, `metadata.json`, `_expo/static/js/web/entry-x.js.map`; (b) keeps `index.html`, a `.wasm`, a `.ttf`, `icons/icon-192.png`, `manifest.webmanifest`, `favicon.ico`; (c) every entry starts with `/`; (d) output is sorted and de-duplicated for input `['b.js','a.js','a.js']` giving `['/a.js','/b.js']`.
  - `injectHead.test.ts`, using a small HTML fixture with `<head><meta charset="utf-8" /><link rel="icon" href="/favicon.ico"/></head>`: (a) output contains exactly one each of `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/icons/icon-180.png">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<meta name="apple-mobile-web-app-title" content="Planner">`, `<meta name="apple-mobile-web-app-status-bar-style" content="default">`, and two `theme-color` metas (one with `media="(prefers-color-scheme: light)"` and the light colour, one with `media="(prefers-color-scheme: dark)"` and the dark colour); (b) the original `<meta charset>` and favicon link are still present; (c) `injectHead(injectHead(html, c), c)` equals `injectHead(html, c)`; (d) html with no `<head>` throws an error matching `/<head>/`.
  - `colors.test.ts`: imports `colors` from `src/constants/theme` and asserts `require('../../scripts/pwa/colors')` equals `{ light: colors.light.background, dark: colors.dark.background }`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest tests/pwa`
Expected: FAIL with "Cannot find module '../../scripts/pwa/…'".

- [ ] **Step 3: Implement the three modules**

`injectHead` inserts the tags immediately before `</head>` and guards idempotency by checking for the manifest link before inserting. `buildPrecacheList` is a filter, map to `'/' + path`, de-duplicate and sort.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest tests/pwa`
Expected: PASS (3 suites).

- [ ] **Step 5: Commit**

```bash
git add scripts/pwa tests/pwa
git commit -m "feat(pwa): precache list and head injection helpers"
```

---

### Task 2: Service worker source generator

**Files:**
- Create: `scripts/pwa/service-worker.js`
- Test: `tests/pwa/serviceWorker.test.ts`

**Interfaces:**
- Consumes: URL path list format from `buildPrecacheList` (Task 1).
- Produces: `buildServiceWorker(version: string, urls: string[]): string`. Returns the complete source text of `sw.js` with the version and URL list embedded as JSON. The source uses only `self`, `caches` and `fetch` globals (no `Response` construction, no imports).

**Worker behaviour to implement (the algorithm the tests pin):**
- Cache name is `planner-` plus the version.
- `install`: `event.waitUntil` of: open the cache, then add every URL by fetching it with `{ cache: 'reload' }`, failing if any response is not `ok`, then put it; only after all succeed call `self.skipWaiting()`. If any step fails the promise rejects and `skipWaiting` is never called.
- `activate`: `event.waitUntil` of: list `caches.keys()`, keep names that do not start with `planner-`, keep the current name, and keep the most recently created other `planner-*` name (the last such entry in `keys()` order); delete the rest; then `self.clients.claim()`.
- `fetch`: ignore (do not call `respondWith`) when the method is not `GET` or the URL origin differs from `self.location.origin`. For `request.mode === 'navigate'` respond with `caches.match('/index.html')`, falling back to `fetch(request)` when nothing is cached. For other requests respond cache-first (`caches.match(request)`), else `fetch(request)`; clone and cache only responses with `status === 200` and `type === 'basic'`.

- [ ] **Step 1: Write the failing tests**

Build a harness in the test file: a fake `caches` (Map of name to Map of url to response, keys in insertion order, with `open`, `keys`, `delete`, `match` searching all caches, `cache.put`, `cache.match`), a fake `fetch` (jest.fn returning objects `{ ok, status, type, clone() }`), and a fake `self` (`location.origin = 'https://app.test'`, `addEventListener(type, fn)` recording handlers, `skipWaiting: jest.fn()`, `clients.claim: jest.fn()`). Run `new Function('self', 'caches', 'fetch', source)(self, caches, fetch)`. Helper `fire(type, init)` calls the recorded handler with an event whose `waitUntil`/`respondWith` capture the promise and returns it.
  Tests:
  - `embeds version and urls`: source contains `planner-v1` and `"/index.html"`.
  - `install caches every url and then skips waiting`: after firing install and awaiting, cache `planner-v1` holds all urls and `skipWaiting` was called once.
  - **Review focus 1** `install failure leaves old caches and does not skip waiting`: one fake fetch returns `{ ok: false, status: 500 }`; the awaited install promise rejects; `skipWaiting` not called; a pre-seeded `planner-v0` cache is still present.
  - `activate keeps current and previous generation`: caches `planner-a`, `planner-b`, `planner-c` (in that order, current `c`) and an unrelated `other-cache`; after activate, `planner-a` is deleted, `planner-b`, `planner-c` and `other-cache` remain, `clients.claim` called.
  - **Review focus 2** `navigation is answered with cached index.html`: request `{ method: 'GET', mode: 'navigate', url: 'https://app.test/expenses' }` with `/index.html` cached and fetch rejecting (offline) resolves to the cached index response.
  - `navigation falls back to network when index.html is not cached`.
  - `asset cache hit does not touch the network`.
  - `asset miss fetches then caches a 200 basic response`.
  - **Review focus 3** `404 and opaque responses are not cached`: a `{ status: 404, type: 'basic' }` and a `{ status: 200, type: 'opaque' }` response are returned to the page but absent from the cache afterwards.
  - `asset url with a query string misses the cache and goes to the network`.
  - `non-GET and cross-origin requests are not handled`: for a `POST` and for `https://other.test/x.js`, `respondWith` is never called.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest tests/pwa/serviceWorker.test.ts`
Expected: FAIL with "Cannot find module '../../scripts/pwa/service-worker'".

- [ ] **Step 3: Implement `buildServiceWorker`**

Return a template string implementing the behaviour above. Embed values with `JSON.stringify` so quoting is safe.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest tests/pwa/serviceWorker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/pwa/service-worker.js tests/pwa/serviceWorker.test.ts
git commit -m "feat(pwa): service worker source generator"
```

---

### Task 3: Post-build glue script

**Files:**
- Create: `scripts/pwa-postbuild.js`
- Test: `tests/pwa/postbuild.test.ts`

**Interfaces:**
- Consumes: `buildPrecacheList` (Task 1), `injectHead` (Task 1), `colors` (Task 1), `buildServiceWorker` (Task 2).
- Produces: `buildPwa(distDir: string): { version: string; count: number; bytes: number }`, exported with `module.exports = { buildPwa }`. When run directly (`require.main === module`) it calls `buildPwa(path.join(__dirname, '..', 'dist'))`, prints `PWA: <count> files, <MB> MB, version <version>`, and exits 1 with the error message on any thrown error.

**Behaviour:**
- Lists files under `distDir` recursively (relative, forward slashes), excluding `sw.js`.
- Version = first 12 hex of SHA-256 over, for each file in sorted order, its path plus its bytes. `index.html` is hashed after head injection is applied in memory, and a previously injected `sw.js` is excluded, so repeated runs give the same version.
- Writes the injected `index.html` (idempotent) and `sw.js` into `distDir`.
- Throws `Error` when: `index.html` is missing or has no `<head>`; no `.wasm` file is in the list; the total byte size is above 25 MB (25 * 1024 * 1024); `manifest.webmanifest` is missing from the list (message mentions `public/`).

- [ ] **Step 1: Write the failing tests**

Each test builds a temp `dist` fixture under `os.tmpdir()` (`fs.mkdtempSync`) with `index.html` (with a `<head>`), `_expo/static/js/web/entry-1.js`, `assets/sql.wasm`, `manifest.webmanifest`, `icons/icon-192.png`, and removes it afterwards.
  - `writes sw.js listing every file but not itself`: after `buildPwa`, `sw.js` exists and contains `/assets/sql.wasm` and `/index.html` and not `"/sw.js"`.
  - `injects head tags into index.html`.
  - **Review focus 4** `second run does not duplicate tags and keeps one manifest link`: run twice; `index.html` contains exactly one `rel="manifest"`.
  - **Review focus 5** `version is identical across runs on unchanged files` and `version changes when a file's bytes change`.
  - `fails without a wasm file`, `fails when index.html has no <head>`, `fails when the manifest is missing` (message matches `/public\//`), and `fails above 25 MB` (write one 26 MB buffer file).

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest tests/pwa/postbuild.test.ts`
Expected: FAIL with "Cannot find module '../../scripts/pwa-postbuild'".

- [ ] **Step 3: Implement `buildPwa` and the CLI wrapper**

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest tests/pwa`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/pwa-postbuild.js tests/pwa/postbuild.test.ts
git commit -m "feat(pwa): post-build step writing sw.js and injecting head tags"
```

---

### Task 4: Manifest and icons

**Files:**
- Create: `scripts/generate-icons.js`, `public/manifest.webmanifest`, `public/icons/icon-180.png`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/icon-maskable-512.png`
- Modify: `assets/icon.png` (1024x1024), `assets/favicon.png` (48x48), `package.json` (devDependency `@resvg/resvg-js`)
- Test: `tests/pwa/manifest.test.ts`

**Interfaces:**
- Produces: static files only. The post-build step (Task 3) requires `public/manifest.webmanifest` to reach `dist/`.

**Decisions:**
- Install with `npm install --save-dev @resvg/resvg-js`.
- `generate-icons.js` is run by hand (`node scripts/generate-icons.js`) and writes every PNG above. It draws one SVG: a rounded-square tile filled `#2DB368` with a white calendar page (a header band, a few date dots) and a coin glyph (circle with a currency mark) in the lower right. Sizes: 180, 192, 512 and a maskable 512 (full-bleed `#2DB368` square with the glyph scaled to fit inside the central 80%), plus 1024 for `assets/icon.png` and 48 for `assets/favicon.png`. The glyph geometry is the implementer's choice; the result must be recognisable at 180px.
- `public/manifest.webmanifest` content: `name` and `short_name` `Planner`; `start_url` `/`; `scope` `/`; `display` `standalone`; `orientation` `portrait`; `background_color` `#F0F7F2`; `theme_color` `#2DB368`; `icons`: 192 (`purpose` `any`), 512 (`any`), maskable 512 (`purpose` `maskable`), each with `src`, `sizes`, `type` `image/png`.

- [ ] **Step 1: Write the failing test** `tests/pwa/manifest.test.ts`
  - `manifest identity`: parsed JSON has `name === 'Planner'`, `short_name === 'Planner'`, `display === 'standalone'`, `start_url === '/'`.
  - `manifest colours match the theme`: `background_color === colors.light.background` and `theme_color === colors.light.primary` (imported from `src/constants/theme`).
  - `every declared icon exists with its declared size`: for each manifest icon, read the file under `public/` and check PNG signature plus width and height from the IHDR chunk (bytes 16 to 23) equal `sizes`; also `public/icons/icon-180.png` is 180x180, `assets/icon.png` 1024x1024, `assets/favicon.png` 48x48.
  - `includes a maskable icon`.

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest tests/pwa/manifest.test.ts`
Expected: FAIL (missing `public/manifest.webmanifest`).

- [ ] **Step 3: Install the devDependency, write the script and manifest, run the script**

Run: `npm install --save-dev @resvg/resvg-js` then `node scripts/generate-icons.js`. Open `public/icons/icon-180.png` and `icon-maskable-512.png` with the Read tool and confirm the glyph is visible, centred and not clipped.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest tests/pwa`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-icons.js public assets/icon.png assets/favicon.png package.json package-lock.json tests/pwa/manifest.test.ts
git commit -m "feat(pwa): manifest and generated Planner icons"
```

---

### Task 5: Registration, deploy wiring, docs and real-build check

**Files:**
- Create: `src/lib/registerServiceWorker.ts` (native no-op), `src/lib/registerServiceWorker.web.ts`
- Modify: `app/_layout.tsx`, `vercel.json`, `README.md`, `ARCHITECTURE.md`, `DEVELOPMENT.md`, `PROJECT_LOG.md`

**Interfaces:**
- Produces: `registerServiceWorker(): void` exported from both lib files (same signature, like `confirm.ts`/`confirm.web.ts`).
- Consumes: the `/sw.js` file written by Task 3.

**Decisions:**
- Web version: when `process.env.NODE_ENV === 'production'`, `typeof navigator !== 'undefined'` and `'serviceWorker' in navigator`, register `/sw.js` with scope `/` inside a `window` `load` listener (or immediately when `document.readyState === 'complete'`). Registration failures are caught and passed to `console.warn`; nothing is thrown. Native version does nothing.
- `app/_layout.tsx`: call `registerServiceWorker()` once in a mount `useEffect` placed before the DB init effect. It must not gate rendering.
- `vercel.json`: `buildCommand` becomes `npx expo export --platform web && node scripts/pwa-postbuild.js`. Add header rules, keeping the existing `/(.*)` rule: `/sw.js` gets `Cache-Control: no-cache`, and `/manifest.webmanifest` gets `Content-Type: application/manifest+json`.
- Docs: README gets an "Install on iPhone" section (Safari Share, Add to Home Screen, name Planner, offline and silent-update behaviour, and the warning that the home-screen app has its own storage so use Settings, Backup, export then import once). ARCHITECTURE gets the PWA layer (public files, post-build step, worker contract: cache-first assets, navigation to cached index.html, atomic install, two cache generations, `skipWaiting`/`clients.claim`). DEVELOPMENT gets how to regenerate icons and how to run `npx expo export --platform web && node scripts/pwa-postbuild.js` locally. PROJECT_LOG gets history entry 24 for this build, a section 7 manual-check block (the five checks in the spec's Verification section) and the Safari-versus-home-screen storage risk.

- [ ] **Step 1: Write the registration modules and the layout call, and update `vercel.json`**

- [ ] **Step 2: Verify typecheck, lint and tests**

Run: `npx tsc --noEmit`, `npx expo lint`, `npx jest`
Expected: all clean; every suite passes.

- [ ] **Step 3: Run the real build and inspect it**

Run: `npx expo export --platform web && node scripts/pwa-postbuild.js`
Expected: the script prints `PWA: <n> files, <x> MB, version <12 hex>` with `x` below 25. Then check:
  - `dist/manifest.webmanifest` and `dist/icons/icon-180.png` exist. **If Expo did not copy `public/` into `dist/` in this output mode**, the post-build step has already failed with the `public/` message: fix it by having `buildPwa` first copy `public/` into `distDir` (add a test for it in `postbuild.test.ts`), then rerun.
  - `dist/index.html` contains one `rel="manifest"`, the apple tags and both `theme-color` metas.
  - `dist/sw.js` contains the `.wasm` path and `/index.html`.
  - Running the script a second time prints the same version.

- [ ] **Step 4: Update the four docs as described, then re-run `npx jest`**

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib app/_layout.tsx vercel.json README.md ARCHITECTURE.md DEVELOPMENT.md PROJECT_LOG.md
git commit -m "feat(pwa): register service worker, deploy wiring and docs"
```
