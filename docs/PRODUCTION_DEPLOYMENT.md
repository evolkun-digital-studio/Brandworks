# Production deployment (standalone Next.js)

Target: **Linux x64 (glibc), Node.js 24.22.2**. The release is a
self-contained folder started with `node server.js`. No `npm install` runs
on the server.

This guide does not change any WHM, CloudLinux, Apache or Passenger
configuration, and does not touch other applications on the server. How
traffic reaches the Node process (reverse proxy, Passenger app, port) stays
whatever the hosting team already uses.

## Server requirements

- Node.js **24.22.2**, x64. Official Node 24 Linux builds need glibc ≥ 2.28
  (`ldd --version`), so CloudLinux 8 or newer.
- CPU with x86-64-v2 (needed by sharp's prebuilt libvips). Any x86-64 server
  CPU from the last decade has it.
- A MongoDB the server can reach, and the R2 bucket credentials.

## 1. Build the release

From a clean checkout of the commit being released:

```sh
nvm use                      # .nvmrc → 24.22.2
npm ci
# Build-time public values (inlined into the bundle; see .env.production.example §1)
set -a; . /secure/path/brandworks.build.env; set +a
npm run build:release
```

Output:

| Path | What |
|---|---|
| `dist/brandworks-next-<sha>.tar.gz` | the artifact to upload |
| `dist/brandworks-next-<sha>.tar.gz.sha256` | its checksum |
| `dist/release/brandworks-next-<sha>/` | unpacked copy, for inspection only |

`build:release` stages the release in a temp folder outside the repository
and refuses to package unless all of these hold:

- every production dependency loads from the release itself;
- every native binary is a Linux x86-64 ELF;
- argon2 ships only its `linux-x64` prebuild, never a local `build/`;
- sharp ships `@img/sharp-linux-x64` and `@img/sharp-libvips-linux-x64` at
  sharp's pinned versions, each verified against `package-lock.json`;
- there are no `.env*`, `.git`, keys or source maps in it;
- no server secret value set in the build environment appears in any file;
- the release boots and serves pages, static assets, `robots.txt`, the 404
  page and `/api/health` (scripts/smoke-release.mjs).

Building on a Linux x64 machine (for example a CI runner) is preferred: the
native modules are then also load-tested. Built on macOS, the script swaps
in the Linux binaries and prints a warning; run step 3 on the server before
switching traffic.

A `-dirty` suffix in the name means the working tree had uncommitted changes.
Do not deploy a dirty release.

## 2. Install on the server

```sh
cd /home/<account>/brandworks
sha256sum -c brandworks-next-<sha>.tar.gz.sha256
mkdir -p releases && tar -xzf brandworks-next-<sha>.tar.gz -C releases
```

Runtime environment: copy `.env.production.example` §2 to a file **outside**
`releases/` (for example `shared/.env.production`), fill it in, and run
`chmod 600` on it. Load it into the Node process the way the hosting setup
already does it (process manager env file, Passenger env, or
`set -a; . shared/.env.production; set +a`). The release never reads a `.env`
file from its own folder.

## 3. Verify before switching traffic

```sh
cd releases/brandworks-next-<sha>
set -a; . ../../shared/.env.production; set +a
node scripts/smoke-release.mjs . 3999     # boots on 127.0.0.1:3999, then stops
```

With the real environment, `/api/health` should return 200 with
`"mongodb":"connected"`. Then log in to `/admin` once (this exercises argon2)
and open a page with images (this exercises sharp).

## 4. Switch and roll back

Point the app's start command at the new folder (`node server.js` from
`releases/brandworks-next-<sha>`, with `PORT`/`HOSTNAME` from the env file),
for example by switching a `current` symlink, then restart the app. To roll
back, point it at the previous release folder and restart.

## Known open items

- **Scheduled publishing.** `npm run jobs:publish-due` runs TypeScript
  through `tsx` and is not part of the standalone release. Until the job is
  bundled, its cron entry needs a source checkout of the same commit with
  `npm ci` and the same runtime environment (see src/server/jobs/README.md).
- **Rate limiting** is in-memory and per process. Run exactly one app process
  until it moves to a shared store (src/server/jobs/README.md).
- **`/api/health` `commit`** reads `GITHUB_SHA` (or `VERCEL_GIT_COMMIT_SHA`).
  Set `GITHUB_SHA=<sha>` in the runtime env to report the deployed commit.
