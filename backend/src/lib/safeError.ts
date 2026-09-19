/**
 * Strips anything that could resemble a MongoDB connection
 * string/credentials from an error message before it's logged or
 * returned in a response. Originally local to config/database.ts;
 * moved here (Phase 15) so services/blog/scheduler.service.ts's own
 * error logging can reuse the exact same redaction rather than
 * duplicating it — a scheduler cycle failure is exactly the kind of
 * unexpected-error path that could otherwise leak a connection string
 * embedded in a driver error message.
 */
export function toSafeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, '[redacted]')
}
