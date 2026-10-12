# Next.js API

Health, public blog, admin authentication/profile, user-management, and admin
blog-management handlers now live under this App Router API tree. `backend/`
remains the read-only behavioral reference; it has not been deleted or changed.

Sitemap and robots are root-level Next handlers. The scheduled-publishing job
is an explicitly invoked script documented at `src/server/jobs/README.md`; no
timer starts with the app and no cPanel cron is configured here. Do not put
secrets or database credentials in `NEXT_PUBLIC_*` variables. JWT and MongoDB
settings are server-only.

The login endpoint preserves the source app's in-memory limit of 10 attempts
per 15 minutes per process. This is not a shared limiter and remains pending
infrastructure work before multi-instance production use. The previous
Express global API limiter is not yet migrated.
