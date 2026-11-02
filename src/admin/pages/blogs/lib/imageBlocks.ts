import { imageFigureVars, MIN_IMAGE_WIDTH, parseImageRatio, parseImageWidth } from '../../../../blog/lib/articleImage'
import type { ImageAlign, ImageWrap } from '../../../../blog/lib/articleImage'

/**
 * The editor's image model. An image is a <figure> block the browser treats as
 * one uneditable unit (its caption stays editable). Everything the editor adds
 * purely to make that work (contenteditable, style, data-rte-*) is removed again
 * by `serializeEditorHtml`, so stored articles stay clean.
 */

export const UPLOAD_ATTRIBUTE = 'data-rte-upload'
export const DRAGGING_ATTRIBUTE = 'data-rte-dragging'
const MEDIA_TEXT = '[data-layout="media-text"]'

export const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])

/** Returns a message to show when the file can't be used, or null when it can. */
export function validateImageFile(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) return `“${file.name}” can’t be added. Use a JPG, PNG, WebP, GIF or SVG image.`
  if (file.size > MAX_IMAGE_BYTES) return `“${file.name}” is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Images can be up to 20 MB.`
  if (file.size === 0) return `“${file.name}” is empty.`
  return null
}

/** Accepts http(s) addresses, site paths, and bare domains. Null when it can't be a link. */
export function normalizeWebAddress(value: string): string | null {
  const raw = value.trim()
  if (!raw || /\s/.test(raw)) return null
  if (/^(?:https?:\/\/[^/\s]+|\/)/i.test(raw)) return raw
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null
  return /^[^\s/]+\.[^\s/]{2,}/.test(raw) ? `https://${raw}` : null
}

export interface ImageContent {
  src: string
  alt: string
  title?: string
  caption?: string
  link?: string
  /** Natural size, stored so the page can reserve the space before the image loads. */
  naturalWidth?: number | null
  naturalHeight?: number | null
  vector?: boolean
  width?: number | null
  align?: ImageAlign
  wrap?: ImageWrap | null
}

export interface ImageAttributes {
  src: string
  alt: string
  link: string
  hasCaption: boolean
  width: number
  align: ImageAlign
  wrap: ImageWrap | null
}

function setDimensions(image: HTMLImageElement, width?: number | null, height?: number | null) {
  if (width && height) {
    image.setAttribute('width', String(Math.round(width)))
    image.setAttribute('height', String(Math.round(height)))
  } else {
    image.removeAttribute('width')
    image.removeAttribute('height')
  }
}

export function syncFigureStyle(figure: HTMLElement) {
  figure.style.removeProperty('--rc-image-width')
  figure.style.removeProperty('--rc-image-ratio')
  const vars = imageFigureVars(parseImageWidth(figure.getAttribute('data-width')), parseImageRatio(figure.getAttribute('data-ratio')))
  Object.entries(vars).forEach(([name, value]) => figure.style.setProperty(name, value))
}

function prepareFigure(figure: HTMLElement) {
  figure.setAttribute('contenteditable', 'false')
  figure.querySelector('figcaption')?.setAttribute('contenteditable', 'true')
  figure.querySelector('img')?.setAttribute('draggable', 'false')
  syncFigureStyle(figure)
}

export function createFigure(doc: Document, content: ImageContent): HTMLElement {
  const figure = doc.createElement('figure')
  if (content.width) figure.setAttribute('data-width', String(content.width))
  if (content.align) figure.setAttribute('data-align', content.align)
  if (content.wrap) figure.setAttribute('data-wrap', content.wrap)

  const image = doc.createElement('img')
  image.setAttribute('src', content.src)
  image.setAttribute('alt', content.alt)
  if (content.title) image.setAttribute('title', content.title)
  if (content.vector) image.setAttribute('data-vector', '')
  setDimensions(image, content.naturalWidth, content.naturalHeight)

  if (content.link) {
    const anchor = doc.createElement('a')
    anchor.setAttribute('href', content.link)
    anchor.append(image)
    figure.append(anchor)
  } else {
    figure.append(image)
  }

  if (content.caption?.trim()) {
    const caption = doc.createElement('figcaption')
    caption.textContent = content.caption.trim()
    figure.append(caption)
  }
  prepareFigure(figure)
  return figure
}

/** The width a new image starts at: its own size when small, otherwise the full column. */
export function initialImageWidth(naturalWidth: number | null | undefined, columnWidth: number): number {
  if (!naturalWidth || !columnWidth || naturalWidth >= columnWidth) return 100
  return Math.max(MIN_IMAGE_WIDTH, Math.min(100, Math.round((naturalWidth / columnWidth) * 100)))
}

export function isEmptyParagraph(node: Node | null | undefined): boolean {
  if (!node || node.nodeType !== 1) return false
  const element = node as HTMLElement
  return element.tagName === 'P' && !element.textContent?.trim() && !element.querySelector('img, hr, figure')
}

function emptyParagraph(doc: Document): HTMLParagraphElement {
  const paragraph = doc.createElement('p')
  paragraph.append(doc.createElement('br'))
  return paragraph
}

/** Text typed straight into an empty editor sits bare at the root. Blocks need a <p> around it. */
function wrapBareInline(root: HTMLElement, range: Range | null) {
  const inline = (node: Node) => node.nodeType === 3
    ? Boolean(node.textContent?.trim())
    : node.nodeType === 1 && /^(?:A|B|BR|CODE|EM|I|MARK|S|SPAN|STRONG|SUB|SUP|U)$/.test((node as Element).tagName)
  const caret = range ? { start: range.startContainer, startOffset: range.startOffset, end: range.endContainer, endOffset: range.endOffset } : null
  let run: HTMLParagraphElement | null = null
  let moved = false
  Array.from(root.childNodes).forEach((node) => {
    if (!inline(node)) {
      run = null
      return
    }
    if (!run) {
      run = root.ownerDocument.createElement('p')
      root.insertBefore(run, node)
    }
    run.append(node)
    moved = true
  })
  if (moved && range && caret && root.contains(caret.start) && root.contains(caret.end)) {
    range.setStart(caret.start, caret.startOffset)
    range.setEnd(caret.end, caret.endOffset)
  }
}

function topLevelChild(node: Node, root: HTMLElement): Node | null {
  let current: Node | null = node
  while (current && current.parentNode !== root) current = current.parentNode
  return current
}

function hasContent(fragment: DocumentFragment): boolean {
  return Boolean(fragment.textContent?.trim()) || Boolean(fragment.querySelector('img, hr, figure'))
}

/**
 * Resolves where a new block goes, splitting a paragraph when the caret is in
 * the middle of one. Selected text is kept: the block lands after its paragraph.
 * Lists, quotes and code stay whole; the block lands after them. Returns the node
 * to insert before (null means the end), plus an empty paragraph to replace.
 */
export function resolveInsertionPoint(root: HTMLElement, range: Range | null): { before: Node | null; replace: HTMLElement | null } {
  wrapBareInline(root, range)
  if (!range || !root.contains(range.endContainer)) {
    const last = root.lastElementChild as HTMLElement | null
    return last && isEmptyParagraph(last) ? { before: last.nextSibling, replace: last } : { before: null, replace: null }
  }
  if (range.endContainer === root) return { before: root.childNodes[range.endOffset] ?? null, replace: null }

  const top = topLevelChild(range.endContainer, root)
  if (!top) return { before: null, replace: null }
  if (!range.collapsed || top.nodeType !== 1 || (top as Element).tagName !== 'P') return { before: top.nextSibling, replace: null }
  const anchor = top as HTMLElement
  if (isEmptyParagraph(anchor)) return { before: anchor.nextSibling, replace: anchor }

  const head = range.cloneRange()
  head.setStartBefore(anchor.firstChild as Node)
  head.setEnd(range.endContainer, range.endOffset)
  if (!hasContent(head.cloneContents())) return { before: anchor, replace: null }

  const tail = range.cloneRange()
  tail.setEndAfter(anchor.lastChild as Node)
  if (!hasContent(tail.cloneContents())) return { before: anchor.nextSibling, replace: null }

  const remainder = anchor.cloneNode(false) as HTMLElement
  remainder.append(tail.extractContents())
  anchor.after(remainder)
  return { before: remainder, replace: null }
}

export function placeCaretAtStart(element: HTMLElement) {
  const selection = element.ownerDocument.getSelection()
  const range = element.ownerDocument.createRange()
  range.setStart(element, 0)
  range.collapse(true)
  selection?.removeAllRanges()
  selection?.addRange(range)
  return range
}

export function placeCaretAtEnd(element: HTMLElement) {
  const selection = element.ownerDocument.getSelection()
  const range = element.ownerDocument.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(range)
  return range
}

/** Inserts blocks in order, and returns the new empty paragraph below them for the caret. */
export function placeBlocks(root: HTMLElement, blocks: HTMLElement[], point: { before: Node | null; replace: HTMLElement | null }): HTMLElement {
  const paragraph = emptyParagraph(root.ownerDocument)
  const parent = point.before?.parentNode ?? root
  blocks.forEach((block) => parent.insertBefore(block, point.before))
  parent.insertBefore(paragraph, point.before)
  point.replace?.remove()
  return paragraph
}

/** A block needs an editable line after it, or the caret could never get below the image. */
export function ensureTrailingParagraph(root: HTMLElement) {
  const last = root.lastElementChild
  if (last && (last.tagName === 'FIGURE' || last.matches(MEDIA_TEXT) || last.hasAttribute(UPLOAD_ATTRIBUTE))) {
    root.append(emptyParagraph(root.ownerDocument))
  }
}

/** Lifts bare images into figures and marks every figure as one uneditable unit. Never drops text. */
export function prepareImages(root: HTMLElement) {
  root.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (image.closest(`[${UPLOAD_ATTRIBUTE}]`)) return
    if (!image.getAttribute('src')) {
      image.remove()
      return
    }
    if (!image.hasAttribute('alt')) image.setAttribute('alt', '')
    if (image.closest('figure')) return

    const parent = image.parentElement
    const linked = parent?.tagName === 'A' && parent.childNodes.length === 1
    const node: HTMLElement = linked && parent ? parent : image
    const figure = root.ownerDocument.createElement('figure')
    const block = node.parentElement?.closest<HTMLElement>('p, h1, h2, h3, h4, h5, h6')

    if (block && root.contains(block)) {
      const tail = root.ownerDocument.createRange()
      tail.setStartAfter(node)
      tail.setEndAfter(block.lastChild as Node)
      const remainder = block.cloneNode(false) as HTMLElement
      remainder.append(tail.extractContents())
      block.after(figure)
      figure.append(node)
      if (remainder.textContent?.trim() || remainder.querySelector('img')) figure.after(remainder)
      if (!block.textContent?.trim() && !block.querySelector('img')) block.remove()
    } else {
      node.replaceWith(figure)
      figure.append(node)
    }
  })
  root.querySelectorAll<HTMLElement>('figure').forEach(prepareFigure)
}

/** The article HTML as it should be stored: editor scaffolding and unfinished uploads removed. */
export function serializeEditorHtml(root: HTMLElement): string {
  const html = root.innerHTML
  if (!/<figure|data-rte-|contenteditable/i.test(html)) return html

  const template = root.ownerDocument.createElement('template')
  template.innerHTML = html
  const content = template.content
  content.querySelectorAll(`[${UPLOAD_ATTRIBUTE}]`).forEach((node) => node.remove())
  content.querySelectorAll('figure').forEach((figure) => {
    figure.removeAttribute('contenteditable')
    figure.removeAttribute('style')
    figure.removeAttribute(DRAGGING_ATTRIBUTE)
    figure.querySelector('img')?.removeAttribute('draggable')
    const caption = figure.querySelector('figcaption')
    if (caption) {
      // Keep only its words: editing can leave the browser's own styling behind.
      Array.from(caption.attributes).forEach((attribute) => caption.removeAttribute(attribute.name))
      if (caption.textContent?.trim()) caption.textContent = caption.textContent.trim()
      else caption.remove()
    }
  })
  content.querySelectorAll(MEDIA_TEXT).forEach((node) => node.removeAttribute(DRAGGING_ATTRIBUTE))
  // The spare line kept after a final image is only there for the caret.
  let last = content.lastElementChild
  while (last && isEmptyParagraph(last) && last.previousElementSibling?.tagName === 'FIGURE') {
    last.remove()
    last = content.lastElementChild
  }
  return template.innerHTML
}

export function readImageAttributes(figure: HTMLElement): ImageAttributes {
  const image = figure.querySelector('img')
  const align = figure.getAttribute('data-align')
  return {
    src: image?.getAttribute('src') ?? '',
    alt: image?.getAttribute('alt') ?? '',
    link: figure.querySelector('a')?.getAttribute('href') ?? '',
    hasCaption: Boolean(figure.querySelector('figcaption')),
    width: parseImageWidth(figure.getAttribute('data-width')) ?? 100,
    align: align === 'center' || align === 'right' || align === 'full' ? align : 'left',
    wrap: (figure.getAttribute('data-wrap') as ImageWrap | null) ?? null,
  }
}

function setOrRemove(element: HTMLElement, name: string, value: string | null) {
  if (value === null) element.removeAttribute(name)
  else element.setAttribute(name, value)
}

export function setImageAlign(figure: HTMLElement, align: ImageAlign) {
  const wasFull = figure.getAttribute('data-align') === 'full'
  figure.removeAttribute('data-wrap')
  figure.setAttribute('data-align', align)
  if (align === 'full') figure.setAttribute('data-width', '100')
  // Leaving full width has to look different, or the click would seem to do nothing.
  else if (wasFull) figure.setAttribute('data-width', '75')
  syncFigureStyle(figure)
}

/** Wrapping needs room for text beside the image, so very wide images shrink to half. */
export function setImageWrap(figure: HTMLElement, wrap: ImageWrap | null) {
  setOrRemove(figure, 'data-wrap', wrap)
  if (wrap) {
    figure.setAttribute('data-align', wrap)
    if ((parseImageWidth(figure.getAttribute('data-width')) ?? 100) > 75) figure.setAttribute('data-width', '50')
  }
  syncFigureStyle(figure)
}

export function setImageWidth(figure: HTMLElement, width: number) {
  figure.setAttribute('data-width', String(width))
  if (width === 100) figure.removeAttribute('data-wrap')
  else if (figure.getAttribute('data-align') === 'full') figure.setAttribute('data-align', 'center')
  syncFigureStyle(figure)
}

export function setImageLink(figure: HTMLElement, link: string | null) {
  const image = figure.querySelector('img')
  if (!image) return
  const anchor = figure.querySelector('a')
  if (!link) {
    anchor?.replaceWith(image)
  } else if (anchor) {
    anchor.setAttribute('href', link)
  } else {
    const created = figure.ownerDocument.createElement('a')
    created.setAttribute('href', link)
    image.replaceWith(created)
    created.append(image)
  }
}

/** Adds an empty editable caption, or removes the caption. Returns the new caption, if any. */
export function toggleImageCaption(figure: HTMLElement): HTMLElement | null {
  const existing = figure.querySelector('figcaption')
  if (existing) {
    existing.remove()
    return null
  }
  const caption = figure.ownerDocument.createElement('figcaption')
  caption.setAttribute('contenteditable', 'true')
  caption.setAttribute('data-placeholder', 'Write a caption')
  figure.append(caption)
  return caption
}

export function setImageCaption(figure: HTMLElement, text: string) {
  const existing = figure.querySelector('figcaption')
  if (!text) {
    existing?.remove()
    return
  }
  const caption = existing ?? toggleImageCaption(figure)
  if (caption) caption.textContent = text
}

export function replaceImageSource(figure: HTMLElement, content: Pick<ImageContent, 'src' | 'alt' | 'naturalWidth' | 'naturalHeight' | 'vector'>) {
  const image = figure.querySelector('img')
  if (!image) return
  image.setAttribute('src', content.src)
  image.removeAttribute('srcset')
  if (!image.getAttribute('alt') && content.alt) image.setAttribute('alt', content.alt)
  if (content.vector) image.setAttribute('data-vector', '')
  else image.removeAttribute('data-vector')
  setDimensions(image, content.naturalWidth, content.naturalHeight)
  // A shape chosen for the old picture would crop the new one.
  figure.removeAttribute('data-ratio')
  syncFigureStyle(figure)
}

export function isMediaTextFigure(figure: HTMLElement): boolean {
  return Boolean(figure.closest(MEDIA_TEXT))
}

/** What moves when an image moves: the whole layout for "Image and text", else the figure. */
export function movableUnit(figure: HTMLElement): HTMLElement {
  return figure.closest<HTMLElement>(MEDIA_TEXT) ?? figure
}

/** Removes an image and leaves any text around it in place. Returns a node for the caret. */
export function deleteImage(root: HTMLElement, figure: HTMLElement): HTMLElement | null {
  const layout = figure.closest<HTMLElement>(MEDIA_TEXT)
  let next: Element | null
  if (layout) {
    // "Image and text" keeps its text: those paragraphs take the layout's place.
    const text = layout.querySelector<HTMLElement>(':scope > div')
    const blocks = Array.from(text?.children ?? [])
    next = blocks[0] ?? layout.nextElementSibling
    layout.replaceWith(...blocks)
  } else {
    next = figure.nextElementSibling ?? figure.previousElementSibling
    const parent = figure.parentElement
    figure.remove()
    if (parent && parent !== root && !parent.textContent?.trim() && !parent.children.length) parent.append(root.ownerDocument.createElement('br'))
  }
  ensureTrailingParagraph(root)
  if (!root.firstElementChild) root.append(emptyParagraph(root.ownerDocument))
  return (next as HTMLElement | null) ?? (root.lastElementChild as HTMLElement | null)
}

/**
 * Backspace at the start of a paragraph, or Delete at its end, would otherwise
 * silently remove a neighbouring image. Returns that image so it can be selected first.
 */
export function imageNextToCaret(root: HTMLElement, range: Range, direction: 'backward' | 'forward'): { figure: HTMLElement; block: HTMLElement } | null {
  if (!range.collapsed || !root.contains(range.startContainer) || range.startContainer === root) return null
  const block = topLevelChild(range.startContainer, root) as HTMLElement | null
  if (!block || block.nodeType !== 1 || block.tagName !== 'P') return null

  const span = range.cloneRange()
  if (direction === 'backward') span.setStart(block, 0)
  else span.setEnd(block, block.childNodes.length)
  if (hasContent(span.cloneContents())) return null

  const sibling = direction === 'backward' ? block.previousElementSibling : block.nextElementSibling
  const figure = sibling?.tagName === 'FIGURE' ? sibling : sibling?.matches(MEDIA_TEXT) ? sibling.querySelector('figure') : null
  return figure ? { figure: figure as HTMLElement, block } : null
}

function meaningfulSibling(element: Element, direction: 'previous' | 'next'): Element | null {
  let current = direction === 'next' ? element.nextElementSibling : element.previousElementSibling
  while (current && (isEmptyParagraph(current) || current.tagName === 'BR')) {
    current = direction === 'next' ? current.nextElementSibling : current.previousElementSibling
  }
  return current
}

/** True when dropping before `before` would leave the block exactly where it already is. */
export function isSamePosition(unit: HTMLElement, root: HTMLElement, before: Node | null): boolean {
  if (unit.parentNode !== root) return false
  let current: Node | null = unit.nextSibling
  while (current) {
    if (current === before) return true
    if (current.nodeType === 1 ? !isEmptyParagraph(current) : Boolean(current.textContent?.trim())) return false
    current = current.nextSibling
  }
  return before === null
}

/** Moves a block as one node, so it can't duplicate and can't split what's around it. */
export function moveBlock(root: HTMLElement, unit: HTMLElement, before: Node | null) {
  if (before === unit) return
  const parent = unit.parentElement
  const spare = unit.nextElementSibling
  root.insertBefore(unit, before)
  // The empty line that was sitting under the image goes with it, not left behind as a gap.
  if (spare && isEmptyParagraph(spare) && spare !== before && spare.nextElementSibling) spare.remove()
  if (parent && parent !== root && !parent.textContent?.trim() && !parent.children.length) parent.append(root.ownerDocument.createElement('br'))
  ensureTrailingParagraph(root)
}

/** Alt+↑ / Alt+↓: one block up or down. Returns false at the top or bottom of the article. */
export function nudgeBlock(root: HTMLElement, unit: HTMLElement, direction: 'up' | 'down'): boolean {
  const anchor = topLevelChild(unit, root) as HTMLElement | null
  if (!anchor) return false
  if (anchor !== unit) {
    // Nested in a list or quote: the first nudge lifts it out, next to that block.
    moveBlock(root, unit, direction === 'up' ? anchor : anchor.nextSibling)
    return true
  }
  if (direction === 'up') {
    const target = meaningfulSibling(unit, 'previous')
    if (!target) return false
    moveBlock(root, unit, target)
    return true
  }
  const target = meaningfulSibling(unit, 'next')
  if (!target) return false
  moveBlock(root, unit, target.nextSibling)
  return true
}

export interface DropGap {
  before: Node | null
  top: number
  left: number
  width: number
}

/**
 * The gap between top-level blocks nearest to a pointer position. Blocks are never
 * entered, so a drop can't land inside a paragraph, list, quote or code block.
 * Floated images are skipped: their box overlaps the text wrapping around them.
 */
export function computeDropGap(root: HTMLElement, y: number, exclude: HTMLElement | null): DropGap {
  const blocks = Array.from(root.children).filter((child) => child !== exclude && !child.hasAttribute('data-wrap')) as HTMLElement[]
  // Never below the caret line kept after the final block.
  const lastBlock = blocks[blocks.length - 1]
  const endAtSpare = isEmptyParagraph(lastBlock) && blocks.length > 1

  const surface = root.getBoundingClientRect()
  const rects = blocks.map((block) => block.getBoundingClientRect())
  let best: DropGap = { before: null, top: surface.top, left: surface.left, width: surface.width }
  let bestDistance = Number.POSITIVE_INFINITY
  const gaps = endAtSpare ? blocks.length : blocks.length + 1
  for (let index = 0; index < gaps; index += 1) {
    const previous = rects[index - 1]
    const next = rects[index]
    const top = previous && next ? (previous.bottom + next.top) / 2 : next ? next.top - 4 : previous ? previous.bottom + 4 : surface.top
    const distance = Math.abs(y - top)
    if (distance < bestDistance) {
      bestDistance = distance
      best = { before: blocks[index] ?? null, top, left: surface.left, width: surface.width }
    }
  }
  return best
}

/** Finds what actually scrolls the page around the editor. */
export function scrollParent(element: HTMLElement): HTMLElement {
  let current = element.parentElement
  while (current) {
    const { overflowY } = getComputedStyle(current)
    if ((overflowY === 'auto' || overflowY === 'scroll') && current.scrollHeight > current.clientHeight) return current
    current = current.parentElement
  }
  return element.ownerDocument.documentElement
}

// ---- Upload placeholders ---------------------------------------------------

export interface UploadView {
  name: string
  thumbnail: string
  state: 'uploading' | 'error'
  percent: number
  message: string
}

export function createUploadPlaceholder(doc: Document, id: string, view: UploadView): HTMLElement {
  const element = doc.createElement('div')
  element.setAttribute(UPLOAD_ATTRIBUTE, id)
  element.setAttribute('contenteditable', 'false')
  element.className = 'admin-upload'
  paintUploadPlaceholder(element, view)
  return element
}

function uploadStatus(view: UploadView): string {
  if (view.state === 'error') return view.message
  return view.percent >= 100 ? 'Finishing up…' : `Uploading… ${view.percent}%`
}

export function paintUploadPlaceholder(element: HTMLElement, view: UploadView) {
  const doc = element.ownerDocument
  const status = element.querySelector<HTMLElement>('.admin-upload__status')
  const bar = element.querySelector<HTMLElement>('.admin-upload__bar i')
  if (element.getAttribute('data-state') === view.state && status) {
    status.textContent = uploadStatus(view)
    if (bar) bar.style.width = `${view.percent}%`
    return
  }

  element.setAttribute('data-state', view.state)
  element.replaceChildren()

  const thumbnail = doc.createElement('img')
  thumbnail.className = 'admin-upload__thumb'
  thumbnail.src = view.thumbnail
  thumbnail.alt = ''
  thumbnail.draggable = false

  const body = doc.createElement('div')
  body.className = 'admin-upload__body'
  const name = doc.createElement('strong')
  name.textContent = view.name
  const text = doc.createElement('span')
  text.className = 'admin-upload__status'
  text.setAttribute('role', 'status')
  text.textContent = uploadStatus(view)
  body.append(name, text)

  if (view.state === 'uploading') {
    const track = doc.createElement('span')
    track.className = 'admin-upload__bar'
    const fill = doc.createElement('i')
    fill.style.width = `${view.percent}%`
    track.append(fill)
    body.append(track)
  }

  const actions = doc.createElement('div')
  actions.className = 'admin-upload__actions'
  const action = (kind: string, label: string) => {
    const button = doc.createElement('button')
    button.type = 'button'
    button.className = 'admin-button admin-button--sm'
    button.setAttribute('data-rte-action', kind)
    button.textContent = label
    return button
  }
  if (view.state === 'error') actions.append(action('retry', 'Retry'), action('remove', 'Remove'))
  else actions.append(action('remove', 'Cancel'))

  element.append(thumbnail, body, actions)
}
