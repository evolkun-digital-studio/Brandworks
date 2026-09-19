import { publishDueScheduledBlogs } from '../../repositories/blog.repository.js'
import { env } from '../../config/env.js'
import { toSafeErrorMessage } from '../../lib/safeError.js'

/**
 * Backend-authoritative scheduled-publishing worker (Phase 14, Part
 * 5; interval made configurable and logging hardened in Phase 15). A
 * lightweight `setInterval` loop, deliberately — this project deploys
 * as a single backend process, so a heavyweight job framework
 * (Bull/Agenda/a cron daemon) would be solving a distributed-systems
 * problem this deployment doesn't have. The interval comes from
 * `env.schedulerIntervalMs` (config/env.ts — validated once, eagerly,
 * at startup) rather than being read from `process.env` here; the
 * actual publish transition is atomic regardless of cadence (see
 * publishDueScheduledBlogs).
 *
 * The frontend is never involved in triggering this — nothing about
 * opening the admin UI, viewing a post, or any client-side timer
 * causes a publish. This module is the only thing that does.
 */

let intervalHandle: ReturnType<typeof setInterval> | null = null

async function runOnce(): Promise<void> {
  const startedAt = Date.now()
  try {
    const publishedCount = await publishDueScheduledBlogs(new Date())
    // Silent on a normal "nothing due" cycle — logging every tick
    // regardless of outcome would just be noise at a once-a-minute
    // (or faster) cadence; a cycle that actually did something is the
    // informative case, so that's what gets a line.
    if (publishedCount > 0) {
      console.log(
        `[scheduler] cycle complete publishedCount=${publishedCount} durationMs=${Date.now() - startedAt}`,
      )
    }
  } catch (error) {
    // A single failed cycle (e.g. a transient DB blip) must never
    // crash the process or stop future cycles — the next one just
    // tries again. toSafeErrorMessage strips anything that could
    // resemble a MongoDB connection string/credentials before this
    // ever reaches a log line — never article content (nothing here
    // ever touches a document's fields to begin with), never a JWT,
    // never a raw environment value.
    console.error(
      `[scheduler] cycle failed durationMs=${Date.now() - startedAt}:`,
      toSafeErrorMessage(error),
    )
  }
}

/** Idempotent — calling this more than once (e.g. an accidental double startup call) never starts a second interval. */
export function startBlogScheduler(): void {
  if (intervalHandle) return
  console.log(`[scheduler] Blog scheduler started intervalMs=${env.schedulerIntervalMs}`)
  // Catches anything already due the moment the server starts,
  // instead of waiting up to a full interval for the first cycle.
  void runOnce()
  intervalHandle = setInterval(runOnce, env.schedulerIntervalMs)
}

/** Safe to call even if the scheduler was never started, or was already stopped — never throws. */
export function stopBlogScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
    console.log('[scheduler] Blog scheduler stopped')
  }
}
