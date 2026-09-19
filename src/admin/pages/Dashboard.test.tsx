// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getScheduledCountMock = vi.fn()

vi.mock('../api/blogAdminApi', () => ({
  getScheduledCount: () => getScheduledCountMock(),
}))

vi.mock('../context/AdminAuthContext', () => ({
  useAdminAuth: () => ({
    admin: { id: '1', username: 'testadmin', role: 'admin' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
  }),
}))

const { default: Dashboard } = await import('./Dashboard')

let container: HTMLDivElement | null = null
let root: Root | null = null

beforeEach(() => {
  getScheduledCountMock.mockReset()
})

afterEach(() => {
  if (root) act(() => root?.unmount())
  container?.remove()
  container = null
  root = null
})

async function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  await act(async () => {
    root = createRoot(container!)
    root!.render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>,
    )
  })
  return container
}

describe('Dashboard — Scheduled Posts card (Phase 16)', () => {
  it('renders the Scheduled Posts card', async () => {
    getScheduledCountMock.mockResolvedValue({ scheduled: 0 })
    const el = await mount()
    expect(el.textContent).toContain('Scheduled Posts')
  })

  it('displays the correct count once loaded', async () => {
    getScheduledCountMock.mockResolvedValue({ scheduled: 5 })
    const el = await mount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(el.textContent).toContain('5')
  })

  it('displays zero explicitly when there are no scheduled posts (not blank, not a failure state)', async () => {
    getScheduledCountMock.mockResolvedValue({ scheduled: 0 })
    const el = await mount()
    await act(async () => {
      await Promise.resolve()
    })
    const card = [...el.querySelectorAll('a')].find((a) => a.textContent?.includes('Scheduled Posts'))!
    expect(card.textContent).toContain('0')
    expect(card.textContent).not.toContain('—')
  })

  it('does not crash the Dashboard when the request fails, and shows a neutral fallback rather than a fabricated zero', async () => {
    getScheduledCountMock.mockRejectedValue(new Error('network error'))
    const el = await mount()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(el.textContent).toContain('Scheduled Posts')
    expect(el.textContent).toContain('—')
    // The rest of the dashboard still renders — one failed card never
    // takes down the page.
    expect(el.textContent).toContain('Blogs')
    expect(el.textContent).toContain('Settings')
  })

  it('never surfaces raw error detail/stack text on failure', async () => {
    getScheduledCountMock.mockRejectedValue(new Error('ECONNREFUSED 127.0.0.1:4001'))
    const el = await mount()
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(el.textContent).not.toContain('ECONNREFUSED')
  })

  it('links to the Scheduled BlogList filter (click-through)', async () => {
    getScheduledCountMock.mockResolvedValue({ scheduled: 2 })
    const el = await mount()
    const card = [...el.querySelectorAll('a')].find((a) => a.textContent?.includes('Scheduled Posts'))!
    expect(card.getAttribute('href')).toBe('/admin/blogs?scheduled=true')
  })
})
