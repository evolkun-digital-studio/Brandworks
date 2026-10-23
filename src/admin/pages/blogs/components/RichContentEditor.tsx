'use client'

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent, KeyboardEvent, MouseEvent, ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code2,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  ImageOff,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Quote,
  Redo2,
  Replace,
  Smile,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Trash2,
  Type,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import * as mediaApi from '../../../api/mediaAdminApi'
import MediaPicker from './MediaPicker'
import ImageDetailsDialog from './ImageDetailsDialog'
import type { PickedImage } from './MediaPicker'
import type { ImageDetails } from './ImageDetailsDialog'
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

type PopoverId = 'block' | 'size' | 'color' | 'align' | 'insert' | 'more' | 'link' | 'imageUrl' | 'emoji'
interface PopoverState { id: PopoverId; rect: DOMRect }
type BlockName = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'pre' | 'ul' | 'ol'
type Align = 'left' | 'center' | 'right' | 'justify'

const BLOCKS: Array<{ id: BlockName; label: string; hint: string; className: string }> = [
  { id: 'p', label: 'Paragraph', hint: '', className: 'text-[14px]' },
  { id: 'h1', label: 'Heading 1', hint: '#', className: 'text-[22px] font-bold tracking-[-0.03em]' },
  { id: 'h2', label: 'Heading 2', hint: '##', className: 'text-[19px] font-bold tracking-[-0.025em]' },
  { id: 'h3', label: 'Heading 3', hint: '###', className: 'text-[16px] font-semibold tracking-[-0.018em]' },
  { id: 'h4', label: 'Heading 4', hint: '####', className: 'text-[14px] font-semibold' },
  { id: 'blockquote', label: 'Quote', hint: '>', className: 'text-[14px] italic text-a-ink-2' },
  { id: 'pre', label: 'Code block', hint: '', className: 'font-mono text-[13px]' },
]

const ALIGN_OPTIONS: Array<{ id: Align; label: string; icon: LucideIcon }> = [
  { id: 'left', label: 'Align left', icon: AlignLeft },
  { id: 'center', label: 'Align centre', icon: AlignCenter },
  { id: 'right', label: 'Align right', icon: AlignRight },
  { id: 'justify', label: 'Justify', icon: AlignJustify },
]

const EMOJI = ['😀', '😊', '😍', '🤩', '😎', '🤔', '😅', '😂', '🙌', '👏', '👍', '🙏', '💡', '✨', '🔥', '🚀', '🎯', '✅', '❌', '⚠️', '📌', '📈', '📣', '🎉', '💬', '❤️', '⭐', '🌍', '📷', '🎬', '🎨', '✍️', '📚', '🧠', '⏰', '💰', '🤝', '👀', '➡️', '🔗']

interface SlashItem { id: string; label: string; hint: string; keywords: string; icon: LucideIcon }

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
  { id: 'emoji', label: 'Emoji', hint: 'Add a little character', keywords: 'emoji smile', icon: Smile },
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
      if (tag === 'li') return current.parentElement?.tagName === 'OL' ? 'ol' : 'ul'
    }
    current = current.parentNode
  }
  return 'p'
}

function elementOf(node: Node | null): Element | null {
  if (!node) return null
  return node.nodeType === 1 ? (node as Element) : node.parentElement
}

function normalizeUrl(value: string): string | null {
  const raw = value.trim()
  if (!raw) return null
  if (/^(?:https?:\/\/|mailto:|tel:|\/|#)/i.test(raw)) return raw
  if (/^[^\s]+\.[^\s]{2,}$/.test(raw)) return `https://${raw}`
  return null
}

function absoluteImageUrl(value: string): string {
  try {
    return new URL(value, window.location.origin).href
  } catch {
    return value
  }
}

/* ------------------------------------------------------------------------ */

function ToolButton({
  label,
  onClick,
  active,
  disabled,
  children,
  shortcut,
  className = '',
  expanded,
}: {
  label: string
  onClick: (element: HTMLButtonElement) => void
  active?: boolean
  disabled?: boolean
  children: ReactNode
  shortcut?: string
  className?: string
  expanded?: boolean
}) {
  return (
    <button
      type="button"
      className={`admin-tool ${className}`}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      aria-pressed={expanded === undefined ? active : undefined}
      aria-haspopup={expanded === undefined ? undefined : 'menu'}
      aria-expanded={expanded}
      data-active={active ? 'true' : undefined}
      disabled={disabled}
      onMouseDown={(event: MouseEvent) => event.preventDefault()}
      onClick={(event) => onClick(event.currentTarget)}
    >
      {children}
    </button>
  )
}

/** A menu that floats above everything, so the toolbar's scroll area can never clip it. */
function Floating({ rect, root, width = 232, label, children }: { rect: DOMRect; root: HTMLElement; width?: number; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: rect.bottom + 6, left: rect.left })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const height = element.offsetHeight
    let top = rect.bottom + 6
    if (top + height > window.innerHeight - 8) top = Math.max(8, rect.top - height - 6)
    const left = Math.min(Math.max(8, rect.left), window.innerWidth - element.offsetWidth - 8)
    setPosition({ top, left })
  }, [rect])

  return createPortal(
    <div ref={ref} className="admin-pop" data-rte-popover role="menu" aria-label={label} style={{ top: position.top, left: position.left, width }}>
      {children}
    </div>,
    root,
  )
}

interface RichContentEditorProps {
  value: string
  onChange: (next: string) => void
  onBlur?: () => void
  error?: string | null
  handleRef?: Ref<RichEditorHandle>
}

interface DetailsTarget {
  mode: 'insert' | 'edit'
  src: string
  initial: Partial<ImageDetails>
  image?: HTMLImageElement
}

function RichContentEditor({ value, onChange, onBlur, error, handleRef }: RichContentEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual')
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [picker, setPicker] = useState<{ purpose: 'figure' | 'media-text' | 'replace'; image?: HTMLImageElement } | null>(null)
  const [details, setDetails] = useState<DetailsTarget | null>(null)
  const [format, setFormat] = useState({ bold: false, italic: false, underline: false, strike: false, sub: false, sup: false, code: false, mark: false, align: 'left' as Align, block: 'p' as BlockName })
  const [linkUrl, setLinkUrl] = useState('')
  const [linkActive, setLinkActive] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(0)
  const [slash, setSlash] = useState<{ query: string; top?: number; bottom?: number; left: number; index: number } | null>(null)
  const [bubble, setBubble] = useState<{ top: number; bottom: number; left: number } | null>(null)
  const [imageBar, setImageBar] = useState<{ el: HTMLImageElement; rect: DOMRect } | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const savedSelection = useRef<Range | null>(null)
  const slashRange = useRef<{ node: Text; start: number; end: number } | null>(null)
  const didInitialize = useRef(false)
  const lastSyncedValue = useRef(value)

  useEffect(() => {
    setPortalRoot((rootRef.current?.closest('.admin-app') as HTMLElement | null) ?? document.body)
  }, [])

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

  function currentRange(): Range | null {
    const selection = window.getSelection()
    const editor = visualRef.current
    if (!selection || !editor) return null
    restoreSelection()
    if (selection.rangeCount === 0) return null
    const range = selection.getRangeAt(0)
    return editor.contains(range.commonAncestorContainer) ? range : null
  }

  function selectContents(node: Node) {
    const selection = window.getSelection()
    const next = document.createRange()
    next.selectNodeContents(node)
    selection?.removeAllRanges()
    selection?.addRange(next)
    savedSelection.current = next.cloneRange()
  }

  /** Wraps the selection in a tag, or removes that wrapper when the selection is already inside one. */
  function toggleWrap(tagName: 'mark' | 'code') {
    const editor = visualRef.current
    const range = currentRange()
    if (!editor || !range) return
    const existing = elementOf(range.commonAncestorContainer)?.closest(tagName)
    if (existing && editor.contains(existing) && !existing.closest('pre')) {
      const parent = existing.parentNode
      existing.replaceWith(...Array.from(existing.childNodes))
      parent?.normalize()
      sync()
      return
    }
    if (range.collapsed) return
    const wrapper = document.createElement(tagName)
    try {
      range.surroundContents(wrapper)
    } catch {
      wrapper.appendChild(range.extractContents())
      range.insertNode(wrapper)
    }
    selectContents(wrapper)
    sync()
  }

  function applyData(kind: 'color' | 'size', dataValue: string | null) {
    const editor = visualRef.current
    const range = currentRange()
    if (!editor || !range) return
    const attribute = kind === 'color' ? 'data-color' : 'data-font-size'

    // Choosing "none" lifts the attribute from every span the selection touches.
    if (!dataValue) {
      const scope = elementOf(range.commonAncestorContainer)
      const spans = new Set<Element>()
      const closest = scope?.closest(`span[${attribute}]`)
      if (closest && editor.contains(closest)) spans.add(closest)
      scope?.querySelectorAll(`span[${attribute}]`).forEach((span) => { if (range.intersectsNode(span)) spans.add(span) })
      spans.forEach((span) => {
        if (span.attributes.length === 1) span.replaceWith(...Array.from(span.childNodes))
        else span.removeAttribute(attribute)
      })
      sync()
      return
    }

    if (range.collapsed) return
    const wrapper = document.createElement('span')
    wrapper.setAttribute(attribute, dataValue)
    try {
      range.surroundContents(wrapper)
    } catch {
      wrapper.appendChild(range.extractContents())
      range.insertNode(wrapper)
    }
    selectContents(wrapper)
    sync()
  }

  function setAlign(align: Align) {
    const editor = visualRef.current
    const range = currentRange()
    if (!editor || !range) return
    const candidates = Array.from(editor.querySelectorAll('p, h1, h2, h3, h4, blockquote, li')).filter((element) => range.intersectsNode(element))
    const blocks = candidates.filter((element) => !element.querySelector('p, h1, h2, h3, h4, li, blockquote'))
    if (!blocks.length) {
      const block = blockOf(range.startContainer, editor)
      if (block !== editor) blocks.push(block)
    }
    blocks.forEach((block) => {
      if (align === 'left') block.removeAttribute('data-align')
      else block.setAttribute('data-align', align)
    })
    sync()
  }

  function insertPicked(picked: PickedImage) {
    const purpose = picker?.purpose ?? 'figure'
    if (purpose === 'replace' && picker?.image) {
      const image = picker.image
      image.src = picked.url
      if (!image.alt && picked.asset.altText) image.alt = picked.asset.altText
      sync()
      setPicker(null)
      setImageBar(null)
      return
    }
    setPicker(null)
    setDetails({
      mode: 'insert',
      src: picked.url,
      initial: { alt: picked.asset.altText, title: '', caption: picked.asset.caption, layout: purpose === 'media-text' ? 'media-text' : 'figure' },
    })
  }

  function submitDetails(result: ImageDetails) {
    if (!details) return
    if (details.mode === 'edit' && details.image) {
      const image = details.image
      image.setAttribute('alt', result.alt)
      if (result.title) image.setAttribute('title', result.title)
      else image.removeAttribute('title')
      let figure = image.closest('figure')
      if (!figure && result.caption) {
        figure = document.createElement('figure')
        image.replaceWith(figure)
        figure.appendChild(image)
      }
      if (figure) {
        let caption = figure.querySelector('figcaption')
        if (result.caption) {
          if (!caption) {
            caption = document.createElement('figcaption')
            figure.appendChild(caption)
          }
          caption.textContent = result.caption
        } else {
          caption?.remove()
        }
      }
      sync()
      setDetails(null)
      setImageBar(null)
      return
    }
    insertHtml(result.layout === 'media-text'
      ? mediaTextHtml(details.src, result.alt, result.caption, 'Add supporting text here.', result.title)
      : figureHtml(details.src, result.alt, result.caption, result.title))
    setDetails(null)
  }

  async function uploadAndDescribe(file: File) {
    if (!file.type.startsWith('image/')) return
    setUploading((count) => count + 1)
    try {
      const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ') || 'Article image'
      const { asset } = await mediaApi.uploadMedia(file, name, '')
      setDetails({ mode: 'insert', src: absoluteImageUrl(asset.publicUrl), initial: { alt: asset.altText || name, caption: asset.caption, layout: 'figure' } })
    } catch (uploadError) {
      toast.error(uploadError instanceof Error ? uploadError.message : 'Could not upload the image.')
    } finally {
      setUploading((count) => count - 1)
    }
  }

  function removeImage(image: HTMLImageElement) {
    const figure = image.closest('figure')
    ;(figure ?? image).remove()
    sync()
    setImageBar(null)
  }

  function editImage(image: HTMLImageElement) {
    const caption = image.closest('figure')?.querySelector('figcaption')?.textContent ?? ''
    setDetails({ mode: 'edit', src: image.currentSrc || image.src, image, initial: { alt: image.getAttribute('alt') ?? '', title: image.getAttribute('title') ?? '', caption } })
  }

  // The toolbar reflects whatever the caret is inside; the bubble follows a text selection.
  useEffect(() => {
    if (mode !== 'visual') return
    function update() {
      const editor = visualRef.current
      const selection = window.getSelection()
      if (!editor || !selection || !selection.anchorNode || !editor.contains(selection.anchorNode)) {
        setBubble(null)
        return
      }
      const anchorElement = elementOf(selection.anchorNode)
      const block = blockOf(selection.anchorNode, editor)
      setLinkActive(Boolean(anchorElement?.closest('a')))
      setFormat({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strike: document.queryCommandState('strikeThrough'),
        sub: document.queryCommandState('subscript'),
        sup: document.queryCommandState('superscript'),
        code: Boolean(anchorElement?.closest('code') && !anchorElement.closest('pre')),
        mark: Boolean(anchorElement?.closest('mark')),
        align: (block.getAttribute('data-align') as Align | null) ?? 'left',
        block: blockName(selection.anchorNode, editor),
      })
      if (!selection.isCollapsed && selection.toString().trim() && editor.contains(selection.focusNode)) {
        const rect = selection.getRangeAt(0).getBoundingClientRect()
        setBubble(rect.width > 0 ? { top: rect.top, bottom: rect.bottom, left: rect.left + rect.width / 2 } : null)
      } else {
        setBubble(null)
      }
    }
    document.addEventListener('selectionchange', update)
    return () => document.removeEventListener('selectionchange', update)
  }, [mode])

  // Popovers close on an outside press, Escape, or scroll — their anchor would have moved.
  useEffect(() => {
    if (!popover) return
    const inside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false
      if (toolbarRef.current?.contains(target)) return true
      return Boolean(elementOf(target)?.closest('[data-rte-popover], [data-rte-bubble]'))
    }
    const onPointerDown = (event: PointerEvent) => { if (!inside(event.target)) setPopover(null) }
    const onKeyDown = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setPopover(null) }
    const onScroll = (event: Event) => { if (!inside(event.target)) setPopover(null) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [popover])

  // The image toolbar stays attached to the image while the page moves.
  useEffect(() => {
    if (!imageBar) return
    const el = imageBar.el
    const reposition = () => {
      if (!el.isConnected) return setImageBar(null)
      setImageBar({ el, rect: el.getBoundingClientRect() })
    }
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target === el || target?.closest('[data-rte-imagebar]')) return
      setImageBar(null)
    }
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [imageBar])

  useImperativeHandle(handleRef, () => ({
    focus: () => visualRef.current?.focus(),
    undo: () => { visualRef.current?.focus(); document.execCommand('undo'); sync() },
    redo: () => { visualRef.current?.focus(); document.execCommand('redo'); sync() },
    scrollToHeading: (index: number) => {
      const heading = visualRef.current?.querySelectorAll('h2, h3, h4')[index]
      heading?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }), [sync])

  function openPopover(id: PopoverId, anchor: HTMLElement) {
    rememberSelection()
    if (id === 'link') {
      const link = elementOf(window.getSelection()?.anchorNode ?? null)?.closest('a')
      setLinkUrl(link?.getAttribute('href') ?? '')
    }
    if (id === 'imageUrl') setImageUrl('')
    const rect = anchor.getBoundingClientRect()
    setPopover((current) => (current?.id === id ? null : { id, rect }))
  }

  function closePopover() {
    setPopover(null)
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
    closePopover()
  }

  function continueWithImageUrl() {
    const url = normalizeUrl(imageUrl)
    if (!url) {
      toast.error('Enter an image address that starts with https://')
      return
    }
    closePopover()
    setDetails({ mode: 'insert', src: url, initial: { layout: 'figure' } })
  }

  function startInsert(choice: string) {
    closePopover()
    rememberSelection()
    if (choice === 'image') setPicker({ purpose: 'figure' })
    else if (choice === 'media-text') setPicker({ purpose: 'media-text' })
    else if (choice === 'hr') insertHtml('<hr /><p><br /></p>')
    else if (choice === 'pre') setBlock('pre')
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
    if (item.id === 'emoji') {
      const rect = (target.node.parentElement ?? visualRef.current)?.getBoundingClientRect()
      if (rect) setPopover({ id: 'emoji', rect })
      return
    }
    if (item.id === 'hr' || item.id === 'image' || item.id === 'media-text') return startInsert(item.id)
    setBlock(item.id as BlockName)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    setImageBar(null)
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

    // Tab nests list items, Shift+Tab lifts them back out.
    if (event.key === 'Tab' && !event.metaKey && !event.ctrlKey) {
      const anchor = elementOf(window.getSelection()?.anchorNode ?? null)
      if (anchor?.closest('li')) {
        event.preventDefault()
        document.execCommand(event.shiftKey ? 'outdent' : 'indent')
        sync()
        return
      }
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
      void uploadAndDescribe(images[0])
      return
    }
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')
    event.preventDefault()
    rememberSelection()
    // A pasted web address becomes a link: over selected text it links that text.
    const pasted = text.trim()
    if (/^https?:\/\/\S+$/i.test(pasted)) {
      const selection = window.getSelection()
      if (selection && !selection.isCollapsed) run('createLink', pasted)
      else insertHtml(`<a href="${escapeAttribute(pasted)}">${escapeAttribute(pasted)}</a>`)
      return
    }
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
    void uploadAndDescribe(images[0])
  }

  function onSurfaceClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    if (target.tagName === 'IMG') setImageBar({ el: target as HTMLImageElement, rect: target.getBoundingClientRect() })
    else setImageBar(null)
  }

  const currentBlock = BLOCKS.find((block) => block.id === format.block) ?? BLOCKS[0]
  const AlignIcon = ALIGN_OPTIONS.find((option) => option.id === format.align)?.icon ?? AlignLeft
  const isOpen = (id: PopoverId) => popover?.id === id

  const menuItem = (key: string, icon: ReactNode, label: string, action: () => void, extra?: ReactNode, checked?: boolean) => (
    <button key={key} type="button" role="menuitem" aria-checked={checked} className="admin-menu__item" onMouseDown={(event) => event.preventDefault()} onClick={action}>
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {extra}
    </button>
  )
  const tick = (on: boolean) => (on ? <Check size={14} aria-hidden="true" /> : null)

  const imageBroken = imageBar ? imageBar.el.complete && imageBar.el.naturalWidth === 0 : false

  return (
    <div className="admin-rte" ref={rootRef}>
      <div className="admin-rte__toolbar" ref={toolbarRef} role="toolbar" aria-label="Formatting">
        {mode === 'visual' ? (
          <>
            <button
              type="button"
              className="admin-tool admin-tool--wide"
              aria-haspopup="menu"
              aria-expanded={isOpen('block')}
              title="Text style"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => openPopover('block', event.currentTarget)}
            >
              <span className="min-w-[66px] text-left">{currentBlock.label}</span>
              <ChevronDown size={12} strokeWidth={2} aria-hidden="true" />
            </button>
            <ToolButton label="Text size" expanded={isOpen('size')} active={isOpen('size')} onClick={(el) => openPopover('size', el)}><Type size={15} strokeWidth={1.8} /><ChevronDown size={11} strokeWidth={2} /></ToolButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Bold" shortcut="⌘B" active={format.bold} onClick={() => run('bold')}><Bold size={15} strokeWidth={2.2} /></ToolButton>
            <ToolButton label="Italic" shortcut="⌘I" active={format.italic} onClick={() => run('italic')}><Italic size={15} strokeWidth={2} /></ToolButton>
            <ToolButton label="Underline" shortcut="⌘U" active={format.underline} onClick={() => run('underline')}><Underline size={15} strokeWidth={2} /></ToolButton>
            <ToolButton label="Strikethrough" active={format.strike} onClick={() => run('strikeThrough')}><Strikethrough size={15} strokeWidth={2} /></ToolButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Link" active={linkActive || isOpen('link')} onClick={(el) => openPopover('link', el)}><Link2 size={15} strokeWidth={2} /></ToolButton>
            <ToolButton label="Text colour and highlight" expanded={isOpen('color')} active={isOpen('color')} onClick={(el) => openPopover('color', el)}><Palette size={15} strokeWidth={1.8} /><ChevronDown size={11} strokeWidth={2} /></ToolButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Alignment" expanded={isOpen('align')} active={isOpen('align')} onClick={(el) => openPopover('align', el)}><AlignIcon size={15} strokeWidth={1.8} /><ChevronDown size={11} strokeWidth={2} /></ToolButton>
            <ToolButton label="Bulleted list" active={format.block === 'ul'} onClick={() => run('insertUnorderedList')}><List size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Numbered list" active={format.block === 'ol'} onClick={() => run('insertOrderedList')}><ListOrdered size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Quote" active={format.block === 'blockquote'} onClick={() => setBlock(format.block === 'blockquote' ? 'p' : 'blockquote')}><Quote size={15} strokeWidth={1.8} /></ToolButton>
            <span className="admin-tool-sep" aria-hidden="true" />
            <ToolButton label="Insert" expanded={isOpen('insert') || isOpen('imageUrl') || isOpen('emoji')} active={isOpen('insert')} onClick={(el) => openPopover('insert', el)} className="admin-tool--wide"><Plus size={15} strokeWidth={2} /><span>Insert</span><ChevronDown size={11} strokeWidth={2} /></ToolButton>
            <ToolButton label="More formatting" expanded={isOpen('more')} active={isOpen('more')} onClick={(el) => openPopover('more', el)}><MoreHorizontal size={16} strokeWidth={1.8} /></ToolButton>
            {/* On wide screens undo/redo live in the editor header; phones get them here. */}
            <span className="admin-tool-sep md:hidden" aria-hidden="true" />
            <ToolButton label="Undo" shortcut="⌘Z" className="md:hidden" onClick={() => run('undo')}><Undo2 size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Redo" shortcut="⇧⌘Z" className="md:hidden" onClick={() => run('redo')}><Redo2 size={15} strokeWidth={1.8} /></ToolButton>
          </>
        ) : (
          <>
            <span className="px-2 text-xs text-a-ink-2">Editing the article’s HTML.</span>
            <button type="button" className="admin-button admin-button--sm ml-auto" onClick={() => setMode('visual')}>Back to visual editor</button>
          </>
        )}
        {uploading > 0 && <span className="ml-auto pl-2 text-xs text-a-ink-2" role="status">Uploading…</span>}
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
          onClick={onSurfaceClick}
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

      {error && <p id="content-error" className="admin-field-error" role="alert">{error}</p>}

      {/* Floating UI lives in a portal so no scroll area or blur can clip it. */}
      {portalRoot && popover?.id === 'block' && (
        <Floating rect={popover.rect} root={portalRoot} width={252} label="Text style">
          {BLOCKS.map((block) => (
            <button key={block.id} type="button" role="menuitemradio" aria-checked={format.block === block.id} className="admin-menu__item admin-menu__item--tall" onMouseDown={(event) => event.preventDefault()} onClick={() => { setBlock(block.id); closePopover() }}>
              <span className="grid size-4 flex-none place-items-center">{format.block === block.id && <Check size={14} strokeWidth={2.4} aria-hidden="true" />}</span>
              <span className={`flex-1 text-left ${block.className}`}>{block.label}</span>
              {block.hint && <kbd>{block.hint}</kbd>}
            </button>
          ))}
        </Floating>
      )}

      {portalRoot && popover?.id === 'size' && (
        <Floating rect={popover.rect} root={portalRoot} width={236} label="Text size">
          <p className="admin-menu__label">Text size</p>
          <div className="grid grid-cols-4 gap-1 p-1">
            {FONT_SIZES.map(({ label, value: size }) => (
              <button key={label} type="button" role="menuitem" className="admin-pill h-8 justify-center" onMouseDown={(event) => event.preventDefault()} onClick={() => { applyData('size', size || null); closePopover() }}>
                {size ? label : 'Auto'}
              </button>
            ))}
          </div>
        </Floating>
      )}

      {portalRoot && popover?.id === 'color' && (
        <Floating rect={popover.rect} root={portalRoot} width={236} label="Colour">
          <p className="admin-menu__label">Text colour</p>
          <div className="flex flex-wrap gap-2 p-2">
            {COLORS.map((color) => (
              <button key={color.value} type="button" role="menuitem" aria-label={color.label} title={color.label} className="admin-swatch" style={{ background: color.swatch }} onMouseDown={(event) => event.preventDefault()} onClick={() => { applyData('color', color.value); closePopover() }} />
            ))}
            <button type="button" role="menuitem" aria-label="Default colour" title="Default colour" className="admin-swatch admin-swatch--none" onMouseDown={(event) => event.preventDefault()} onClick={() => { applyData('color', null); closePopover() }} />
          </div>
          <div className="admin-menu__sep" />
          {menuItem('highlight', <Highlighter size={15} strokeWidth={1.8} aria-hidden="true" />, format.mark ? 'Remove highlight' : 'Highlight', () => { toggleWrap('mark'); closePopover() })}
        </Floating>
      )}

      {portalRoot && popover?.id === 'align' && (
        <Floating rect={popover.rect} root={portalRoot} width={200} label="Alignment">
          {ALIGN_OPTIONS.map(({ id, label, icon: Icon }) => menuItem(id, <Icon size={15} strokeWidth={1.8} aria-hidden="true" />, label, () => { setAlign(id); closePopover() }, tick(format.align === id), format.align === id))}
        </Floating>
      )}

      {portalRoot && popover?.id === 'insert' && (
        <Floating rect={popover.rect} root={portalRoot} width={268} label="Insert">
          <p className="admin-menu__label">Media</p>
          {menuItem('image', <ImagePlus size={15} strokeWidth={1.8} aria-hidden="true" />, 'Image from library', () => startInsert('image'))}
          {menuItem('media-text', <ImagePlus size={15} strokeWidth={1.8} aria-hidden="true" />, 'Image and text', () => startInsert('media-text'))}
          {menuItem('image-url', <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />, 'Image from a web address…', () => { setImageUrl(''); setPopover({ id: 'imageUrl', rect: popover.rect }) })}
          <div className="admin-menu__sep" />
          <p className="admin-menu__label">Blocks</p>
          {menuItem('hr', <Minus size={15} strokeWidth={1.8} aria-hidden="true" />, 'Divider', () => startInsert('hr'))}
          {menuItem('pre', <SquareCode size={15} strokeWidth={1.8} aria-hidden="true" />, 'Code block', () => startInsert('pre'))}
          {menuItem('emoji', <Smile size={15} strokeWidth={1.8} aria-hidden="true" />, 'Emoji', () => setPopover({ id: 'emoji', rect: popover.rect }))}
        </Floating>
      )}

      {portalRoot && popover?.id === 'more' && (
        <Floating rect={popover.rect} root={portalRoot} width={236} label="More formatting">
          {menuItem('code', <Code2 size={15} strokeWidth={1.8} aria-hidden="true" />, 'Inline code', () => { toggleWrap('code'); closePopover() }, tick(format.code), format.code)}
          {menuItem('sub', <Subscript size={15} strokeWidth={1.8} aria-hidden="true" />, 'Subscript', () => { run('subscript'); closePopover() }, tick(format.sub), format.sub)}
          {menuItem('sup', <Superscript size={15} strokeWidth={1.8} aria-hidden="true" />, 'Superscript', () => { run('superscript'); closePopover() }, tick(format.sup), format.sup)}
          <div className="admin-menu__sep" />
          {menuItem('indent', <IndentIncrease size={15} strokeWidth={1.8} aria-hidden="true" />, 'Increase indent', () => { run('indent'); closePopover() }, <kbd>Tab</kbd>)}
          {menuItem('outdent', <IndentDecrease size={15} strokeWidth={1.8} aria-hidden="true" />, 'Decrease indent', () => { run('outdent'); closePopover() }, <kbd>⇧Tab</kbd>)}
          <div className="admin-menu__sep" />
          {menuItem('clear', <Eraser size={15} strokeWidth={1.8} aria-hidden="true" />, 'Clear formatting', () => { run('removeFormat'); closePopover() })}
          {menuItem('code-view', <Code2 size={15} strokeWidth={1.8} aria-hidden="true" />, 'Edit HTML code', () => { closePopover(); setMode('code') })}
        </Floating>
      )}

      {portalRoot && popover?.id === 'emoji' && (
        <Floating rect={popover.rect} root={portalRoot} width={268} label="Emoji">
          <div className="grid max-h-56 grid-cols-8 gap-0.5 overflow-y-auto p-1">
            {EMOJI.map((emoji) => (
              <button key={emoji} type="button" role="menuitem" className="admin-emoji" onMouseDown={(event) => event.preventDefault()} onClick={() => { run('insertText', emoji); closePopover() }}>{emoji}</button>
            ))}
          </div>
        </Floating>
      )}

      {portalRoot && popover?.id === 'link' && (
        <Floating rect={popover.rect} root={portalRoot} width={300} label="Link">
          <div className="flex flex-col gap-2 p-2" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } }}>
            <label htmlFor="rte-link" className="admin-form-label mb-0">Link address</label>
            <input id="rte-link" className="admin-input" autoFocus placeholder="https://" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} />
            <div className="flex items-center justify-between gap-2">
              {linkActive ? <button type="button" className="admin-link text-a-danger" onClick={() => { run('unlink'); closePopover() }}><Unlink size={13} aria-hidden="true" /> Remove link</button> : <span />}
              <button type="button" className="admin-button admin-button--primary admin-button--sm" onClick={applyLink}>Apply</button>
            </div>
          </div>
        </Floating>
      )}

      {portalRoot && popover?.id === 'imageUrl' && (
        <Floating rect={popover.rect} root={portalRoot} width={300} label="Image address">
          <div className="flex flex-col gap-2 p-2" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); continueWithImageUrl() } }}>
            <label htmlFor="rte-image-url" className="admin-form-label mb-0">Image address</label>
            <input id="rte-image-url" className="admin-input" autoFocus placeholder="https://" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
            <button type="button" className="admin-button admin-button--primary admin-button--sm self-end" onClick={continueWithImageUrl}>Continue</button>
          </div>
        </Floating>
      )}

      {portalRoot && bubble && mode === 'visual' && !popover && createPortal(
        <div
          className="admin-bubble"
          data-rte-bubble
          role="toolbar"
          aria-label="Selection formatting"
          style={bubble.top > 64 ? { top: bubble.top - 46, left: bubble.left } : { top: bubble.bottom + 10, left: bubble.left }}
        >
          <ToolButton label="Heading 2" active={format.block === 'h2'} onClick={() => setBlock(format.block === 'h2' ? 'p' : 'h2')}><Heading2 size={15} strokeWidth={1.9} /></ToolButton>
          <ToolButton label="Heading 3" active={format.block === 'h3'} onClick={() => setBlock(format.block === 'h3' ? 'p' : 'h3')}><Heading3 size={15} strokeWidth={1.9} /></ToolButton>
          <span className="admin-tool-sep" aria-hidden="true" />
          <ToolButton label="Bold" active={format.bold} onClick={() => run('bold')}><Bold size={15} strokeWidth={2.2} /></ToolButton>
          <ToolButton label="Italic" active={format.italic} onClick={() => run('italic')}><Italic size={15} strokeWidth={2} /></ToolButton>
          <ToolButton label="Underline" active={format.underline} onClick={() => run('underline')}><Underline size={15} strokeWidth={2} /></ToolButton>
          <span className="admin-tool-sep" aria-hidden="true" />
          <ToolButton label="Link" active={linkActive} onClick={(el) => openPopover('link', el)}><Link2 size={15} strokeWidth={2} /></ToolButton>
          <ToolButton label="Highlight" active={format.mark} onClick={() => toggleWrap('mark')}><Highlighter size={15} strokeWidth={1.8} /></ToolButton>
          <ToolButton label="Inline code" active={format.code} onClick={() => toggleWrap('code')}><Code2 size={15} strokeWidth={1.8} /></ToolButton>
        </div>,
        portalRoot,
      )}

      {portalRoot && imageBar && mode === 'visual' && createPortal(
        <>
          <div className="admin-image-outline" aria-hidden="true" style={{ top: imageBar.rect.top, left: imageBar.rect.left, width: imageBar.rect.width, height: imageBar.rect.height }} />
          <div
            className="admin-bubble"
            data-rte-imagebar
            role="toolbar"
            aria-label="Image"
            style={{ top: Math.max(imageBar.rect.top + 8, 64), left: Math.max(imageBar.rect.left + imageBar.rect.width / 2, 170) }}
          >
            {imageBroken && <span className="flex items-center gap-1.5 px-2 text-xs text-a-warning"><ImageOff size={13} aria-hidden="true" /> Can’t load this image</span>}
            <button type="button" className="admin-bubble__text" onClick={() => editImage(imageBar.el)}><Pencil size={13} aria-hidden="true" /> Alt text &amp; details</button>
            <button type="button" className="admin-bubble__text" onClick={() => { rememberSelection(); setPicker({ purpose: 'replace', image: imageBar.el }) }}><Replace size={13} aria-hidden="true" /> Replace</button>
            <button type="button" className="admin-bubble__text admin-bubble__text--danger" onClick={() => removeImage(imageBar.el)}><Trash2 size={13} aria-hidden="true" /> Delete</button>
          </div>
        </>,
        portalRoot,
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

      {picker && (
        <MediaPicker
          title={picker.purpose === 'replace' ? 'Replace image' : picker.purpose === 'media-text' ? 'Choose an image for the layout' : 'Insert an image'}
          onClose={() => setPicker(null)}
          onPick={insertPicked}
        />
      )}

      {details && (
        <ImageDetailsDialog
          src={details.src}
          mode={details.mode}
          initial={details.initial}
          onCancel={() => setDetails(null)}
          onSubmit={submitDetails}
          onReplace={details.mode === 'edit' && details.image ? () => { const image = details.image; setDetails(null); setPicker({ purpose: 'replace', image }) } : undefined}
        />
      )}
    </div>
  )
}

export default RichContentEditor
