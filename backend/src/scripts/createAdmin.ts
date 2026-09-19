import readline from 'node:readline'
import { connectToDatabase, disconnectFromDatabase } from '../config/database.js'
import { ensureAdminIndexes, insertAdmin } from '../repositories/admin.repository.js'
import { primaryAdminExists } from '../services/admin/admin.service.js'
import { hashPassword, validatePassword } from '../lib/password.js'
import { normalizeUsername, validateUsername } from '../lib/validators.js'

/**
 * One-time bootstrap for the very first (primary) admin account.
 * Run with `npm run admin:create` from within backend/. Refuses to run
 * again once a primary admin exists — after that, sub-admins are
 * created through the admin panel itself (POST /api/admin/users),
 * never through this script.
 */

const CTRL_C = String.fromCharCode(3)
const DEL = String.fromCharCode(127)

/**
 * Reads a masked line directly from the terminal in raw mode — used
 * only for an interactive TTY, where each keystroke arrives as its
 * own event so there's something to react to per character.
 */
function readMaskedFromTTY(query: string): Promise<string> {
  process.stdout.write(query)

  return new Promise((resolve, reject) => {
    const stdin = process.stdin
    let input = ''

    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    const finish = (result: string | Error) => {
      stdin.setRawMode(false)
      stdin.pause()
      stdin.removeListener('data', onData)
      process.stdout.write('\n')
      if (result instanceof Error) reject(result)
      else resolve(result)
    }

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\n' || char === '\r') {
          finish(input)
          return
        }
        if (char === CTRL_C) {
          finish(new Error('Aborted.'))
          return
        }
        if (char === DEL || char === '\b') {
          if (input.length > 0) {
            input = input.slice(0, -1)
            process.stdout.write('\b \b')
          }
          continue
        }
        input += char
        process.stdout.write('*')
      }
    }

    stdin.on('data', onData)
  })
}

/**
 * Reads all of stdin up front and splits it into lines. Used for
 * non-interactive input (piped, e.g. a CI/deploy script). This is
 * deliberately NOT built on sequential `readline.question()` calls:
 * when a piped source writes multiple lines in one chunk (the normal
 * case), Node's readline emits 'line' for every line already present
 * in that chunk synchronously — but a `question()` call only attaches
 * its listener *after* the previous one resolves, so any line beyond
 * the first that arrived in the same chunk fires with nothing
 * listening and is silently lost, hanging the next question forever.
 * Reading everything eagerly and indexing into it sidesteps that.
 */
async function readAllStdinLines(): Promise<string[]> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }
  return Buffer.concat(chunks)
    .toString('utf8')
    .split(/\r\n|\n|\r/)
    .filter((line, index, all) => !(index === all.length - 1 && line === ''))
}

async function main() {
  await connectToDatabase()
  await ensureAdminIndexes()

  if (await primaryAdminExists()) {
    console.error(
      'A primary admin already exists. Refusing to create another one.\n' +
        'Use the admin panel (or POST /api/admin/users, as an existing admin) to create sub-admins instead.',
    )
    process.exitCode = 1
    return
  }

  console.log('BRANDWORKS — create the initial admin account\n')

  const isTTY = Boolean(process.stdin.isTTY)

  let usernameInput: string
  let password: string
  let confirmPassword: string

  if (isTTY) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    usernameInput = await new Promise<string>((resolve) =>
      rl.question('Admin login ID: ', resolve),
    )
    // Release stdin before switching to raw-mode masked reads — the
    // two must not both be attached to stdin at the same time.
    rl.close()

    password = await readMaskedFromTTY('Password: ')
    confirmPassword = await readMaskedFromTTY('Confirm password: ')
  } else {
    process.stdout.write('Admin login ID: \nPassword: \nConfirm password: \n')
    const [line1, line2, line3] = await readAllStdinLines()
    usernameInput = line1 ?? ''
    password = line2 ?? ''
    confirmPassword = line3 ?? ''
  }

  const usernameError = validateUsername(usernameInput)
  if (usernameError) {
    console.error(`\n${usernameError}`)
    process.exitCode = 1
    return
  }
  const username = normalizeUsername(usernameInput)

  const passwordError = validatePassword(password)
  if (passwordError) {
    console.error(`\n${passwordError}`)
    process.exitCode = 1
    return
  }

  if (password !== confirmPassword) {
    console.error('\nPasswords do not match.')
    process.exitCode = 1
    return
  }

  const passwordHash = await hashPassword(password)

  await insertAdmin({
    username,
    passwordHash,
    role: 'admin',
    enabled: true,
    isPrimary: true,
  })

  console.log(`\nAdmin account "${username}" created successfully.`)
}

main()
  .catch((error) => {
    console.error(
      '\nFailed to create admin account:',
      error instanceof Error ? error.message : error,
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectFromDatabase()
  })
