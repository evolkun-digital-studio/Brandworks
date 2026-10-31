// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SiteScanSummary } from '../../server/site-scan/types'

const listSiteScans = vi.fn()
vi.mock('../api/siteScanAdminApi', () => ({ listSiteScans: (...args: unknown[]) => listSiteScans(...args) }))

const { default: SiteScans } = await import('./SiteScans')
const { ViteNavigationProvider } = await import('../../routing/vite')

const none = { status: null, reason: null }
const summary = (over: Partial<SiteScanSummary> = {}): SiteScanSummary => ({
  id: '6ad9b9f9a0236f993c866e77',
  domain: 'chaico.in',
  url: 'https://chaico.in/',
  status: 'done',
  stale: false,
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-21T00:00:00.000Z',
  paidSources: true,
  error: null,
  ai: true,
  headline: 'h',
  issueCount: 2,
  collectors: { onPage: none, pages: none, performance: none, authority: none, traffic: none },
  performanceScore: 41,
  seoScore: 92,
  authority: null,
  estimatedTraffic: null,
  pages: null,
  ...over,
})
const listOf = (...items: SiteScanSummary[]) => ({ items, page: 1, pageSize: 25, total: items.length, totalPages: 1 })

let container: HTMLDivElement | null = null
let root: Root | null = null

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    root = createRoot(container!)
    root!.render(<MemoryRouter><ViteNavigationProvider><SiteScans /></ViteNavigationProvider></MemoryRouter>)
  })
  return container
}

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden })
  document.dispatchEvent(new Event('visibilitychange'))
}

beforeEach(() => { listSiteScans.mockReset() })

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
  vi.useRealTimers()
  Object.defineProperty(document, 'hidden', { configurable: true, value: false })
})

describe('SiteScans list', () => {
  it('labels authority by provider and never mixes them', async () => {
    listSiteScans.mockResolvedValue(listOf(summary({ authority: { provider: 'moz', domainAuthority: 45 } })))
    let el = await mount()
    expect(el.textContent).toContain('45 DA')
    expect(el.textContent).not.toContain('Domain Rank')
    act(() => root?.unmount())

    listSiteScans.mockResolvedValue(listOf(summary({ authority: { provider: 'dataforseo', domainRank: 320 } })))
    el = await mount()
    expect(el.textContent).toContain('320 Domain Rank /1000')
    expect(el.textContent).not.toMatch(/\bDA\b/)
  })

  it('shows skipped values as a dash with the reason on hover', async () => {
    listSiteScans.mockResolvedValue(listOf(summary({
      collectors: { onPage: none, pages: none, performance: none, authority: { status: 'skipped', reason: 'MOZ_API_TOKEN is not set' }, traffic: none },
    })))
    const el = await mount()
    const dash = el.querySelector('[title="MOZ_API_TOKEN is not set"]')
    expect(dash?.textContent).toContain('—')
  })

  it('labels traffic as an estimate and counts key pages', async () => {
    listSiteScans.mockResolvedValue(listOf(summary({ estimatedTraffic: 1200, pages: { crawled: 4, groupsFound: 4, groupsNotFound: 2, groupsNotChecked: 0 } })))
    const el = await mount()
    expect(el.textContent).toMatch(/1,?200 est\./)
    expect(el.textContent).toContain('4 found · 2 missing')
  })

  it('links out safely, and only to http(s)', async () => {
    listSiteScans.mockResolvedValue(listOf(summary(), summary({ id: 'other', domain: 'bad.example', url: 'javascript:alert(1)' })))
    const el = await mount()
    const link = [...el.querySelectorAll('a')].find((a) => a.textContent === 'chaico.in')!
    expect(link.getAttribute('href')).toBe('https://chaico.in/')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer nofollow')
    expect(el.querySelector('a[href^="javascript"]')).toBeNull()
    expect(el.textContent).toContain('bad.example')
  })

  it('explains the empty state', async () => {
    listSiteScans.mockResolvedValue(listOf())
    const el = await mount()
    expect(el.textContent).toContain('Redesign or Add features')
  })

  it('polls every 5 s while a scan runs, pauses when hidden, and stops once finished', async () => {
    vi.useFakeTimers()
    listSiteScans.mockResolvedValue(listOf(summary({ status: 'running' })))
    await mount()
    expect(listSiteScans).toHaveBeenCalledTimes(1)

    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(listSiteScans).toHaveBeenCalledTimes(2)

    await act(async () => { setHidden(true); await vi.advanceTimersByTimeAsync(20_000) })
    expect(listSiteScans).toHaveBeenCalledTimes(2)

    listSiteScans.mockResolvedValue(listOf(summary({ status: 'done' })))
    await act(async () => { setHidden(false); await vi.advanceTimersByTimeAsync(0) })
    expect(listSiteScans).toHaveBeenCalledTimes(3)

    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    expect(listSiteScans).toHaveBeenCalledTimes(3)
  })

  it('does not poll for a stalled scan that will never finish', async () => {
    vi.useFakeTimers()
    listSiteScans.mockResolvedValue(listOf(summary({ status: 'running', stale: true })))
    const el = await mount()
    expect(el.textContent).toContain('Stalled')
    await act(async () => { await vi.advanceTimersByTimeAsync(20_000) })
    expect(listSiteScans).toHaveBeenCalledTimes(1)
  })
})
