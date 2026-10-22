'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent, KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Bold,
  ChevronDown,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Type,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import * as mediaApi from '../../../api/mediaAdminApi'
import MediaPicker from './MediaPicker'
import type { PickedImage } from './MediaPicker'
import {
  COLORS,
  FONT_SIZES,
  escapeAttribute,
  figureHtml,
  markdownToEditableHtml,
  mediaTextHtml,
  sanitizeEditableHtml,
  textToHtml,
} from '../lib/richContent'

export interface RichEditorHandle {
  focus: () => void
  undo: () => void
  redo: () => void
  /** Scrolls to the nth H2–H4 heading in the document. */
  scrollToHeading: (index: number) => void
}

type Popover = 'block' | 'size' | 'color' | 'image' | 'imageUrl' | 'link' | null
type BlockName = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'pre' | 'ul' | 'ol'

const BLOCKS: Array<{ id: BlockName; label: string; icon: LucideIcon }> = [
  { id: 'p', label: 'Paragraph', icon: Pilcrow },
  { id: 'h1', label: 'Heading 1', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', icon: Heading3 },
  { id: 'h4', label: 'Heading 4', icon: Heading4 },
  { id: 'blockquote', label: 'Quote', icon: Quote },
  { id: 'pre', label: 'Code block', icon: SquareCode },
]

interface SlashItem {
  id: string
  label: string
  hint: string
  keywords: string
  icon: LucideIcon
}

const SLASH_ITEMS: SlashItem[] = [
  { id: 'h1', label: 'Heading 1', hint: 'Big section title', keywords: 'h1 title heading', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', hint: 'Medium section title', keywords: 'h2 heading', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', hint: 'Small section title', keywords: 'h3 subheading', icon: Heading3 },
  { id: 'ul', label: 'Bulleted list', hint: 'A simple list', keywords: 'bullet unordered list', icon: List },
  { id: 'ol', label: 'Numbered list', hint: 'Steps in order', keywords: 'number ordered list', icon: ListOrdered },
  { id: 'blockquote', label: 'Quote', hint: 'Pull out a line', keywords: 'quote blockquote', icon: Quote },
  { id: 'pre', label: 'Code', hint: 'Monospaced block', keywords: 'code pre', icon: SquareCode },
  { id: 'hr', label: 'Divider', hint: 'A horizontal rule', keywords: 'divider rule hr line', icon: Minus },
  { id: 'image', label: 'Image', hint: 'From the media library', keywords: 'image photo picture media', icon: ImagePlus },
  { id: 'media-text', label: 'Image and text', hint: 'Side-by-side layout', keywords: 'image text split layout', icon: ImagePlus },
]

const SHORTCUTS: Array<[RegExp, BlockName]> = [
  [/^#$/, 'h1'],
  [/^##$/, 'h2'],
  [/^###$/, 'h3'],
  [/^####$/, 'h4'],
  [/^[-*+]$/, 'ul'],
  [/^1[.)]$/, 'ol'],
  [/^>$/, 'blockquote'],
]

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'LI'])

function blockOf(node: Node | null, root: HTMLElement): HTMLElement {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === 1 && BLOCK_TAGS.has((current as HTMLElement).tagName)) return current as HTMLElement
    current = current.parentNode
  }
  return root
}

function blockName(node: Node | null, root: HTMLElement): BlockName {
  let current: Node | null = node
  while (current && current !== root) {
    if (current.nodeType === 1) {
      const tag = (current as HTMLElement).tagName.toLowerCase()
      if (['h1', 'h2', 'h3', 'h4', 'blockquote', 'pre'].includes(tag)) return tag as BlockName
      if (tag === 'li') return (current.parentElement?.tagName === 'OL' ? 'ol' : 'ul')
    }
    current = current.parentNode
  }
  return 'p'
}

function normalizeUrl(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(raw)) return raw
  if (/^[^\s]+\.[^\s]{2,}$/.test(raw)) return `https://${raw}`
  return null
}

function ToolButton({
  label,
  onClick,
  active,
  disabled,
  children,
  shortcut,
  className = '',
}: {
  label: string
  onClick: () => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
  shortcut?: string
  className?: string
}) {
  return (
    <button
      type="button"
      className={`admin-tool ${className}`}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event: MouseEvent) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

interface RichContentEditorProps {
  value: string
  onChange: (next: string) => void
  onBlur?: () => void
  error?: string | null
  handleRef?: Ref<RichEditorHandle>
}

function RichContentEditor({ value, onChange, onBlur, error, handleRef }: RichContentEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual')
  const [popover, setPopover] = useState<Popover>(null)
  const [mediaTarget, setMediaTarget] = useState<'figure' | 'media-text' | null>(null)
  const [format, setFormat] = useState({ bold: false, italic: false, underline: false, strike: false, block: 'p' as BlockName })
  const [linkUrl, setLinkUrl] = useState('')
  const [linkActive, setLinkActive] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [imageAlt, setImageAlt] = useState('')
  const [uploading, setUploading] = useState(0)
  const [slash, setSlash] = useState<{ query: string; top?: number; bottom?: number; left: number; index: number } | null>(null)

  const visualRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const savedSelection = useRef<Range | null>(null)
  const slashRange = useRef<{ node: Text; start: number; end: number } | null>(null)
  const didInitialize = useRef(false)
  const lastSyncedValue = useRef(value)

  useEffect(() => {
    if (mode !== 'visual') return
    const editor = visualRef.current
    if (!editor) return
    if (!didInitialize.current || editor.innerHTML === '') {
      editor.innerHTML = markdownToEditableHtml(value)
      didInitialize.current = true
      lastSyncedValue.current = value
      return
    }
    if (document.activeElement === editor || value === lastSyncedValue.current) return
    editor.innerHTML = markdownToEditableHtml(value)
    lastSyncedValue.current = value
  }, [mode, value])

  useEffect(() => {
    if (mode === 'visual') {
      // Paragraphs, not <div>s, are what Enter should create.
      try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* unsupported */ }
    }
  }, [mode])

  const sync = useCallback(() => {
    const editor = visualRef.current
    if (!editor) return
    if (editor.innerHTML === '<br>') editor.innerHTML = ''
    lastSyncedValue.current = editor.innerHTML
    onChange(editor.innerHTML)
  }, [onChange])

  const rememberSelection = useCallback(() => {
    const editor = visualRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) savedSelection.current = range.cloneRange()
  }, [])

  function restoreSelection() {
    const selection = window.getSelection()
    if (!selection || !savedSelection.current) return
    selection.removeAllRanges()
    selection.addRange(savedSelection.current)
  }

  function run(command: string, argument?: string) {
    visualRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, argument)
    sync()
    rememberSelection()
  }

  function insertHtml(html: string) {
    visualRef.current?.focus()
    restoreSelection()
    document.execCommand('insertHTML', false, html)
    sync()
    rememberSelection()
  }

  function setBlock(block: BlockName) {
    if (block === 'ul') return run('insertUnorderedList')
    if (block === 'ol') return run('insertOrderedList')
    run('formatBlock', `<${block}>`)
  }

  function wrapSelection(tagName: 'mark' | 'span', color?: string, fontSize?: string) {
    const selection = window.getSelection()
    const editor = visualRef.current
    if (!selection || !editor || selection.rangeCount === 0) return
    restoreSelection()
    const range = selection.rangeCount ? selection.getRangeAt(0) : null
    if (!range || range.collapsed || !editor.contains(range.commonAncestorContainer)) return

    const wrapper = document.createElement(tagName)
    if (color) wrapper.dataset.color = color
    if (fontSize) wrapper.dataset.fontSize = fontSize
    try {
      range.surroundContents(wrapper)
    } catch {
      wrapper.appendChild(range.extractContents())
      range.insertNode(wrapper)
    }
    selection.removeAllRanges()
    const next = document.createRange()
    next.selectNodeContents(wrapper)
    selection.addRange(next)
    sync()
    rememberSelection()
  }

  function applyFontSize(size: string) {
    const editor = visualRef.current
    const selection = window.getSelection()
    if (!editor) return
    restoreSelection()
    if (size) return wrapSelection('span', undefined, size)
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    const holder = document.createElement('span')
    holder.appendChild(range.extractContents())
    holder.querySelectorAll('span[data-font-size]').forEach((span) => span.removeAttribute('data-font-size'))
    range.insertNode(holder)
    sync()
  }

  function insertPicked(picked: PickedImage, layout: 'figure' | 'media-text') {
    const alt = picked.asset.altText || picked.asset.originalName
    const caption = picked.asset.caption || ''
    insertHtml(layout === 'media-text'
      ? mediaTextHtml(picked.url, alt, caption, 'Add supporting text here.')
      : figureHtml(picked.url, alt, caption))
    setMediaTarget(null)
  }

  async function uploadAndInsert(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading((count) => count + 1)
    try {
      const alt = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Article image'
      const { asset } = await mediaApi.uploadMedia(file, alt, '')
      insertHtml(figureHtml(new URL(asset.publicUrl, window.location.origin).href, asset.altText || alt, ''))
      toast.success('Image added. Describe it in the media library when you can.')
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Could not upload the image.')
    } finally {
      setUploading((count) => count - 1)
    }
  }

  // Keep the toolbar honest about what the caret is inside.
  useEffect(() => {
    if (mode !== 'visual') return
    function update() {
      const editor = visualRef.current
      const selection = window.getSelection()
      if (!editor || !selection || !selection.anchorNode || !editor.contains(selection.anchorNode)) return
      let inLink = false
      let node: Node | null = selection.anchorNode
      while (node && node !== editor) {
        if (node.nodeType === 1 && (node as HTMLElement).tagName === 'A') inLink = true
        node = node.parentNode
      }
      setLinkActive(inLink)
      setFormat({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        block: blockName(selection.anchorNode, editor),
      })
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [mode])

  useEffect(() => {
    if (!popover) return
    const onPointerDown = (event: PointerEvent) => {
      if (!toolbarRef.current?.contains(event.target as Node)) setPopover(null)
    }
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setPopover(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [popover])

  useImperativeHandle(handleRef, () => ({
    focus: () => visualRef.current?.focus(),
    undo: () => { visualRef.current?.focus(); document.execCommand('undo'); sync() },
    redo: () => { visualRef.current?.focus(); document.execCommand('redo'); sync() },
    scrollToHeading: (index: number) => {
      const heading = visualRef.current?.querySelectorAll('h2, h3, h4')[index]
      heading?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }), [sync])

  function openPopover(next: Exclude<Popover, null>) {
    rememberSelection()
    if (next === 'link') {
      const anchor = window.getSelection()?.anchorNode?.parentElement?.closest('a')
      setLinkUrl(anchor?.getAttribute('href') ?? '')
    }
    if (next === 'imageUrl') {
      setImageUrl('')
      setImageAlt('')
    }
    setPopover((current) => (current === next ? null : next))
  }

  function applyLink() {
    const url = normalizeUrl(linkUrl)
    if (!url) {
      toast.error('Enter a web address, like https://example.com')
      return
    }
    const selection = window.getSelection()
    visualRef.current?.focus()
    restoreSelection()
    if (selection && selection.isCollapsed && !linkActive) {
      document.execCommand('insertHTML', false, `<a href="${escapeAttribute(url)}">${escapeAttribute(url)}</a>`)
    } else {
      document.execCommand('createLink', false, url)
    }
    sync()
    setPopover(null)
  }

  function removeLink() {
    run('unlink')
    setPopover(null)
  }

  function applyImageUrl() {
    const url = normalizeUrl(imageUrl)
    if (!url) {
      toast.error('Enter an image address that starts with https://')
      return
    }
    insertHtml(figureHtml(url, imageAlt.trim() || 'Article image', imageAlt.trim()))
    setPopover(null)
  }

  // ---- Slash menu --------------------------------------------------------

  const filteredSlash = slash
    ? SLASH_ITEMS.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(slash.query.toLowerCase()))
    : []

  function detectSlash() {
    const selection = window.getSelection()
    const editor = visualRef.current
    if (!editor || !selection || !selection.isCollapsed || !selection.anchorNode || selection.anchorNode.nodeType !== 3 || !editor.contains(selection.anchorNode)) {
      setSlash(null)
      return
    }
    const node = selection.anchorNode as Text
    const upToCaret = (node.textContent ?? '').slice(0, selection.anchorOffset)
    const match = /(?:^|\s)\/([a-z0-9 ]{0,18})$/i.exec(upToCaret)
    if (!match || (match[1].includes(' ') && !/\S/.test(match[1]))) {
      setSlash(null)
      return
    }
    const end = selection.anchorOffset
    const start = end - match[1].length - 1
    slashRange.current = { node, start, end }
    const caret = selection.getRangeAt(0).cloneRange()
    caret.collapse(true)
    const rect = caret.getClientRects()[0] ?? node.parentElement?.getBoundingClientRect()
    if (!rect) return
    // Open below the caret; if there is no room, open above it instead.
    const below = rect.bottom + 8
    const roomBelow = window.innerHeight - below > 300
    setSlash((current) => ({
      query: match[1],
      ...(roomBelow ? { top: below } : { bottom: window.innerHeight - rect.top + 8 }),
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
      index: current && current.query === match[1] ? current.index : 0,
    }))
  }

  function chooseSlash(item: SlashItem | undefined) {
    const target = slashRange.current
    setSlash(null)
    if (!item || !target) return
    const range = document.createRange()
    try {
      range.setStart(target.node, target.start)
      range.setEnd(target.node, target.end)
    } catch {
      return
    }
    range.deleteContents()
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    rememberSelection()
    if (item.id === 'hr') return insertHtml('<hr /><p><br /></p>')
    if (item.id === 'image') return setMediaTarget('figure')
    if (item.id === 'media-text') return setMediaTarget('media-text')
    setBlock(item.id as BlockName)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (slash && filteredSlash.length) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const step = event.key === 'ArrowDown' ? 1 : -1
        setSlash({ ...slash, index: (slash.index + step + filteredSlash.length) % filteredSlash.length })
        return
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault()
        chooseSlash(filteredSlash[slash.index])
        return
      }
    }
    if (slash && event.key === 'Escape') {
      event.preventDefault()
      setSlash(null)
      return
    }

    // Markdown shortcuts: "## " becomes a heading, "- " a list, "> " a quote.
    if (event.key === ' ' && !event.metaKey && !event.ctrlKey) {
      const editor = visualRef.current
      const selection = window.getSelection()
      if (!editor || !selection || !selection.isCollapsed || !selection.anchorNode) return
      const block = blockOf(selection.anchorNode, editor)
      if (block.tagName === 'LI') return
      const lead = document.createRange()
      if (block === editor) {
        lead.setStart(selection.anchorNode, 0)
      } else {
        lead.selectNodeContents(block)
      }
      lead.setEnd(selection.anchorNode, selection.anchorOffset)
      const typed = lead.toString()
      const hit = SHORTCUTS.find(([pattern]) => pattern.test(typed))
      if (hit) {
        event.preventDefault()
        lead.deleteContents()
        // Put the caret back explicitly: after the marker is removed the browser's
        // own selection can land in the previous block, and the format would follow it.
        const target = document.createRange()
        if (block === editor) {
          target.setStart(lead.startContainer, lead.startOffset)
        } else {
          // An empty block with no <br> collapses, and the browser then formats the block before it.
          if (!block.textContent) block.replaceChildren(document.createElement('br'))
          target.setStart(block, 0)
        }
        target.collapse(true)
        selection.removeAllRanges()
        selection.addRange(target)
        savedSelection.current = target.cloneRange()
        setBlock(hit[1])
      }
    }
  }

  function onPaste(event: ClipboardEvent<HTMLDivElement>) {
    const images = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
    if (images.length) {
      event.preventDefault()
      rememberSelection()
      images.forEach((file) => void uploadAndInsert(file))
      return
    }
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    event.preventDefault()
    rememberSelection()
    if (html) insertHtml(sanitizeEditableHtml(html))
    else if (text) insertHtml(textToHtml(text))
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    const images = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
    if (!images.length) return
    event.preventDefault()
    const doc = document as Document & { caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null }
    const range = document.caretRangeFromPoint?.(event.clientX, event.clientY)
      ?? (() => {
        const position = doc.caretPositionFromPoint?.(event.clientX, event.clientY)
        if (!position) return null
        const r = document.createRange()
        r.setStart(position.offsetNode, position.offset)
        return r
      })()
    if (range && visualRef.current?.contains(range.commonAncestorContainer)) savedSelection.current = range
    images.forEach((file) => void uploadAndInsert(file))
  }

  const currentBlock = BLOCKS.find((block) => block.id === format.block) ?? BLOCKS[0]
  const CurrentBlockIcon = currentBlock.icon

  return (
    <div className="admin-rte">
      <div className="admin-rte__toolbar" ref={toolbarRef} role="toolbar" aria-label="Formatting">
        {mode === 'visual' ? (
          <>
            <div className="relative">
              <button
                type="button"
                className="admin-tool admin-tool--wide"
                aria-haspopup="menu"
                aria-expanded={popover === 'block'}
                title="Text style"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => openPopover('block')}
              >
                <CurrentBlockIcon size={15} strokeWidth={1.8} aria-hidden="true" />
                <span>{currentBlock.label}</span>
                <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
              </button>
              {popover === 'block' && (
                <div className="admin-menu__panel admin-menu__panel--left" role="menu" aria-label="Text style">
                  {BLOCKS.map(({ id, label, icon: Icon }) => (
                    <button key={id} type="button" role="menuitemradio" aria-checked={format.block === id} className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={() => { setBlock(id); setPopover(null) }}>
                      <Icon size={15} strokeWidth={1.8} aria-hidden="true" /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <ToolButton label="Text size" onClick={() => openPopover('size')} active={popover === 'size'}><Type size={15} strokeWidth={1.8} /><ChevronDown size={11} strokeWidth={2} /></ToolButton>
              {popover === 'size' && (
                <div className="admin-menu__panel admin-menu__panel--left w-32" role="menu" aria-label="Text size">
                  {FONT_SIZES.map(({ label, value: size }) => (
                    <button key={label} type="button" role="menuitem" className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={() => { applyFontSize(size); setPopover(null) }}>
                      {size ? `${label} px` : 'Default size'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Bold" shortcut="⌘B" active={format.bold} onClick={() => run('bold')}><Bold size={15} strokeWidth={2} /></ToolButton>
            <ToolButton label="Italic" shortcut="⌘I" active={format.italic} onClick={() => run('italic')}><Italic size={15} strokeWidth={2} /></ToolButton>
            <ToolButton label="Underline" shortcut="⌘U" active={format.underline} onClick={() => run('underline')}><Underline size={15} strokeWidth={2} /></ToolButton>
            <ToolButton label="Strikethrough" active={format.strike} onClick={() => run('strikeThrough')}><Strikethrough size={15} strokeWidth={2} /></ToolButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <div className="relative">
              <ToolButton label="Link" active={linkActive || popover === 'link'} onClick={() => openPopover('link')}><Link2 size={15} strokeWidth={2} /></ToolButton>
              {popover === 'link' && (
                <div
                  className="admin-menu__panel admin-menu__panel--left admin-popform"
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } }}
                >
                  <label htmlFor="rte-link" className="admin-form-label">Link address</label>
                  <input id="rte-link" className="admin-input" autoFocus placeholder="https://" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
                  <div className="flex items-center justify-between gap-2">
                    {linkActive ? <button type="button" className="admin-link text-a-danger" onClick={removeLink}><Unlink size={13} aria-hidden="true" /> Remove link</button> : <span />}
                    <button type="button" className="admin-button admin-button--primary admin-button--sm" onClick={applyLink}>Apply</button>
                  </div>
                </div>
              )}
            </div>
            <ToolButton label="Highlight" onClick={() => wrapSelection('mark')}><Highlighter size={15} strokeWidth={1.8} /></ToolButton>
            <div className="relative">
              <ToolButton label="Text colour" onClick={() => openPopover('color')} active={popover === 'color'}><Palette size={15} strokeWidth={1.8} /></ToolButton>
              {popover === 'color' && (
                <div className="admin-menu__panel admin-menu__panel--left w-44" role="menu" aria-label="Text colour">
                  {COLORS.map((color) => (
                    <button key={color.value} type="button" role="menuitem" className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={() => { wrapSelection('span', color.value); setPopover(null) }}>
                      <span className="size-3.5 rounded-full" style={{ background: color.swatch }} aria-hidden="true" /> {color.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Bulleted list" active={format.block === 'ul'} onClick={() => run('insertUnorderedList')}><List size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Numbered list" active={format.block === 'ol'} onClick={() => run('insertOrderedList')}><ListOrdered size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Quote" active={format.block === 'blockquote'} onClick={() => setBlock(format.block === 'blockquote' ? 'p' : 'blockquote')}><Quote size={15} strokeWidth={1.8} /></ToolButton>
            <div className="relative">
              <ToolButton label="Insert image" onClick={() => openPopover('image')} active={popover === 'image' || popover === 'imageUrl'}><ImagePlus size={15} strokeWidth={1.8} /><ChevronDown size={11} strokeWidth={2} /></ToolButton>
              {popover === 'image' && (
                <div className="admin-menu__panel admin-menu__panel--left w-56" role="menu" aria-label="Insert image">
                  <button type="button" role="menuitem" className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={() => { setPopover(null); setMediaTarget('figure') }}>Media library…</button>
                  <button type="button" role="menuitem" className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={() => { setPopover(null); setMediaTarget('media-text') }}>Image and text layout…</button>
                  <button type="button" role="menuitem" className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={() => setPopover('imageUrl')}>From a web address…</button>
                </div>
              )}
              {popover === 'imageUrl' && (
                <div className="admin-menu__panel admin-menu__panel--left admin-popform" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyImageUrl() } }}>
                  <label htmlFor="rte-image-url" className="admin-form-label">Image address</label>
                  <input id="rte-image-url" className="admin-input" autoFocus placeholder="https://" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
                  <label htmlFor="rte-image-alt" className="admin-form-label">Description</label>
                  <input id="rte-image-alt" className="admin-input" placeholder="What’s in the image?" value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} />
                  <button type="button" className="admin-button admin-button--primary admin-button--sm self-end" onClick={applyImageUrl}>Insert</button>
                </div>
              )}
            </div>
            <ToolButton label="Clear formatting" onClick={() => run('removeFormat')}><Eraser size={15} strokeWidth={1.8} /></ToolButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Undo" shortcut="⌘Z" onClick={() => run('undo')}><Undo2 size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Redo" shortcut="⇧⌘Z" onClick={() => run('redo')}><Redo2 size={15} strokeWidth={1.8} /></ToolButton>
          </>
        ) : (
          <span className="px-2 text-xs text-a-ink-2">Editing the raw article markup. Switch back to Visual to keep writing.</span>
        )}
        <div className="ml-auto flex items-center gap-2 pl-2">
          {uploading > 0 && <span className="text-xs text-a-ink-2" role="status">Uploading…</span>}
          <div className="admin-segmented-control" role="group" aria-label="Editor view">
            <button type="button" aria-pressed={mode === 'visual'} onClick={() => setMode('visual')}>Visual</button>
            <button type="button" aria-pressed={mode === 'code'} onClick={() => { setPopover(null); setMode('code') }}><Code2 size={13} className="mr-1 inline" aria-hidden="true" />Code</button>
          </div>
        </div>
      </div>

      {mode === 'visual' ? (
        <div
          ref={visualRef}
          id="content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label="Article body"
          aria-multiline="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'content-error' : undefined}
          spellCheck
          onInput={() => { sync(); detectSlash() }}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace') detectSlash() }}
          onBlur={() => { rememberSelection(); onBlur?.() }}
          onPaste={onPaste}
          onDrop={onDrop}
          className="admin-rte__surface markdown-rich-content"
          data-placeholder="Start writing… type / for blocks"
        />
      ) : (
        <textarea
          id="content"
          className="admin-rte__code"
          value={value}
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-label="Article HTML"
        />
      )}

      {slash && filteredSlash.length > 0 && (
        <div className="admin-slash" style={{ top: slash.top, bottom: slash.bottom, left: slash.left }} role="listbox" aria-label="Insert a block">
          <p className="admin-menu__label">Blocks</p>
          {filteredSlash.map((item, index) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={index === slash.index}
                className="admin-slash__item"
                onMouseDown={(event) => event.preventDefault()}
                onMouseMove={() => setSlash({ ...slash, index })}
                onClick={() => chooseSlash(item)}
              >
                <span className="admin-slash__icon"><Icon size={16} strokeWidth={1.7} aria-hidden="true" /></span>
                <span><strong>{item.label}</strong><small>{item.hint}</small></span>
              </button>
            )
          })}
        </div>
      )}

      {error && <p id="content-error" className="admin-field-error" role="alert">{error}</p>}

      {mediaTarget && (
        <MediaPicker
          title={mediaTarget === 'media-text' ? 'Choose an image for the layout' : 'Insert an image'}
          onClose={() => setMediaTarget(null)}
          onPick={(picked) => insertPicked(picked, mediaTarget)}
        />
      )}
    </div>
  )
}

export default RichContentEditor
