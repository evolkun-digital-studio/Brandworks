/**
 * Startup file for cPanel (Setup Node.js App / Application Manager),
 * both of which run the app under Phusion Passenger.
 *
 * Passenger loads its startup file with require(), which cannot load
 * this backend's ES-module entry point directly on every Node version
 * cPanel offers — hence this CommonJS shim (.cjs, because package.json
 * sets "type": "module") that hands over with a dynamic import().
 *
 * Nothing here is cPanel-specific at runtime: `npm start` still runs
 * dist/server.js directly everywhere else.
 */

// dotenv reads .env from the working directory. Passenger normally
// starts the app in its root already; this makes it certain.
process.chdir(__dirname)

import('./dist/server.js').catch((error) => {
  console.error('[brandworks-backend] failed to load dist/server.js:', error)
  process.exit(1)
})
