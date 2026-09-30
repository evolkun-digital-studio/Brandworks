import { toSafeErrorMessage } from './safeError.js'

/**
 * Minimal leveled logger — one line per event, `<ISO time> <LEVEL>
 * <message>`, written to stdout (INFO) or stderr (WARN/ERROR) so
 * Passenger/cPanel's own log capture can tell them apart. Deliberately
 * not a logging library: this backend is a single process with a
 * handful of log sites, and the host already owns rotation/retention.
 *
 * Callers pass an already-composed message. Never pass a request
 * body, a cookie, an Authorization header, or a raw env value here —
 * nothing in this module redacts those. The one thing it does redact
 * is a MongoDB connection string inside an error (see describeError),
 * because driver errors are the realistic way one ends up in a log.
 */

type Level = 'INFO' | 'WARN' | 'ERROR'

function write(level: Level, message: string) {
  const line = `${new Date().toISOString()} ${level.padEnd(5)} ${message}`
  if (level === 'INFO') {
    console.log(line)
  } else {
    console.error(line)
  }
}

/**
 * An error rendered for a server-side log line: the stack when there
 * is one (it already starts with the message), otherwise the message.
 * Never sent to a client — see middleware/errorHandler.ts.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error && error.stack) {
    return toSafeErrorMessage(error.stack)
  }
  return toSafeErrorMessage(error)
}

export const logger = {
  info: (message: string) => write('INFO', message),
  warn: (message: string) => write('WARN', message),
  error: (message: string) => write('ERROR', message),
}
