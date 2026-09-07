# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A SignalK server plugin (`signalk-advanced-maintenance-tracker`) that tracks recurring boat
maintenance by engine-hours and/or calendar intervals. It ships both a Node/TypeScript
backend (the plugin + REST API) and a buildless Preact webapp served from `public/`.

`docs/specification.md` is the authoritative design doc; `src` and `public/app` code
comments reference its sections (e.g. `§8.1`, `§6.2`). Consult it when a change touches
data model, status logic, API shape, or auth.

## Commands

```sh
npm install                     # backend deps
npm --prefix frontend install   # dev-only tooling (typecheck, tests, vendoring); its own lockfile
npm run build                   # tsc → dist/ (BACKEND ONLY — the webapp has no build step)
npm run watch:backend           # tsc -w; restart the plugin from the SignalK admin UI to pick up changes

npm test                        # backend (vitest) + frontend (vitest) — what CI runs
npm run test:backend            # vitest run over src/**/*.test.ts
npm run test:frontend           # vitest run in frontend/ over frontend/test/**/*.test.js
npm --prefix frontend exec vitest run frontend/test/slug.test.js   # a single frontend test file
npx vitest run src/domain/status.test.ts                            # a single backend test file

npm run typecheck:frontend      # tsc --checkJs over public/app (JSDoc types, no emit)
npm run lint                    # eslint over src/, public/app/, frontend/ tooling
npm run format                  # eslint --fix + prettier --write (fix everything)
npm run format:check            # eslint + prettier --check — what CI enforces; run before committing

npm --prefix frontend run vendor  # re-copy pinned deps into public/vendor/ after bumping frontend/package.json
npm run icons                     # regenerate PWA icons
```

A husky pre-commit hook runs lint-staged (auto-fix + format-check on staged files only).
Requires **Node ≥ 22.5**; CI and releases pin **Node 24** (the built-in `node:sqlite` is
only unflagged from Node 24 on).

## Backend architecture (`src/`)

The plugin entrypoint is `src/index.ts` — a `export =` function returning the SignalK
plugin object (`start`/`stop`/`registerWithRouter`, `schema` from `src/config.ts`).
`start()` wires the object graph:

- **`db/database.ts`** opens `maintenance.db` in the plugin data dir and runs
  `db/migrations.ts` (a versioned list; append a new `{version, up}` entry, never edit
  an existing one). Repos in `db/*.repo.ts` are thin SQL wrappers over `node:sqlite`.
- **`MaintenanceService`** (`service.ts`) is the core: all task/log/tag/consumable
  business logic, validation (throws `ApiError`), and the denormalization invariant
  (see spec §5.6). It takes `ServiceDeps` — `getRuntime`, status config, an `onMutation`
  callback, and an optional `StowageClient`.
- **`domain/status.ts`** is a **pure** function computing every derived task field
  (remaining runtime/time, status `overdue|due soon|ok|pending|info`). No I/O — unit
  tested heavily. `domain/slug.ts` generates unique slugs (the external task ID).
- **`signalk/`** — `runtime.ts` subscribes to runtime paths and caches hours;
  `notifications.ts` publishes `notifications.maintenance.{slug}`; `paths.ts` publishes
  `maintenance.{slug}.*`. A `setInterval` in `index.ts` recomputes on a tick; mutations
  trigger `refresh()` immediately via `onMutation`.
- **`api/router.ts`** — `mountApi()` builds the Express routes under
  `/plugins/signalk-advanced-maintenance-tracker/api`. Handlers respond 503 until `start()` runs.
- **`stowage/client.ts`** — optional HTTP client for the `signalk-stowage-mgmt` plugin
  (inventory linking / stock decrement). Disabled when `stowageMgmtUrl` is blank.

**Auth (`src/auth.ts`):** the plugin does **no authorization of its own** — SignalK
gates the routes. `getRequestUser()` only reads the principal to stamp `logged_by`;
`publicUser()` truncates device-token UUIDs before they're serialized.

## Frontend architecture (`public/`)

**Buildless.** The files in `public/` are exactly what the browser runs — hand-written
ES modules + dependencies vendored (not bundled) under `public/vendor/`. No transpile,
no HMR: edit a `.js`/`.css` and reload. Browser floor is **Chromium 69** (Navico/B&G
MFDs) — no optional chaining in `public/`, check `frontend/tsconfig.json` lib target.

- `public/app/main.js` → `app.js` is the shell; `lib/router.js` is a hash router with a
  `route` signal; state is `@preact/signals`, markup is `htm` tagged templates (`html\`\``).
- `pages/` (TaskListPage, TaskDetailPage, MasterLogPage), `components/`, `lib/` helpers.
- `api/client.js` — `apiFetch()` wraps the plugin REST API, sends the session cookie,
  routes 401/403 into `auth/auth.js`.
- The frontend never talks to SignalK for domain/runtime data — only two read-only
  exceptions: auth (`/signalk/v1/auth/*`, `/skServer/loginStatus`) and runtime-path
  name discovery (`/signalk/v1/api/vessels/self`). See spec §2 non-goals.
- Tests live in `frontend/test/` (vitest + jsdom + `@testing-library/preact`), not
  alongside the source. `frontend/` is a dev-only package producing no runtime artifact.
- To bump a vendored dep: edit the pin in `frontend/package.json`, `npm --prefix
  frontend install`, then `npm --prefix frontend run vendor`.

## Commit conventions
Never add "Co-Authored-By" lines or any AI attribution to git commit messages or metadata.

## Releasing

Bump `version` in `package.json` **and** add a matching `# vX.Y.Z` section at the top of
`CHANGELOG.md` (heading must equal the tag exactly), commit, then `npm run release`
(tags + pushes). `publish.yml` extracts the CHANGELOG section into a GitHub Release and
publishes to npm via OIDC trusted publishing. `-alpha`/`-beta`/`-rc` tags go to the
matching npm dist-tag and are marked pre-release. Full checklist in `DEVELOPMENT.md`.
