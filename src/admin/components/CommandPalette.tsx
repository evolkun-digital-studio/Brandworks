import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CornerDownLeft,
  FilePlus2,
  FileText,
  Images,
  LayoutDashboard,
  Moon,
  Search,
  SearchCheck,
  Settings2,
  Sun,
  SunMoon,
  UsersRound,
} from 'lucide-react'
import { useNavigate } from '../../routing'
import * as blogApi from '../api/blogAdminApi'
import type { AdminBlogPost } from '../api/blogTypes'
import type { AdminTheme } from '../hooks/useAdminTheme'

interface Command {
  id: string
  group: 'Actions' | 'Go to' | 'Appearance' | 'Articles'
  label: string
  hint?: string
  icon: LucideIcon
  run: () => void
}

interface CommandPaletteProps {
  open: boolean
  isAdmin: boolean
  onClose: () => void
  onThemeChange: (theme: AdminTheme) => void
}

/** ⌘K: jump to any page, start something new, or find an article by title. */
function CommandPalette({ open, isAdmin, onClose, onThemeChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [articles, setArticles] = useState<AdminBlogPost[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setArticles([])
    setActive(0)
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      window.cancelAnimationFrame(frame)
      previous?.focus()
    }
  }, [open])

  useEffect(() => {
    const term = query.trim()
    if (!open || term.length < 2) {
      setArticles([])
      return
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      blogApi.listBlogPosts({ search: term, limit: 5 })
        .then((result) => { if (!cancelled) setArticles(result.items) })
        .catch(() => { if (!cancelled) setArticles([]) })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const commands = useMemo<Command[]>(() => {
    const go = (to: string) => () => navigate(to)
    const base: Command[] = [
      { id: 'new', group: 'Actions', label: 'New article', icon: FilePlus2, run: go('/admin/blogs/new') },
      { id: 'overview', group: 'Go to', label: 'Overview', icon: LayoutDashboard, run: go('/admin') },
      { id: 'articles', group: 'Go to', label: 'Articles', icon: FileText, run: go('/admin/blogs') },
      { id: 'drafts', group: 'Go to', label: 'Drafts', hint: 'Articles', icon: FileText, run: go('/admin/blogs?status=draft') },
      { id: 'scheduled', group: 'Go to', label: 'Scheduled articles', hint: 'Articles', icon: CalendarDays, run: go('/admin/blogs?scheduled=true') },
      { id: 'media', group: 'Go to', label: 'Media', icon: Images, run: go('/admin/media') },
      { id: 'calendar', group: 'Go to', label: 'Calendar', icon: CalendarDays, run: go('/admin/calendar') },
      { id: 'seo', group: 'Go to', label: 'SEO', icon: SearchCheck, run: go('/admin/seo') },
      { id: 'activity', group: 'Go to', label: 'Activity', icon: Activity, run: go('/admin/activity') },
      { id: 'settings', group: 'Go to', label: 'Settings', icon: Settings2, run: go('/admin/settings') },
      { id: 'theme-system', group: 'Appearance', label: 'Appearance: Automatic', icon: SunMoon, run: () => onThemeChange('system') },
      { id: 'theme-light', group: 'Appearance', label: 'Appearance: Light', icon: Sun, run: () => onThemeChange('light') },
      { id: 'theme-dark', group: 'Appearance', label: 'Appearance: Dark', icon: Moon, run: () => onThemeChange('dark') },
    ]
    if (isAdmin) base.splice(10, 0, { id: 'team', group: 'Go to', label: 'Team', icon: UsersRound, run: go('/admin/users') })
    return base
  }, [isAdmin, navigate, onThemeChange])

  const results = useMemo<Command[]>(() => {
    const term = query.trim().toLowerCase()
    const matched = term
      ? commands.filter((command) => `${command.label} ${command.hint ?? ''}`.toLowerCase().includes(term))
      : commands.filter((command) => command.group !== 'Appearance')
    const articleCommands = articles.map<Command>((article) => ({
      id: `article-${article.id}`,
      group: 'Articles',
      label: article.title || 'Untitled article',
      hint: article.status === 'published' ? 'Published' : 'Draft',
      icon: FileText,
      run: () => navigate(`/admin/blogs/${article.id}/edit`),
    }))
    return [...articleCommands, ...matched]
  }, [articles, commands, navigate, query])

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(results.length - 1, 0)))
  }, [results.length])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function choose(command: Command | undefined) {
    if (!command) return
    onClose()
    command.run()
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((index) => (index + 1) % Math.max(results.length, 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((index) => (index - 1 + results.length) % Math.max(results.length, 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(results[active])
    }
  }

  let previousGroup = ''
  return (
    <div
      className="admin-palette-backdrop"
      role="presentation"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div className="admin-palette" role="dialog" aria-modal="true" aria-label="Quick search" onKeyDown={onKeyDown}>
        <div className="admin-palette__input">
          <Search size={18} strokeWidth={1.8} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0) }}
            placeholder="Search articles or jump to a page"
            role="combobox"
            aria-expanded="true"
            aria-controls="admin-palette-list"
            aria-autocomplete="list"
            spellCheck={false}
          />
          <kbd>esc</kbd>
        </div>
        <div id="admin-palette-list" ref={listRef} className="admin-palette__list" role="listbox">
          {results.length === 0 && <p className="admin-palette__empty">No results for “{query}”.</p>}
          {results.map((command, index) => {
            const showGroup = command.group !== previousGroup
            previousGroup = command.group
            const Icon = command.icon
            return (
              <div key={command.id}>
                {showGroup && <p className="admin-palette__group">{command.group}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className="admin-palette__item"
                  onMouseMove={() => setActive(index)}
                  onClick={() => choose(command)}
                >
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                  <span>{command.label}</span>
                  {command.hint && <small>{command.hint}</small>}
                </button>
              </div>
            )
          })}
        </div>
        <div className="admin-palette__foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> to move</span>
          <span><CornerDownLeft size={12} aria-hidden="true" /> to open</span>
          <span className="ml-auto"><ArrowRight size={12} aria-hidden="true" /> BRANDWORKS Studio</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
