'use client'

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent, KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
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
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
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
  Plus,
  Quote,
  Redo2,
  Smile,
  SquareCode,
  Strikethrough,
  Subscript,
  Superscript,
  Type,
  Underline,
  Undo2,
  Unlink,
} from 'lucide-react'
import { toast } from 'sonner'
import * as mediaApi from '../../../api/mediaAdminApi'
import MediaPicker from './MediaPicker'
import ImageDetailsDialog from './ImageDetailsDialog'
import ImageToolbar from './ImageToolbar'
import ImageUrlPanel from './ImageUrlPanel'
import { useImageDrag, useImageResize } from './useImageGestures'
import type { ResizeCorner } from './useImageGestures'
import type { ImageToolbarAction } from './ImageToolbar'
import type { PickedImage } from './MediaPicker'
import type { ImageDetails } from './ImageDetailsDialog'
import {
  COLORS,
  FONT_SIZES,
  escapeAttribute,
  markdownToEditableHtml,
  mediaTextHtml,
  sanitizeEditableHtml,
  textToHtml,
} from '../lib/richContent'
import { captureSelection, EditorHistory, restoreSelectionSnapshot } from '../lib/editorHistory'
import type { EditorSnapshot } from '../lib/editorHistory'
import {
  computeDropGap,
  createFigure,
  createUploadPlaceholder,
  deleteImage,
  ensureTrailingParagraph,
  imageNextToCaret,
  initialImageWidth,
  isMediaTextFigure,
  moveBlock,
  movableUnit,
  nudgeBlock,
  paintUploadPlaceholder,
  placeBlocks,
  placeCaretAtEnd,
  placeCaretAtStart,
  prepareImages,
  replaceImageSource,
  resolveInsertionPoint,
  scrollParent,
  serializeEditorHtml,
  setImageAlign,
  setImageCaption,
  setImageLink,
  setImageWidth,
  setImageWrap,
  toggleImageCaption,
  UPLOAD_ATTRIBUTE,
  validateImageFile,
} from '../lib/imageBlocks'
import type { UploadView } from '../lib/imageBlocks'

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

interface ImageMeta {
  naturalWidth?: number | null
  naturalHeight?: number | null
  vector?: boolean
}

interface DetailsTarget {
  mode: 'insert' | 'edit'
  src: string
  initial: Partial<ImageDetails>
  figure?: HTMLElement
  meta?: ImageMeta
}

interface StageBox { top: number; left: number; width: number; height: number }
interface ImageView { figure: HTMLElement; rect: DOMRect; stage: StageBox }

interface UploadEntry {
  file: File
  thumbnail: string
  state: 'uploading' | 'error' | 'done' | 'cancelled'
  percent: number
  message: string
  natural: { width: number; height: number } | null
  publicUrl?: string
  mimeType?: string
  abort?: () => void
}

const VECTOR_TYPE = 'image/svg+xml'
const HANDLE_CORNERS: ResizeCorner[] = ['nw', 'ne', 'sw', 'se']

function uploadView(entry: UploadEntry): UploadView {
  return { name: entry.file.name, thumbnail: entry.thumbnail, state: entry.state === 'error' ? 'error' : 'uploading', percent: entry.percent, message: entry.message }
}

function RichContentEditor({ value, onChange, onBlur, error, handleRef }: RichContentEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual')
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [picker, setPicker] = useState<{ purpose: 'figure' | 'media-text' | 'replace'; figure?: HTMLElement } | null>(null)
  const [details, setDetails] = useState<DetailsTarget | null>(null)
  const [format, setFormat] = useState({ bold: false, italic: false, underline: false, strike: false, sub: false, sup: false, code: false, mark: false, align: 'left' as Align, block: 'p' as BlockName })
  const [linkUrl, setLinkUrl] = useState('')
  const [linkActive, setLinkActive] = useState(false)
  const [uploading, setUploading] = useState(0)
  const [slash, setSlash] = useState<{ query: string; top?: number; bottom?: number; left: number; index: number } | null>(null)
  const [bubble, setBubble] = useState<{ top: number; bottom: number; left: number } | null>(null)
  const [selectedImage, setSelectedImage] = useState<(ImageView & { version: number }) | null>(null)
  const [hoveredImage, setHoveredImage] = useState<ImageView | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)
  const [history] = useState(() => new EditorHistory())

  const rootRef = useRef<HTMLDivElement>(null)
  const visualRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const savedSelection = useRef<Range | null>(null)
  const slashRange = useRef<{ node: Text; start: number; end: number } | null>(null)
  const loadedEditor = useRef<HTMLElement | null>(null)
  const lastSyncedValue = useRef(value)
  const selectedFigure = useRef<HTMLElement | null>(null)
  const typingTimer = useRef(0)
  const uploads = useRef(new Map<string, UploadEntry>())
  const nextUploadId = useRef(1)

  useEffect(() => {
    setPortalRoot((rootRef.current?.closest('.admin-app') as HTMLElement | null) ?? document.body)
  }, [])

  const snapshot = useCallback((): EditorSnapshot | null => {
    const editor = visualRef.current
    if (!editor) return null
    const image = selectedFigure.current ? Array.from(editor.querySelectorAll('figure')).indexOf(selectedFigure.current as HTMLElement) : -1
    return { html: editor.innerHTML, selection: captureSelection(editor), image }
  }, [])

  useEffect(() => {
    if (mode !== 'visual') return
    const editor = visualRef.current
    if (!editor) return
    const fresh = loadedEditor.current !== editor
    if (!fresh && value === lastSyncedValue.current) return
    if (!fresh && editor.innerHTML !== '' && document.activeElement === editor) return
    editor.innerHTML = markdownToEditableHtml(value)
    prepareImages(editor)
    ensureTrailingParagraph(editor)
    loadedEditor.current = editor
    lastSyncedValue.current = value
    selectedFigure.current = null
    savedSelection.current = null
    setSelectedImage(null)
    setHoveredImage(null)
    const initial = snapshot()
    if (initial) history.reset(initial)
  }, [history, mode, snapshot, value])

  useEffect(() => {
    if (mode === 'visual') {
      // Paragraphs, not <div>s, are what Enter should create.
      try { document.execCommand('defaultParagraphSeparator', false, 'p') } catch { /* unsupported */ }
    }
  }, [mode])

  /** Publishes the current article HTML without adding an undo step. */
  const emit = useCallback(() => {
    const editor = visualRef.current
    if (!editor) return
    if (editor.innerHTML === '<br>') editor.innerHTML = ''
    const html = serializeEditorHtml(editor)
    lastSyncedValue.current = html
    onChange(html)
  }, [onChange])

  const commitHistory = useCallback(() => {
    window.clearTimeout(typingTimer.current)
    const state = snapshot()
    if (state) history.commit(state)
  }, [history, snapshot])

  const sync = useCallback(() => {
    emit()
    commitHistory()
  }, [commitHistory, emit])

  /** Typing groups into one undo step per pause, rather than one per letter. */
  const syncTyping = useCallback(() => {
    emit()
    window.clearTimeout(typingTimer.current)
    typingTimer.current = window.setTimeout(commitHistory, 500)
  }, [commitHistory, emit])

  const measureImage = useCallback((figure: HTMLElement): ImageView => {
    const surface = visualRef.current as HTMLElement
    const scroller = scrollParent(surface)
    const frame = scroller === document.documentElement
      ? { top: 0, left: 0, width: window.innerWidth, bottom: window.innerHeight }
      : scroller.getBoundingClientRect()
    const top = Math.max(frame.top, toolbarRef.current?.getBoundingClientRect().bottom ?? frame.top)
    return {
      figure,
      rect: (figure.querySelector('img') ?? figure).getBoundingClientRect(),
      stage: { top, left: frame.left, width: frame.width, height: Math.max(0, frame.bottom - top) },
    }
  }, [])

  const deselectImage = useCallback(() => {
    selectedFigure.current = null
    setSelectedImage(null)
  }, [])

  const refreshSelectedImage = useCallback(() => {
    const figure = selectedFigure.current
    if (!figure?.isConnected) {
      deselectImage()
      return
    }
    const view = measureImage(figure)
    setSelectedImage((current) => (current ? { ...current, ...view, version: current.version + 1 } : current))
  }, [deselectImage, measureImage])

  const selectImage = useCallback((figure: HTMLElement) => {
    const editor = visualRef.current
    if (!editor) return
    editor.focus({ preventScroll: true })
    window.getSelection()?.removeAllRanges()
    // Anything inserted while an image is selected goes right after it.
    const after = document.createRange()
    after.setStartAfter(movableUnit(figure))
    after.collapse(true)
    savedSelection.current = after
    selectedFigure.current = figure
    setHoveredImage(null)
    setSelectedImage({ ...measureImage(figure), version: 0 })
  }, [measureImage])

  const dropImage = useCallback((unit: HTMLElement, before: Node | null) => {
    const editor = visualRef.current
    const figure = unit.tagName === 'FIGURE' ? unit : unit.querySelector('figure')
    if (!editor || !figure) return
    selectedFigure.current = figure
    if (before !== unit) {
      commitHistory()
      moveBlock(editor, unit, before)
      sync()
    }
    selectImage(figure)
  }, [commitHistory, selectImage, sync])

  const { arm, dragging, dropLine, setDropLine, ghostRef, consumeClick } = useImageDrag(visualRef, mode === 'visual', dropImage)
  const { beginResize, resizeLabel } = useImageResize(refreshSelectedImage, () => {
    sync()
    refreshSelectedImage()
  })

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
    if (selectedFigure.current) caretBelowImage(selectedFigure.current)
    visualRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, argument)
    sync()
    rememberSelection()
  }

  function insertHtml(html: string) {
    const editor = visualRef.current
    if (selectedFigure.current) caretBelowImage(selectedFigure.current)
    editor?.focus()
    restoreSelection()
    document.execCommand('insertHTML', false, html)
    // Pasted images become real image blocks straight away.
    if (editor && /<img\b/i.test(html)) prepareImages(editor)
    sync()
    rememberSelection()
  }

  // ---- Image caret helpers -------------------------------------------------

  function setCaret(range: Range) {
    savedSelection.current = range.cloneRange()
    deselectImage()
  }

  function caretBelowImage(figure: HTMLElement) {
    const unit = movableUnit(figure)
    let next = unit.nextElementSibling as HTMLElement | null
    if (next?.tagName !== 'P') {
      const paragraph = document.createElement('p')
      paragraph.append(document.createElement('br'))
      unit.after(paragraph)
      next = paragraph
    }
    visualRef.current?.focus({ preventScroll: true })
    setCaret(placeCaretAtStart(next))
  }

  function caretAboveImage(figure: HTMLElement) {
    const unit = movableUnit(figure)
    let previous = unit.previousElementSibling as HTMLElement | null
    if (previous?.tagName !== 'P') {
      const paragraph = document.createElement('p')
      paragraph.append(document.createElement('br'))
      unit.before(paragraph)
      previous = paragraph
    }
    visualRef.current?.focus({ preventScroll: true })
    setCaret(placeCaretAtEnd(previous))
  }

  /** Commits what came before, applies the change, then commits it as one undo step. */
  function mutateImage(change: () => void) {
    commitHistory()
    change()
    sync()
    refreshSelectedImage()
  }

  function removeImage(figure: HTMLElement) {
    const editor = visualRef.current
    if (!editor) return
    commitHistory()
    const neighbour = deleteImage(editor, figure)
    deselectImage()
    if (neighbour?.tagName === 'FIGURE') selectImage(neighbour)
    else if (neighbour) {
      editor.focus({ preventScroll: true })
      setCaret(placeCaretAtStart(neighbour))
    }
    sync()
  }

  // ---- Undo and redo -------------------------------------------------------

  function applySnapshot(state: EditorSnapshot) {
    const editor = visualRef.current
    if (!editor) return
    editor.innerHTML = state.html
    savedSelection.current = null
    deselectImage()
    setHoveredImage(null)
    reconcileUploads()
    editor.focus({ preventScroll: true })
    restoreSelectionSnapshot(editor, state.selection)
    const figure = state.image >= 0 ? editor.querySelectorAll('figure')[state.image] : null
    if (figure) selectImage(figure as HTMLElement)
    emit()
    const settled = snapshot()
    if (settled) history.replaceCurrent(settled)
  }

  function undo() {
    if (!visualRef.current) return
    commitHistory()
    const state = history.undo()
    if (state) applySnapshot(state)
  }

  function redo() {
    if (!visualRef.current) return
    commitHistory()
    const state = history.redo()
    if (state) applySnapshot(state)
  }

  // ---- Uploads -------------------------------------------------------------

  function findPlaceholder(id: string) {
    return visualRef.current?.querySelector<HTMLElement>(`[${UPLOAD_ATTRIBUTE}="${id}"]`) ?? null
  }

  function countUploads() {
    setUploading(Array.from(uploads.current.values()).filter((entry) => entry.state === 'uploading').length)
  }

  function finishedFigure(entry: UploadEntry) {
    const editor = visualRef.current as HTMLElement
    return createFigure(document, {
      src: absoluteImageUrl(entry.publicUrl ?? ''),
      alt: '',
      naturalWidth: entry.natural?.width,
      naturalHeight: entry.natural?.height,
      vector: entry.mimeType === VECTOR_TYPE,
      width: initialImageWidth(entry.natural?.width, editor.clientWidth),
      align: 'center',
    })
  }

  /** Undo can bring back a placeholder whose upload has since moved on, so match it to reality. */
  function reconcileUploads() {
    visualRef.current?.querySelectorAll<HTMLElement>(`[${UPLOAD_ATTRIBUTE}]`).forEach((element) => {
      const entry = uploads.current.get(element.getAttribute(UPLOAD_ATTRIBUTE) ?? '')
      if (!entry || entry.state === 'cancelled') element.remove()
      else if (entry.state === 'done') element.replaceWith(finishedFigure(entry))
      else {
        element.removeAttribute('data-state')
        paintUploadPlaceholder(element, uploadView(entry))
      }
    })
  }

  function startUpload(id: string) {
    const entry = uploads.current.get(id)
    if (!entry) return
    entry.state = 'uploading'
    entry.percent = 0
    entry.message = ''
    const initialPlaceholder = findPlaceholder(id)
    if (initialPlaceholder) paintUploadPlaceholder(initialPlaceholder, uploadView(entry))
    countUploads()

    const { promise, abort } = mediaApi.uploadMediaWithProgress(entry.file, '', '', (percent) => {
      entry.percent = percent
      const placeholder = findPlaceholder(id)
      if (placeholder) paintUploadPlaceholder(placeholder, uploadView(entry))
    })
    entry.abort = abort
    promise
      .then(({ asset }) => {
        entry.state = 'done'
        entry.publicUrl = asset.publicUrl
        entry.mimeType = asset.mimeType
        if (asset.width && asset.height) entry.natural = { width: asset.width, height: asset.height }
        URL.revokeObjectURL(entry.thumbnail)
        const placeholder = findPlaceholder(id)
        if (placeholder) {
          // The insert was already an undo step, so the swap doesn't add another.
          placeholder.replaceWith(finishedFigure(entry))
          emit()
          const state = snapshot()
          if (state) history.replaceCurrent(state)
        }
      })
      .catch((uploadError: unknown) => {
        if (uploadError instanceof DOMException && uploadError.name === 'AbortError') return
        entry.state = 'error'
        entry.message = uploadError instanceof Error ? uploadError.message : 'The upload failed.'
        const placeholder = findPlaceholder(id)
        if (placeholder) paintUploadPlaceholder(placeholder, uploadView(entry))
      })
      .finally(countUploads)
  }

  function insertFiles(files: File[], point: ReturnType<typeof resolveInsertionPoint>) {
    const editor = visualRef.current
    if (!editor) return
    const valid = files.filter((file) => {
      const problem = validateImageFile(file)
      if (problem) toast.error(problem)
      return !problem
    })
    if (!valid.length) return

    commitHistory()
    const ids: string[] = []
    const blocks = valid.map((file) => {
      const id = `upload-${nextUploadId.current++}`
      const thumbnail = URL.createObjectURL(file)
      const entry: UploadEntry = { file, thumbnail, state: 'uploading', percent: 0, message: '', natural: null }
      const probe = new Image()
      probe.onload = () => { if (probe.naturalWidth && !entry.natural) entry.natural = { width: probe.naturalWidth, height: probe.naturalHeight } }
      probe.src = thumbnail
      uploads.current.set(id, entry)
      ids.push(id)
      return createUploadPlaceholder(document, id, uploadView(entry))
    })
    const paragraph = placeBlocks(editor, blocks, point)
    editor.focus({ preventScroll: true })
    setCaret(placeCaretAtStart(paragraph))
    sync()
    ids.forEach(startUpload)
  }

  function insertAtSelection(block: HTMLElement) {
    const editor = visualRef.current
    if (!editor) return
    commitHistory()
    const point = resolveInsertionPoint(editor, savedSelection.current)
    const paragraph = placeBlocks(editor, [block], point)
    prepareImages(editor)
    editor.focus({ preventScroll: true })
    setCaret(placeCaretAtStart(paragraph))
    sync()
  }

  function uploadAction(kind: string, element: HTMLElement) {
    const id = element.getAttribute(UPLOAD_ATTRIBUTE) ?? ''
    const entry = uploads.current.get(id)
    if (kind === 'retry') {
      startUpload(id)
      return
    }
    if (entry) {
      entry.state = 'cancelled'
      entry.abort?.()
      URL.revokeObjectURL(entry.thumbnail)
      uploads.current.delete(id)
    }
    const editor = visualRef.current
    commitHistory()
    element.remove()
    if (editor) ensureTrailingParagraph(editor)
    sync()
    countUploads()
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
    const meta: ImageMeta = { naturalWidth: picked.asset.width, naturalHeight: picked.asset.height, vector: picked.asset.mimeType === VECTOR_TYPE }
    if (purpose === 'replace' && picker?.figure) {
      const figure = picker.figure
      setPicker(null)
      if (figure.isConnected) mutateImage(() => replaceImageSource(figure, { src: picked.url, alt: picked.asset.altText, ...meta }))
      return
    }
    setPicker(null)
    setDetails({
      mode: 'insert',
      src: picked.url,
      meta,
      initial: { alt: picked.asset.altText, title: '', caption: picked.asset.caption, layout: purpose === 'media-text' ? 'media-text' : 'figure' },
    })
  }

  function submitDetails(result: ImageDetails) {
    const editor = visualRef.current
    if (!details || !editor) return
    if (details.mode === 'edit' && details.figure) {
      const figure = details.figure
      setDetails(null)
      if (figure.isConnected) {
        mutateImage(() => {
          const image = figure.querySelector('img')
          image?.setAttribute('alt', result.alt)
          if (result.title) image?.setAttribute('title', result.title)
          else image?.removeAttribute('title')
          setImageCaption(figure, result.caption)
        })
      }
      return
    }
    const { meta } = details
    let block: HTMLElement
    if (result.layout === 'media-text') {
      const template = document.createElement('template')
      template.innerHTML = mediaTextHtml(details.src, result.alt, result.caption, 'Add supporting text here.', result.title)
      block = template.content.firstElementChild as HTMLElement
      if (meta?.vector) block.querySelector('img')?.setAttribute('data-vector', '')
      if (meta?.naturalWidth && meta.naturalHeight) {
        block.querySelector('img')?.setAttribute('width', String(meta.naturalWidth))
        block.querySelector('img')?.setAttribute('height', String(meta.naturalHeight))
      }
    } else {
      block = createFigure(document, {
        src: details.src,
        alt: result.alt,
        title: result.title,
        caption: result.caption,
        ...meta,
        width: initialImageWidth(meta?.naturalWidth, editor.clientWidth),
        align: 'center',
      })
    }
    setDetails(null)
    insertAtSelection(block)
  }

  function editImage(figure: HTMLElement) {
    const image = figure.querySelector('img')
    const caption = figure.querySelector('figcaption')?.textContent ?? ''
    setDetails({ mode: 'edit', src: image?.currentSrc || image?.src || '', figure, initial: { alt: image?.getAttribute('alt') ?? '', title: image?.getAttribute('title') ?? '', caption } })
  }

  function onImageAction(figure: HTMLElement, action: ImageToolbarAction) {
    switch (action.type) {
      case 'align': return mutateImage(() => setImageAlign(figure, action.align))
      case 'wrap': return mutateImage(() => setImageWrap(figure, action.wrap))
      case 'width': return mutateImage(() => setImageWidth(figure, action.width))
      case 'alt':
        figure.querySelector('img')?.setAttribute('alt', action.alt)
        syncTyping()
        return refreshSelectedImage()
      case 'commit-alt': return commitHistory()
      case 'caption': {
        let created: HTMLElement | null = null
        mutateImage(() => { created = toggleImageCaption(figure) })
        return (created as HTMLElement | null)?.focus()
      }
      case 'link': return mutateImage(() => setImageLink(figure, action.link))
      case 'replace': return setPicker({ purpose: 'replace', figure })
      case 'details': return editImage(figure)
      case 'remove': return removeImage(figure)
    }
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
      // A caption is plain text, so the formatting bubble stays away.
      if (anchorElement?.closest('figcaption')) {
        setBubble(null)
        return
      }
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

  // The image overlays stay attached to the image while the page moves or it changes size.
  const selectedElement = selectedImage?.figure ?? null
  useEffect(() => {
    if (!selectedElement) return
    const dismiss = (event: PointerEvent) => {
      const target = event.target as Element | null
      if (target?.closest('figure') === selectedElement || target?.closest('[data-rte-imagebar]')) return
      deselectImage()
    }
    const observer = new ResizeObserver(refreshSelectedImage)
    observer.observe(selectedElement)
    window.addEventListener('scroll', refreshSelectedImage, true)
    window.addEventListener('resize', refreshSelectedImage)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', refreshSelectedImage, true)
      window.removeEventListener('resize', refreshSelectedImage)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [deselectImage, refreshSelectedImage, selectedElement])

  const hoveredElement = hoveredImage?.figure ?? null
  useEffect(() => {
    if (!hoveredElement) return
    const follow = () => setHoveredImage(hoveredElement.isConnected ? measureImage(hoveredElement) : null)
    window.addEventListener('scroll', follow, true)
    return () => window.removeEventListener('scroll', follow, true)
  }, [hoveredElement, measureImage])

  // Records each image's natural size once known, which is what prevents layout shift for readers.
  useEffect(() => {
    if (mode !== 'visual') return
    const editor = visualRef.current
    if (!editor) return
    const onLoad = (event: Event) => {
      const image = event.target
      if (!(image instanceof HTMLImageElement) || !image.closest('figure') || image.hasAttribute('width') || !image.naturalWidth) return
      image.setAttribute('width', String(image.naturalWidth))
      image.setAttribute('height', String(image.naturalHeight))
      // Only an article already being edited: merely opening one mustn't mark it unsaved.
      if (history.hasEdits) emit()
      const state = snapshot()
      if (state) history.replaceCurrent(state)
    }
    // Load events don't bubble, so this has to listen during capture.
    editor.addEventListener('load', onLoad, true)
    return () => editor.removeEventListener('load', onLoad, true)
  }, [emit, history, mode, snapshot])

  // Menu and gesture undo arrive here, not as a key press; the browser's own stack stays unused.
  // Re-attached each render so it always calls the current undo and redo.
  useEffect(() => {
    const editor = visualRef.current
    if (!editor) return
    const onBeforeInput = (event: InputEvent) => {
      if (event.inputType !== 'historyUndo' && event.inputType !== 'historyRedo') return
      event.preventDefault()
      if (event.inputType === 'historyUndo') undo()
      else redo()
    }
    editor.addEventListener('beforeinput', onBeforeInput)
    return () => editor.removeEventListener('beforeinput', onBeforeInput)
  })

  useEffect(() => {
    const entries = uploads.current
    return () => {
      window.clearTimeout(typingTimer.current)
      entries.forEach((entry) => {
        if (entry.state === 'uploading') entry.abort?.()
        URL.revokeObjectURL(entry.thumbnail)
      })
    }
  }, [])

  useImperativeHandle(handleRef, () => ({
    focus: () => visualRef.current?.focus(),
    undo,
    redo,
    scrollToHeading: (index: number) => {
      const heading = visualRef.current?.querySelectorAll('h2, h3, h4')[index]
      heading?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    },
  }))

  function openPopover(id: PopoverId, anchor: HTMLElement) {
    rememberSelection()
    if (id === 'link') {
      const link = elementOf(window.getSelection()?.anchorNode ?? null)?.closest('a')
      setLinkUrl(link?.getAttribute('href') ?? '')
    }
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
    if (node.parentElement?.closest('figcaption')) {
      setSlash(null)
      return
    }
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

  /** Keyboard behaviour while an image is selected. Returns true when the key was handled. */
  function onSelectedImageKey(event: KeyboardEvent<HTMLDivElement>, figure: HTMLElement): boolean {
    const { key } = event
    if (event.altKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      event.preventDefault()
      const editor = visualRef.current
      if (!editor) return true
      commitHistory()
      if (nudgeBlock(editor, movableUnit(figure), key === 'ArrowUp' ? 'up' : 'down')) {
        sync()
        figure.scrollIntoView({ block: 'nearest', behavior: 'instant' })
        refreshSelectedImage()
      }
      return true
    }
    if (event.metaKey || event.ctrlKey || event.altKey || key === 'Tab' || key === 'Shift') return false
    if (key === 'Delete' || key === 'Backspace') {
      event.preventDefault()
      removeImage(figure)
      return true
    }
    if (key === 'Enter' || key === 'Escape' || key === 'ArrowDown' || key === 'ArrowRight') {
      event.preventDefault()
      caretBelowImage(figure)
      return true
    }
    if (key === 'ArrowUp' || key === 'ArrowLeft') {
      event.preventDefault()
      caretAboveImage(figure)
      return true
    }
    // Typing never replaces the image: the text starts on the line below it.
    if (key.length === 1) caretBelowImage(figure)
    return false
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const shortcut = (event.metaKey || event.ctrlKey) && !event.altKey
    if (shortcut && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
      return
    }
    if (shortcut && event.key.toLowerCase() === 'y') {
      event.preventDefault()
      redo()
      return
    }

    // A caption is a single line of its own, outside all of the block shortcuts below.
    const caption = (event.target as HTMLElement).closest?.('figcaption')
    if (caption) {
      if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault()
        const figure = caption.closest('figure')
        if (figure) selectImage(figure)
      }
      return
    }

    if (selectedFigure.current && onSelectedImageKey(event, selectedFigure.current)) return

    // Backspace or Delete beside an image selects it first, rather than silently removing it.
    if ((event.key === 'Backspace' || event.key === 'Delete') && !event.metaKey && !event.ctrlKey) {
      const editor = visualRef.current
      const selection = window.getSelection()
      if (editor && selection?.rangeCount) {
        const beside = imageNextToCaret(editor, selection.getRangeAt(0), event.key === 'Backspace' ? 'backward' : 'forward')
        if (beside) {
          event.preventDefault()
          if (!beside.block.textContent?.trim()) {
            commitHistory()
            beside.block.remove()
            ensureTrailingParagraph(editor)
            sync()
          }
          selectImage(beside.figure)
          return
        }
      }
    }

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
    const html = event.clipboardData.getData('text/html')
    const text = event.clipboardData.getData('text/plain')

    if ((event.target as HTMLElement).closest?.('figcaption')) {
      event.preventDefault()
      document.execCommand('insertText', false, text.replace(/\s+/g, ' '))
      return
    }

    // Word and Excel put a picture of the text on the clipboard too; the text is what's meant.
    const images = text.trim() ? [] : Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
    if (images.length) {
      event.preventDefault()
      rememberSelection()
      const editor = visualRef.current
      if (editor) insertFiles(images, resolveInsertionPoint(editor, savedSelection.current))
      return
    }
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

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    const editor = visualRef.current
    if (!editor || !event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    const gap = computeDropGap(editor, event.clientY, null)
    setDropLine({ top: gap.top, left: gap.left, width: gap.width })
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropLine(null)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    const editor = visualRef.current
    setDropLine(null)
    if (!editor || !event.dataTransfer.types.includes('Files')) return
    event.preventDefault()
    deselectImage()
    const gap = computeDropGap(editor, event.clientY, null)
    insertFiles(Array.from(event.dataTransfer.files), { before: gap.before, replace: null })
  }

  function imageFromTarget(target: EventTarget | null): HTMLElement | null {
    const element = target as HTMLElement | null
    if (element?.tagName !== 'IMG') return null
    return element.closest('figure')
  }

  function onSurfaceMouseDown(event: MouseEvent<HTMLDivElement>) {
    // No caret and no text selection when pressing an image: that press selects or moves it.
    // Upload buttons keep the caret where it is too, so typing can carry on.
    if (imageFromTarget(event.target) || (event.target as HTMLElement).closest?.('[data-rte-action]')) event.preventDefault()
  }

  function onSurfacePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const figure = imageFromTarget(event.target)
    if (!figure || event.button !== 0) return
    arm({ x: event.clientX, y: event.clientY, pointerId: event.pointerId, pointerType: event.pointerType }, movableUnit(figure), false)
  }

  function onSurfaceMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (dragging) return
    const figure = (event.target as HTMLElement).closest?.('figure') ?? null
    if (figure === (hoveredImage?.figure ?? null)) return
    setHoveredImage(figure ? measureImage(figure) : null)
  }

  function onSurfaceMouseLeave(event: MouseEvent<HTMLDivElement>) {
    if (!(event.relatedTarget as Element | null)?.closest?.('[data-rte-grip]')) setHoveredImage(null)
  }

  function onSurfaceClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement
    const action = target.closest?.('[data-rte-action]')
    if (action) {
      event.preventDefault()
      const placeholder = action.closest<HTMLElement>(`[${UPLOAD_ATTRIBUTE}]`)
      if (placeholder) uploadAction(action.getAttribute('data-rte-action') ?? '', placeholder)
      return
    }
    // Links work inside an uneditable block, but a click here should never leave the editor.
    if (target.closest?.('figure a')) event.preventDefault()
    if (consumeClick()) return
    if (target.closest?.('figcaption')) return
    const figure = imageFromTarget(target)
    if (figure) selectImage(figure)
    else deselectImage()
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

  const overlayImage = hoveredImage ?? selectedImage
  const stageBox = overlayImage?.stage
  const selectedIsSimple = selectedImage ? isMediaTextFigure(selectedImage.figure) : false

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
            <ToolButton label="Undo" shortcut="⌘Z" className="md:hidden" onClick={undo}><Undo2 size={15} strokeWidth={1.8} /></ToolButton>
            <ToolButton label="Redo" shortcut="⇧⌘Z" className="md:hidden" onClick={redo}><Redo2 size={15} strokeWidth={1.8} /></ToolButton>
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
          onInput={() => { syncTyping(); detectSlash() }}
          onKeyDown={onKeyDown}
          onKeyUp={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Backspace') detectSlash() }}
          onBlur={() => { rememberSelection(); onBlur?.() }}
          onClick={onSurfaceClick}
          onMouseDown={onSurfaceMouseDown}
          onPointerDown={onSurfacePointerDown}
          onMouseMove={onSurfaceMouseMove}
          onMouseLeave={onSurfaceMouseLeave}
          onPaste={onPaste}
          onDragStart={(event) => { if ((event.target as HTMLElement).tagName === 'IMG') event.preventDefault() }}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
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
          {menuItem('image-url', <Link2 size={15} strokeWidth={1.8} aria-hidden="true" />, 'Image from a web address…', () => setPopover({ id: 'imageUrl', rect: popover.rect }))}
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
          {menuItem('code-view', <Code2 size={15} strokeWidth={1.8} aria-hidden="true" />, 'Edit HTML code', () => {
            closePopover()
            // A finished upload needs its placeholder in the visual editor to land in the article.
            if (uploading > 0) {
              toast.error('Wait for your images to finish uploading first.')
              return
            }
            deselectImage()
            setHoveredImage(null)
            setMode('code')
          })}
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
          <ImageUrlPanel
            onContinue={(image) => {
              closePopover()
              setDetails({ mode: 'insert', src: image.url, initial: { layout: 'figure' }, meta: { naturalWidth: image.width, naturalHeight: image.height } })
            }}
          />
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

      {portalRoot && mode === 'visual' && !dragging && overlayImage && stageBox && createPortal(
        <div className="admin-image-stage" style={stageBox}>
          {selectedImage && (
            <>
              <div
                className="admin-image-outline"
                aria-hidden="true"
                style={{ top: selectedImage.rect.top - stageBox.top, left: selectedImage.rect.left - stageBox.left, width: selectedImage.rect.width, height: selectedImage.rect.height }}
              />
              {!selectedIsSimple && HANDLE_CORNERS.map((corner) => (
                <button
                  key={corner}
                  type="button"
                  tabIndex={-1}
                  aria-hidden="true"
                  data-rte-imagebar
                  className="admin-image-handle"
                  style={{
                    top: selectedImage.rect.top - stageBox.top + (corner.includes('n') ? 0 : selectedImage.rect.height) - 6,
                    left: selectedImage.rect.left - stageBox.left + (corner.includes('w') ? 0 : selectedImage.rect.width) - 6,
                    cursor: corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize',
                  }}
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerDown={(event) => {
                    event.preventDefault()
                    beginResize({ x: event.clientX, y: event.clientY, pointerId: event.pointerId, pointerType: event.pointerType }, selectedImage.figure, corner)
                  }}
                />
              ))}
            </>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Drag to move this image"
            title="Drag to move. Alt+↑ or Alt+↓ moves a selected image."
            data-rte-grip
            data-rte-imagebar
            className="admin-image-grip"
            style={{ top: overlayImage.rect.top - stageBox.top + 8, left: overlayImage.rect.left - stageBox.left + 8 }}
            onMouseDown={(event) => event.preventDefault()}
            onMouseLeave={(event) => { if ((event.relatedTarget as Element | null)?.closest?.('figure') !== overlayImage.figure) setHoveredImage(null) }}
            onPointerDown={(event) => {
              event.preventDefault()
              arm({ x: event.clientX, y: event.clientY, pointerId: event.pointerId, pointerType: event.pointerType }, movableUnit(overlayImage.figure), true)
            }}
            onClick={() => selectImage(overlayImage.figure)}
          >
            <GripVertical size={15} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </div>,
        portalRoot,
      )}

      {portalRoot && mode === 'visual' && !dragging && !resizeLabel && selectedImage && createPortal(
        <ImageToolbar
          figure={selectedImage.figure}
          rect={selectedImage.rect}
          stageTop={selectedImage.stage.top}
          simple={selectedIsSimple}
          version={selectedImage.version}
          onAction={onImageAction}
        />,
        portalRoot,
      )}

      {portalRoot && resizeLabel && createPortal(
        <div className="admin-image-size" role="status" style={{ top: resizeLabel.y + 16, left: resizeLabel.x + 16 }}>{resizeLabel.width}%</div>,
        portalRoot,
      )}

      {portalRoot && dropLine && createPortal(
        <div className="admin-drop-line" aria-hidden="true" style={{ top: dropLine.top - 1, left: dropLine.left, width: dropLine.width }} />,
        portalRoot,
      )}

      {portalRoot && dragging && createPortal(
        <div ref={ghostRef} className="admin-drag-ghost" aria-hidden="true"><img src={dragging.src} alt="" draggable={false} /></div>,
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
          onReplace={details.mode === 'edit' && details.figure ? () => { const figure = details.figure; setDetails(null); setPicker({ purpose: 'replace', figure }) } : undefined}
        />
      )}
    </div>
  )
}

export default RichContentEditor
