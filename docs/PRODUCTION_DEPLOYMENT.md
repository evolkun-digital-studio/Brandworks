# BrandWorks: production deployment (Next.js 16 standalone)

How to build, package, configure and run the Next.js site on the WHM/cPanel
VPS, behind Apache, as the unprivileged `brandworks` user. This document
prepares the deployment; it does not change Apache, WHM or the old Vite site.

## 1. Requirements

| | |
|---|---|
| Node.js | **22.x** on the server (22.23.1 targeted; `engines` requires >= 22.12). `.nvmrc` pins 22.23.1 for CI. |
| OS / CPU | Linux x64. `argon2` (admin passwords) and `sharp` (image optimisation) ship native binaries, so **the release must be built on Linux x64**, e.g. GitHub Actions `ubuntu-latest`. A release built on macOS fails at the first admin login. `build:release` refuses to package for the wrong platform. |
| MongoDB | Reachable from the server (`MONGODB_URI`). |
| Media | Cloudflare R2 (`STORAGE_PROVIDER=r2`). `local` storage writes into the release directory and is lost on every deploy. |
| Reverse proxy | Apache with HTTPS, proxying to `127.0.0.1:3010`. |

## 2. Build and package

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build:release      # runs `next build`, then packages and validates
```

`next.config.ts` sets `output: 'standalone'`, so `next build` produces
`.next/standalone/server.js` with only the `node_modules` the server actually
uses. `scripts/build-release.mjs` then:

1. checks the platform (linux/x64 by default; `TARGET_PLATFORM`/`TARGET_ARCH` to override) and warns if Node is not 22.x;
2. runs `next build` (skip with `--skip-build`);
3. verifies `server.js`, `.next/static`, `.next/BUILD_ID` and `public/` exist;
4. assembles `dist/release/brandworks-next-<sha>/`: standalone server + `.next/static` + `public/` + `scripts/smoke-test.mjs`;
5. strips `.env*`, source maps, `.git`, `.next/cache` and key files;
6. validates the release:
   - required files are present, and no TypeScript sources, `dist/`, `scratch/` or `docs/` were traced in;
   - the native `argon2` binary for the target platform (and `sharp`'s, when building on it) is included;
   - the server's external dependencies (`mongodb`, `@aws-sdk/client-s3`, Next's server, plus `argon2`/`sharp` on the target platform) actually **load** from inside the release;
   - no server-only variable name (`MONGODB_URI`, `JWT_SECRET`, `R2_SECRET_ACCESS_KEY`, AI keys…) appears in browser JavaScript;
   - no secret *value* present in the build environment appears in any file;
7. writes `release.json` (commit, branch, dirty flag, build id, Node/platform, Next version);
8. creates `dist/brandworks-next-<sha>.tar.gz` and a `.sha256` checksum.

If any validation fails, nothing is packaged and the script exits non-zero.

**Why the load check exists.** Next's file tracer missed two runtime files
during this work, and both only showed up when the packaged server ran:
`argon2`'s native binary (loaded dynamically, so admin login crashed) and
`@mongodb-js/saslprep`'s `dist/` (so every database call failed with a 500).
Both are now forced in through `outputFileTracingIncludes` in
`next.config.ts`. Any future miss of this kind fails the release instead of
production.

`--allow-platform-mismatch` exists only for local dry runs on a Mac. The
result is marked `"deployable": false` in `release.json` and must never be
deployed.

### Release contents

```text
brandworks-next-<sha>/
├── server.js            # entry point
├── package.json
├── release.json         # commit + build metadata (read by /api/health)
├── .next/               # server bundle, BUILD_ID, static/ (hashed assets)
├── public/              # images, fonts, favicons
├── node_modules/        # traced runtime dependencies only (incl. argon2, sharp)
└── scripts/smoke-test.mjs
```

No `.env` files, no secrets, no source maps, no dev toolchain.

## 3. Environment variables

Template: [`.env.production.example`](../.env.production.example) (placeholders
only; it marks every variable as runtime or build-time).

**Runtime** variables live in one file outside the releases, owned by
`brandworks`, mode `600`:

```text
/home/brandworks/apps/brandworks-next/shared/production.env
```

Required to boot healthy:

| Variable | Notes |
|---|---|
| `NODE_ENV=production` | |
| `PORT=3010`, `HOSTNAME=127.0.0.1` | Loopback only; Apache is the public entry point. Both are configurable. |
| `PUBLIC_ORIGIN=https://brandworks.me` | Origin only. robots.txt / sitemap.xml return 500 without it. |
| `MONGODB_URI` | Optional `MONGODB_SERVER_SELECTION_TIMEOUT_MS` (default 10000): how long a request waits for the database before failing, instead of the driver's 30 s. |
| `JWT_SECRET` | **≥ 32 random characters** in production, otherwise admin login is refused. |
| `STORAGE_PROVIDER=r2` + `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` | Media library uploads. |

Recommended: `TRUSTED_PROXY_HOPS=1` (the default: one Apache hop; see §6).

**Build-time** variables must be set in the GitHub Actions build step,
because `next build` inlines them into the bundle:

- `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GTM_CONTAINER_ID`,
  `NEXT_PUBLIC_CLARITY_PROJECT_ID`, `NEXT_PUBLIC_META_PIXEL_ID`,
  `NEXT_PUBLIC_GSC_VERIFICATION`, `NEXT_PUBLIC_MEDIA_BASE_URL`,
  `NEXT_PUBLIC_EVOLKUN_URL`: public identifiers only, never secrets.
- `R2_PUBLIC_URL`: also read by `next.config.ts` at build time to allow
  `next/image` to load from the bucket. Set it in **both** places.

Do **not** pass server secrets to the build step. They are not needed there,
and `build:release` fails if one ends up in the bundle.

Never set `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_APP_RUNTIME`; they belong
to the legacy Vite build only.

## 4. Server layout and start-up

```text
/home/brandworks/apps/brandworks-next/
├── releases/
│   ├── brandworks-next-<sha-1>/
│   └── brandworks-next-<sha-2>/
├── shared/
│   └── production.env          # chmod 600, owner brandworks
└── current -> releases/brandworks-next-<sha-2>
```

Start command (from the release directory, which must be the working
directory so `release.json` and `public/` resolve):

```bash
cd /home/brandworks/apps/brandworks-next/current
node server.js
```

Example systemd unit (reference only; not installed by this phase):

```ini
[Unit]
Description=BrandWorks Next.js
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=brandworks
Group=brandworks
WorkingDirectory=/home/brandworks/apps/brandworks-next/current
EnvironmentFile=/home/brandworks/apps/brandworks-next/shared/production.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=read-only
ReadWritePaths=/home/brandworks/apps/brandworks-next/current/.next/cache

[Install]
WantedBy=multi-user.target
```

`ExecStart` must point at the Node 22 binary (`which node` as `brandworks`).
`.next/cache` is where `next/image` stores optimised images; it must be
writable and is rebuilt on demand after each deploy.

## 5. Health checks and smoke test

`GET /api/health` (and `HEAD`) returns **200** only when all critical checks
pass, otherwise **503**. Responses are `Cache-Control: no-store`.

```json
{ "status": "ok", "server": "running", "mongodb": "connected",
  "publicOrigin": "configured", "adminAuth": "configured",
  "environment": "production", "commit": "<sha>", "uptime": 42, "timestamp": "…" }
```

| Field | 503 when |
|---|---|
| `mongodb` | ping fails or takes > 3 s |
| `publicOrigin` | `PUBLIC_ORIGIN` missing/invalid in production |
| `adminAuth` | `JWT_SECRET` missing, or shorter than 32 characters in production |

Only pass/fail is reported; no value or connection string is ever exposed.

Smoke test (read-only, no credentials; exits 1 on any failure):

```bash
# On the server, against the Node port, before switching Apache:
node scripts/smoke-test.mjs http://127.0.0.1:3010 --expect-origin https://brandworks.me
# After the switch, through Apache:
node scripts/smoke-test.mjs https://brandworks.me
```

It checks: home page and security headers, `/api/health` (GET and HEAD),
`/robots.txt`, `/sitemap.xml` (only `https://brandworks.me` URLs, no admin or
API URLs), `/about`, `/services`, `/blog`, `/news`, one published article,
`/api/blogs`, that `/admin/login` loads with `noindex`, that admin APIs return
401 without a session, and that unknown routes return 404.

## 6. Reverse proxy expectations (Apache)

To configure later; nothing here is applied by this phase.

- Proxy `https://brandworks.me/` to `http://127.0.0.1:3010/` with
  `ProxyPreserveHost On`.
- Send `RequestHeader set X-Forwarded-Proto "https"`. Next.js keeps the proxy's
  `X-Forwarded-Proto` / `X-Forwarded-Host` and only fills them in when absent.
- mod_proxy **appends** the client address to `X-Forwarded-For`. Rate limiting
  (admin login, questionnaire, AI assistant, site scans) reads the **last**
  `TRUSTED_PROXY_HOPS` entry, so clients cannot spoof their IP by sending their
  own header. If another proxy (e.g. Cloudflare) is added in front of Apache,
  raise `TRUSTED_PROXY_HOPS` accordingly. `X-Real-IP` is ignored.
- Streaming endpoints (`/api/questionnaire/*/stream`) use server-sent events.
  Apache must not buffer them: add `flushpackets=on` to the `ProxyPass` line
  and keep `mod_deflate` off `text/event-stream`.

## 7. Deploying and rolling back

Deploy (GitHub Actions → SSH/rsync):

1. Upload `brandworks-next-<sha>.tar.gz` and verify its `.sha256`.
2. Extract into `releases/brandworks-next-<sha>/` as `brandworks`.
3. Start the new release on a spare port and run the smoke test against it,
   or restart in place and run it immediately.
4. Atomically repoint `current`: `ln -sfn releases/brandworks-next-<sha> current.tmp && mv -Tf current.tmp current`.
5. `systemctl restart brandworks-next` (or the chosen unit name).
6. Run the smoke test through Apache. If it fails, roll back.

Rollback: repoint `current` to the previous release directory and restart.
Releases are immutable and self-contained, and `shared/production.env` is
outside them, so rollback needs no rebuild. Keep the last 3–5 releases.

Database changes are **not** rolled back by this. No migration runs during
deploy; `npm run cms:migrate-editorial` and `npm run media:seed` are manual,
one-off commands, run from a full checkout, not from a release.

## 8. Known remaining risks

| Risk | Impact | Mitigation / next step |
|---|---|---|
| No Content-Security-Policy | XSS impact is not contained by the browser | GTM, GA4, Clarity and Meta Pixel inject scripts; roll out a CSP in `Content-Security-Policy-Report-Only` first, then enforce. |
| Rate limits are in-memory, per process | Reset on restart; not shared across instances | Fine for one systemd process. Move to a shared store (Mongo/Redis) before running more than one instance. |
| `src/server/storage/index.ts` and the site-scan collectors read secrets but have no `server-only` guard (the `tsx` CLI jobs import them, and `server-only` throws outside Next) | A future client import could pull them into the browser | `build:release` fails if a server-only variable name appears in browser JavaScript. |
| Session cookie fixed at 8h | `JWT_EXPIRES_IN` above 8h has no effect | Documented; align both if longer sessions are wanted. |
| 37 pre-existing unit-test failures in 14 files (analytics ×7, App, Header, media, SEO-audit, image/video performance, Performance Marketing page) | Tests out of date with content changes made during the redesign | All fail identically on the commit before this work; none are in auth, API, SEO routes, health or release code. Update or retire them. |
| 81 pre-existing ESLint errors in UI components: 79 React Compiler rules (`react-hooks/set-state-in-effect` 42, `refs` 23, `immutability` 11, `purity` 2, `preserve-manual-memoization` 1), plus 1 `react/no-unescaped-entities` and 1 `react-refresh/only-export-components` | `npm run lint` exits non-zero. Next 16's `next build` does not run ESLint, so they do not block builds | Fixing them means restructuring component logic, which is out of scope for this phase. Server, API, script and config code is lint-clean. Fix per component with visual checks. |
| Native binaries are platform-specific | A release built on macOS cannot log admins in on Linux | `build:release` refuses a platform mismatch; build in CI on `ubuntu-latest` with Node 22. npm 11 skips `argon2`'s install script unless approved, which is fine: it loads its bundled prebuilt binary. |
| Scheduled publishing is not automated | Scheduled posts publish only when `npm run jobs:publish-due` runs (see `src/server/jobs/README.md`) | Add a cron/systemd timer for it. It needs a full checkout with `tsx`, not the standalone release. `/api/admin/jobs/publish-due` only reports the job's last run. |
| HSTS sent without `includeSubDomains`/`preload` | Subdomains are not covered | Intentional, because other apps share the server. Revisit once every subdomain is HTTPS. |
