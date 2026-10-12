import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

/**
 * Architectural guard for "no admin page-view tracking" (Phase 12,
 * Part 6/12): RouteAnalytics is mounted exactly once, inside
 * PublicLayout — which only ever wraps the public routes — and no
 * file anywhere under src/admin/ imports anything from src/analytics/
 * at all. This is a source-text check (not a runtime render, which
 * RouteAnalytics.test.tsx already covers for the tracking logic
 * itself) because the property being verified is "which files import
 * which," a static fact about the module graph.
 */

const srcDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

function read(relativePath: string): string {
  return readFileSync(path.join(srcDir, relativePath), 'utf8')
}

function walk(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) return [full]
    return []
  })
}

describe('RouteAnalytics is only ever mounted for public routes', () => {
  it('PublicLayout.tsx renders RouteAnalytics', () => {
    const source = read('PublicLayout.tsx')
    expect(source).toContain("import RouteAnalytics from './analytics/RouteAnalytics'")
    expect(source).toMatch(/<RouteAnalytics\s*\/>/)
  })

  it('no file under src/admin/ imports anything from src/analytics/', () => {
    const adminDir = path.join(srcDir, 'admin')
    const offenders: string[] = []
    for (const file of walk(adminDir)) {
      const source = readFileSync(file, 'utf8')
      if (/from ['"].*analytics/.test(source)) {
        offenders.push(path.relative(srcDir, file))
      }
    }
    expect(offenders).toEqual([])
  })

  it('App.tsx mounts /admin/* as a sibling route outside PublicLayout, not nested under it', () => {
    const source = read('App.tsx')
    // The admin route is declared as its own top-level <Route>, not
    // inside the <Route element={<PublicLayout />}>...</Route> block.
    const publicLayoutBlock = source.slice(
      source.indexOf('<Route element={<PublicLayout'),
      source.indexOf('/admin/*'),
    )
    expect(publicLayoutBlock).not.toContain('AdminRoutes')
  })
})
