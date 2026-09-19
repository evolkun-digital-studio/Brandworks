import type { AdminDocument } from './admin.js'

declare global {
  namespace Express {
    interface Request {
      /**
       * The authenticated admin, attached by middleware/requireAuth.ts.
       * Always the fresh database record for the verified token's
       * subject — never anything derived from client input.
       */
      admin?: AdminDocument
    }
  }
}

export {}
