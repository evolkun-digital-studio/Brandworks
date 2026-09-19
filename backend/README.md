# BRANDWORKS Backend

A standalone Node.js + Express + TypeScript API (ESM/NodeNext), separate from
the Vite/React frontend in the repo root. MongoDB-backed, with authenticated
admin CMS endpoints, a public read-only blog API, and public SEO
infrastructure (`/sitemap.xml`, `/robots.txt`).

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in the real values (MONGODB_URI, JWT_SECRET, ...)
```

## Scripts

```bash
npm run dev         # start in watch mode (tsx)
npm run build       # type-check (incl. tests) + compile to dist/ (tests excluded from dist)
npm run start       # run the compiled server (after build)
npm run typecheck   # tsc --noEmit
npm run lint         # oxlint
npm test             # vitest run
npm run admin:create # bootstrap the first (primary) admin account
npm run blog:verify  # dev-only data-layer verification script (never run against real data)
```

## Environment variables

See `.env.example` for the full, current list with inline explanations. Summary:

| Variable          | Purpose                                                              | Default in dev            |
| ----------------- | ---------------------------------------------------------------------- | --------------------------- |
| `PORT`            | Port the Express server listens on                                     | `4001`                      |
| `NODE_ENV`         | `development` \| `production` \| `test`                                | `development`                |
| `FRONTEND_ORIGIN`  | Comma-separated CORS-allowed origin(s)                                  | `http://localhost:5173`     |
| `MONGODB_URI`      | MongoDB connection string. **Required** — server refuses to start without it. | *(none — required)*   |
| `JWT_SECRET`       | Signs admin session JWTs. **Required.**                                 | *(none — required)*         |
| `JWT_EXPIRES_IN`   | Admin session lifetime                                                  | `8h`                         |
| `PUBLIC_ORIGIN`    | The public **website's** own origin — used to build canonical/sitemap URLs (see "Production deployment" below). Optional in dev (falls back to the first `FRONTEND_ORIGIN`); **required** when `NODE_ENV=production` — the server refuses to start in production without it. | falls back to `FRONTEND_ORIGIN` |

> `4000` was already in use by an unrelated process on the machine this was
> originally set up on, so the default here is `4001`.

## Endpoints

Public (no auth):
- `GET /api/health` — liveness check.
- `GET /api/blogs` / `GET /api/blogs/:slug` — published blog posts only (Phase 3 visibility rules: `status=published`, `publishedAt<=now`, `deletedAt=null`).
- `GET /sitemap.xml` — deterministic sitemap of the static public pages plus every sitemap-eligible published post.
- `GET /robots.txt` — deterministic robots directives; always points crawlers at `${PUBLIC_ORIGIN}/sitemap.xml`.

Authenticated (admin session cookie, mounted under `/api/admin`):
- `/api/admin/auth/*` — login/logout/session.
- `/api/admin/users/*` — admin/sub-admin account management.
- `/api/admin/blogs/*` — full blog CRUD + publish/unpublish/status workflow.
- `/api/admin/profile` — the current admin's own profile.

## Structure

```
backend/
├── src/
│   ├── server.ts        # process entrypoint, starts the HTTP listener
│   ├── app.ts            # Express app assembly (middleware + routes)
│   ├── routes/            # route definitions — /api/* and the root-mounted seo.routes.ts
│   ├── controllers/       # request handlers
│   ├── services/          # business logic (admin auth, blog, sitemap)
│   ├── repositories/       # MongoDB data access
│   ├── middleware/         # cross-cutting Express middleware (cors, auth, rate limiting)
│   ├── lib/                # small pure utilities (xml, robots, slugify, validators, jwt, ...)
│   └── config/             # env var loading/typing, MongoDB connection
├── .env / .env.example
├── package.json
├── tsconfig.json          # includes tests, used for typecheck
└── tsconfig.build.json    # excludes *.test.ts, used for the production build
```

## Production deployment

### Two origins, one public identity

This project always runs as two separate processes: this backend (any host/port
— `4001` is only the local development default) and the Vite-built frontend
(served as static files from wherever you deploy them). They must be
configured so the **public origin** — the domain a visitor and a search
engine actually see — is always the frontend's own domain, never this
backend's:

- Frontend build: set `VITE_API_BASE_URL` (frontend's own `.env`, see the repo
  root `.env.example`) to this backend's real origin, e.g.
  `https://api.example.com`.
- This backend: set `PUBLIC_ORIGIN` to the **frontend's** real public origin,
  e.g. `https://www.example.com` — never this backend's own origin (the
  server actively refuses to start if `PUBLIC_ORIGIN` resolves to its own
  `host:PORT`). `PUBLIC_ORIGIN` is used only to build the absolute URLs
  inside `/sitemap.xml` and the `Sitemap:` line of `/robots.txt` — it has no
  effect on CORS or routing.
- This backend: set `FRONTEND_ORIGIN` to the same real frontend origin (this
  one *does* control CORS — the admin panel's browser requests are only
  allowed from origins listed here).

(`https://www.example.com` / `https://api.example.com` above are illustrative
placeholders — never commit real production domains into this repo; they
belong in each environment's own `.env`, never in `.env.example`.)

### `/sitemap.xml` and `/robots.txt` must be reachable at the public origin

Both are generated by **this backend** (Phase 9 — it has the authoritative
MongoDB access needed to know which posts are actually publishable), which
means they're served from this backend's own origin/port by default — e.g.
`https://api.example.com/sitemap.xml`. Search engines, however, expect to
find them at the **frontend's** public origin:

```
https://www.example.com/sitemap.xml
https://www.example.com/robots.txt
```

Getting URLs to resolve there is a **deployment/reverse-proxy responsibility,
not something this codebase does automatically** — no such proxy is
implemented here (deliberately out of scope, see the Phase 9/13 reports).
Whatever serves the frontend's static files in production must route just
these two paths through to this backend, e.g. an Nginx rule:

```nginx
location = /sitemap.xml { proxy_pass http://127.0.0.1:4001/sitemap.xml; }
location = /robots.txt  { proxy_pass http://127.0.0.1:4001/robots.txt; }
```

or the equivalent rewrite/redirect rule on whatever platform hosts the
frontend (Cloudflare Page Rules, Vercel/Netlify rewrites, an API gateway,
etc.). Without this rule, `https://www.example.com/sitemap.xml` 404s, even
though the backend itself is serving valid sitemap content at its own origin.
**The backend's own port must never be the origin search engines see** — the
proxy is what keeps that true.
