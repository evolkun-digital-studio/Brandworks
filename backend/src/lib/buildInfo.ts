import { readFileSync } from 'node:fs'

/**
 * Which build is running. The deploy pipeline writes `build-info.json`
 * next to package.json (see .github/workflows/ci.yml) and the
 * post-deploy health check compares the commit reported by
 * /api/health against the commit it just shipped — that is what
 * distinguishes "the new release is serving" from "the old process is
 * still answering". The file does not exist in local development, so
 * every field falls back to a placeholder rather than failing.
 *
 * Resolved relative to this module (src/lib or dist/lib → two levels
 * up is the backend root either way), never the working directory.
 */
interface BuildInfo {
  commit: string
  builtAt: string | null
}

function readBuildInfo(): BuildInfo {
  try {
    const raw = readFileSync(new URL('../../build-info.json', import.meta.url), 'utf8')
    const parsed = JSON.parse(raw) as Partial<BuildInfo>
    return {
      commit: typeof parsed.commit === 'string' && parsed.commit !== '' ? parsed.commit : 'unknown',
      builtAt: typeof parsed.builtAt === 'string' ? parsed.builtAt : null,
    }
  } catch {
    return { commit: 'dev', builtAt: null }
  }
}

export const buildInfo = readBuildInfo()
