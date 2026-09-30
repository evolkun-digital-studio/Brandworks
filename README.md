# BRANDWORKS

Two applications in one repository:

| Directory | What it is | Details |
| --- | --- | --- |
| [`Brandworks/`](Brandworks/README.md) | Frontend — React 19, Vite, TypeScript. A static single-page app. | [Brandworks/README.md](Brandworks/README.md) |
| [`backend/`](backend/README.md) | Backend — Node.js, Express, TypeScript, MongoDB. Admin CMS and public blog/SEO API. | [backend/README.md](backend/README.md) |

Each has its own `package.json`, lockfile and `.env`. For local development,
run `npm install` and `npm run dev` in each.

## Production deployment

Production runs on cPanel. GitHub is the source of truth: GitHub Actions
builds both applications and ships them over SSH with rsync. Nothing is
pulled from git on the server, and there is no Docker.

### Architecture

```
https://<site domain>         Apache serves static files
  /home/<user>/public_html/     index.html, assets/, video/, .htaccess

https://<API domain>          Apache + Passenger run the Node.js app
  /home/<user>/apps/backend/    dist/, package.json, passenger.cjs,
                                .env (server only), node_modules/, tmp/

/home/<user>/deployment-backups/   the 5 most recent previous releases
/home/<user>/apps/.deploy/         deployctl.sh (uploaded by each deploy)
```

The site and API domains are not stored in this repository. The API origin
comes from the `VITE_API_URL` secret and the site origin from the backend's
`.env` (and, optionally, the `PRODUCTION_URL` variable).

### Pipeline

| Workflow | Trigger | What it does |
| --- | --- | --- |
| [`ci.yml`](.github/workflows/ci.yml) | Pull request to `main` | Frontend and backend: `npm ci`, lint, typecheck, test, build. Never deploys. |
| [`deploy.yml`](.github/workflows/deploy.yml) | Push to `main`, or run manually from `main` | Runs CI, then deploys the artifacts that CI run built. |
| [`rollback.yml`](.github/workflows/rollback.yml) | Manual | Restores a backup. |

A deploy, in order: verify the artifacts → connect over SSH → preflight →
back up current production → rsync the frontend → rsync the backend →
`npm ci --omit=dev` on the server → restart → health check → record the
release and prune old backups. Any failing step stops the run. If production
has already been changed at that point, the backup is restored automatically.

Only one deployment runs at a time; a newer push to `main` replaces one still
in progress.

### GitHub configuration

Repository **secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| `CPANEL_HOST` | Server hostname or IP used for SSH. |
| `CPANEL_USERNAME` | cPanel account name. Paths are built as `/home/<this>/…`. |
| `CPANEL_PORT` | SSH port (many hosts do not use 22). |
| `CPANEL_SSH_KEY` | Private key of a dedicated deploy key pair, **without a passphrase**. |
| `VITE_API_URL` | The API origin, e.g. `https://api.example.com`. `https://` only, no trailing `/api`. Compiled into the frontend and used for the post-deploy health check. |
| `CPANEL_KNOWN_HOSTS` | Optional. The server's `known_hosts` line(s), to pin its host key instead of fetching it with `ssh-keyscan` on every run. |

Optional repository **variables** (same page, Variables tab):

| Variable | Value |
| --- | --- |
| `PRODUCTION_URL` | The site origin, e.g. `https://example.com`. Enables the post-deploy frontend check. |
| `CPANEL_NODE_BIN_DIR` | Directory on the server containing `node` and `npm`, only if the deploy cannot find them itself. |
| `VITE_GA_MEASUREMENT_ID`, `VITE_CLARITY_PROJECT_ID`, `VITE_GTM_CONTAINER_ID`, `VITE_META_PIXEL_ID`, `VITE_GSC_VERIFICATION` | Analytics identifiers compiled into the frontend. Each provider stays off while its variable is unset. |

The backend's production settings are **not** in GitHub. They live in one
file on the server: `/home/<user>/apps/backend/.env`. The pipeline never
reads, uploads, overwrites or deletes it. See
[`backend/.env.example`](backend/.env.example) for the variables.

### One-time cPanel setup

Do these once, in this order, before the first deploy.

1. **SSH access.** Generate a key pair (`ssh-keygen -t ed25519 -N "" -f brandworks_deploy`),
   import and authorize the public key under *SSH Access → Manage SSH Keys*,
   and store the private key as `CPANEL_SSH_KEY`.
2. **API subdomain.** Create it with a document root **outside**
   `public_html` (for example `~/api.example.com`), and make sure it has an
   SSL certificate. A document root inside `public_html` would inherit the
   frontend's `.htaccess` and break the API.
3. **Node.js application** (*Setup Node.js App*): Node.js 22 (20.19 or newer),
   mode *Production*, application root `apps/backend`, application URL the
   API subdomain, startup file `passenger.cjs`.
4. **Environment file.** Create `~/apps/backend/.env` (`chmod 600`) with
   `NODE_ENV=production`, `FRONTEND_ORIGIN`, `PUBLIC_ORIGIN`, `MONGODB_URI`
   and `JWT_SECRET`. The server refuses to start if a required one is missing.
5. **Database access.** The backend needs a MongoDB it can reach from the
   server. With a hosted database, allow the server's IP there, and confirm
   the host permits outbound connections on the MongoDB port.
6. **HTTPS.** Turn on *Force HTTPS Redirect* for both domains.
7. **Deploy** (push to `main`), then create the first admin account over SSH:
   `cd ~/apps/backend && node dist/scripts/createAdmin.js` (activate the
   Node.js environment first — cPanel shows the command on the application's
   page).

`public_html/.htaccess` comes from [`Brandworks/public/.htaccess`](Brandworks/public/.htaccess)
and is replaced on every deploy. Rules added through cPanel tools that edit
that file (Redirects, Hotlink Protection) will be lost; add them to the file
in the repository instead.

Anything else already in `public_html` — `.well-known`, `cgi-bin`, other
sites — is left alone. A deploy only replaces or removes entries that a
deploy created.

### Day-to-day

**Deploy manually.** Actions → *Deploy* → *Run workflow* → branch `main`.

**Check backend health.**

```bash
curl https://<API domain>/api/health
# {"status":"ok","server":"running","mongodb":"connected","environment":"production","commit":"<sha>","uptime":123,...}
```

`200` with `"status":"ok"` means the process is up and MongoDB is reachable;
`503` with `"degraded"` means the database is not. `commit` is the deployed
commit.

**Restart the backend.** Over SSH:

```bash
mkdir -p ~/apps/backend/tmp && touch ~/apps/backend/tmp/restart.txt
```

or use *Restart* on the application's page in cPanel. Required after editing
`.env`.

**Roll back.** Actions → *Rollback* → *Run workflow*. Leave the backup id
empty to undo the latest deployment, or enter an id to restore an older one.
The same thing over SSH:

```bash
bash ~/apps/.deploy/deployctl.sh list        # backups, newest first
bash ~/apps/.deploy/deployctl.sh rollback    # restore the most recent
bash ~/apps/.deploy/deployctl.sh rollback 20260101-120000-abc1234
```

A rollback restores the frontend and backend files, reinstalls dependencies
and restarts. It does not touch `.env`, uploads or the database, and it does
not change the repository: revert or fix the commit on `main` before the
next push, or that push deploys it again.

**Logs.** Passenger writes the backend's output to the log file set for the
application in cPanel (the *Passenger log file* field — set one if it is
empty). Lines are prefixed `INFO`, `WARN` or `ERROR`.

### Database

Deploys never drop, reset, seed or migrate the database. The backend creates
its indexes at startup, which is safe to repeat. There is no migration
system; a change that needs existing data rewritten must be run by hand and
is not part of this pipeline.

### Known gaps

- **Frontend tests skipped in CI.** `src/videoPerformance.test.ts`,
  `src/imagePerformance.test.ts`, `src/App.test.tsx` and
  `src/seoAudit.test.ts` assert on component source that has since been
  redesigned, and fail. CI skips these four by name (see `ci.yml`); every
  other test file gates the deploy. Update or delete them, then remove the
  matching `--exclude` line.
- **`backend/Kinikh IVR/`** is a separate Python project that happens to
  live in this repository. It is not built, tested or deployed by any
  workflow here.
