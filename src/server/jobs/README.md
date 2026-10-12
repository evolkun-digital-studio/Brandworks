# Scheduled blog publishing job

The Next.js server does not start a timer and no Route Handler triggers publishing.
Scheduled publication has one owner: an explicitly invoked cron process. The
entrypoint uses the same atomic Mongo update operation as the shared server
repository. Concurrent invocations are safe: the first changes the matching
draft status, so subsequent runs no longer match it.

After the hosting environment and cron owner are approved, run this command from
the `Brandworks/` application root under the same Node runtime and environment as
the application:

```sh
npm run jobs:publish-due
```

For cPanel, the eventual cron entry should invoke that command from the actual
Brandworks application root (using the account's configured Node/npm path) at
the selected cadence. No account path, cron schedule, or Passenger configuration
is assumed or installed here. A one-minute cadence matches the old default
`SCHEDULER_INTERVAL_MS=60000`; choose it only after confirming the hosting
provider's cron minimum and operational ownership.

The job reads `MONGODB_URI` server-side, pings MongoDB, publishes only active
drafts whose BSON `scheduledAt` date is due, sets `publishedAt` from that same
date, clears `scheduledAt`, logs only a count/status, closes the connection, and
exits non-zero on failure without printing error messages or secrets.

## Rate limiting deployment note

Login currently has the source-compatible in-memory limit of 10 attempts per
15-minute window per process. The old global API limiter (300 requests/minute
per IP) is not migrated. If production is confirmed to run exactly one app
process, the per-process login limit can initially match the old single-process
deployment intent; it does not replace the missing global limiter. Before
running multiple instances, move both counters to a shared store (for example,
Redis) and configure trusted proxy/IP extraction for the actual cPanel/CDN hop
topology. Do not trust arbitrary forwarded headers.
