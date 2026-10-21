'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
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
  MoreHorizontal,
  Palette,
  Quote,
  Strikethrough,
  Type,
  Underline,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { toast } from 'sonner'
import { markdownRehypePlugins } from '../../../../blog/lib/markdownConfig'
import * as mediaApi from '../../../api/mediaAdminApi'

const COLORS = [
  { label: 'Red', value: 'red', className: 'bg-[#b42318]' },
  { label: 'Orange', value: 'orange', className: 'bg-[#c76a16]' },
  { label: 'Green', value: 'green', className: 'bg-[#34764a]' },
  { label: 'Blue', value: 'blue', className: 'bg-[#2463a8]' },
  { label: 'Purple', value: 'purple', className: 'bg-[#7446a8]' },
  { label: 'Accent', value: 'accent', className: 'bg-[#9bb900]' },
] as const

const FONT_SIZES = [
  { label: 'Default', value: '' },
  { label: '12 px', value: '12px' },
  { label: '14 px', value: '14px' },
  { label: '16 px', value: '16px' },
  { label: '18 px', value: '18px' },
  { label: '20 px', value: '20px' },
  { label: '24 px', value: '24px' },
  { label: '28 px', value: '28px' },
  { label: '32 px', value: '32px' },
  { label: '40 px', value: '40px' },
  { label: '48 px', value: '48px' },
] as const

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

function escapeAttribute(value: string): string {
  return escapeHtml(value.trim())
}

function inlineMarkdownToHtml(value: string): string {
  const rawTags: string[] = []
  const withTokens = value.replace(/<\/?(?:u|mark|span|div|figure|figcaption|p|br|img)(?:\s[^>]*)?>/gi, (tag) => {
    const token = `__BRANDWORKS_HTML_${rawTags.length}__`
    rawTags.push(tag)
    return token
  })

  let html = escapeHtml(withTokens)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"([^"]*)")?\)/g, (_match, alt: string, src: string, title?: string) => `<img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}"${title ? ` title="${escapeAttribute(title)}"` : ''} />`)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
  return html.replace(/__BRANDWORKS_HTML_(\d+)__/g, (_match, index: string) => rawTags[Number(index)] ?? '')
}

const EDITABLE_TAGS = new Set([
  'a', 'blockquote', 'br', 'code', 'div', 'em', 'figcaption', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img', 'li', 'mark', 'ol',
  'p', 'pre', 's', 'span', 'strong', 'u', 'ul',
])

function isSafeResource(value: string): boolean {
  return /^(?:https?:\/\/|\/)/i.test(value)
}

function sanitizeEditableHtml(source: string): string {
  const document = new DOMParser().parseFromString(source, 'text/html')
  document.body.querySelectorAll('*').forEach((element) => {
    const tag = element.tagName.toLowerCase()
    if (!EDITABLE_TAGS.has(tag)) {
      element.remove()
      return
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase()
      const keep = (tag === 'span' && name === 'data-color' && COLORS.some((color) => color.value === attribute.value))
        || (tag === 'span' && name === 'data-font-size' && FONT_SIZES.some((size) => size.value === attribute.value))
        || (tag === 'div' && name === 'data-layout' && attribute.value === 'media-text')
        || ((tag === 'a' || tag === 'img') && ['href', 'src', 'alt', 'title'].includes(name) && (name === 'alt' || name === 'title' || isSafeResource(attribute.value)))
      if (!keep) element.removeAttribute(attribute.name)
    })
  })
  return document.body.innerHTML
}

function markdownToEditableHtml(source: string): string {
  if (!source.trim()) return ''

  // Visual edits are stored as sanitized HTML mixed with Markdown. Keep that
  // structure intact when switching back to the editor after a save.
  if (/<(?:p|h[1-6]|ul|ol|blockquote|div|figure|img)\b/i.test(source)) return sanitizeEditableHtml(source)

  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      const level = Math.min(6, heading[1].length)
      output.push(`<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
      output.push('<hr />')
      index += 1
      continue
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''))
        index += 1
      }
      output.push(`<blockquote><p>${inlineMarkdownToHtml(quote.join(' '))}</p></blockquote>`)
      continue
    }

    if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line)
      const items: string[] = []
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(`<li>${inlineMarkdownToHtml(lines[index].replace(pattern, ''))}</li>`)
        index += 1
      }
      output.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`)
      continue
    }

    const paragraph: string[] = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^(#{1,6})\s+|^\s*(?:[-*+]\s+|\d+\.\s+|>\s?)/.test(lines[index])) {
      paragraph.push(lines[index])
      index += 1
    }
    output.push(`<p>${inlineMarkdownToHtml(paragraph.join(' '))}</p>`)
  }

  return output.join('')
}

function escapePromptText(value: string): string {
  return value.replace(/[<>]/g, '')
}

function RichContentEditor({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string
  onChange: (next: string) => void
  onBlur?: () => void
  error?: string | null
}) {
  const [mode, setMode] = useState<'visual' | 'preview'>('visual')
  const [headingOpen, setHeadingOpen] = useState(false)
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [colorOpen, setColorOpen] = useState(false)
  const [mediaOpen, setMediaOpen] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaAssets, setMediaAssets] = useState<mediaApi.MediaAsset[]>([])
  const visualRef = useRef<HTMLDivElement>(null)
  const savedSelection = useRef<Range | null>(null)
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

  function syncVisualValue() {
    const editor = visualRef.current
    if (!editor) return
    const next = editor.innerHTML === '<br>' ? '' : editor.innerHTML
    lastSyncedValue.current = next
    onChange(next)
  }

  function rememberSelection() {
    const editor = visualRef.current
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    if (editor.contains(range.commonAncestorContainer)) savedSelection.current = range.cloneRange()
  }

  function restoreSelection() {
    const selection = window.getSelection()
    if (!selection || !savedSelection.current) return
    selection.removeAllRanges()
    selection.addRange(savedSelection.current)
  }

  function runCommand(command: string, argument?: string) {
    visualRef.current?.focus()
    restoreSelection()
    document.execCommand(command, false, argument)
    syncVisualValue()
  }

  function insertHtml(html: string) {
    visualRef.current?.focus()
    restoreSelection()
    document.execCommand('insertHTML', false, html)
    syncVisualValue()
  }

  function wrapSelection(tagName: 'mark' | 'span', color?: string, fontSize?: string) {
    const selection = window.getSelection()
    const editor = visualRef.current
    if (!selection || !editor || selection.rangeCount === 0 || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) return

    const wrapper = document.createElement(tagName)
    if (color) wrapper.dataset.color = color
    if (fontSize) wrapper.dataset.fontSize = fontSize
    try {
      range.surroundContents(wrapper)
    } catch {
      const fragment = range.extractContents()
      wrapper.appendChild(fragment)
      range.insertNode(wrapper)
    }
    selection.removeAllRanges()
    const nextRange = document.createRange()
    nextRange.selectNodeContents(wrapper)
    selection.addRange(nextRange)
    syncVisualValue()
  }

  function clearFontSize() {
    const selection = window.getSelection()
    const editor = visualRef.current
    if (!selection || !editor || selection.rangeCount === 0 || selection.isCollapsed) return
    const range = selection.getRangeAt(0)
    if (!editor.contains(range.commonAncestorContainer)) return

    const holder = document.createElement('span')
    holder.appendChild(range.extractContents())
    holder.querySelectorAll('span[data-font-size]').forEach((span) => span.removeAttribute('data-font-size'))
    range.insertNode(holder)
    selection.removeAllRanges()
    const nextRange = document.createRange()
    nextRange.selectNodeContents(holder)
    selection.addRange(nextRange)
    syncVisualValue()
  }

  function applyFontSize(size: string) {
    if (size) wrapSelection('span', undefined, size)
    else clearFontSize()
  }

  function addImage() {
    const src = window.prompt('Image URL')?.trim()
    if (!src) return
    const alt = window.prompt('Describe the image for accessibility')?.trim() || 'Article image'
    insertHtml(`<figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" /><figcaption>${escapeHtml(alt)}</figcaption></figure><p><br /></p>`)
  }

  function insertMediaAsset(asset: mediaApi.MediaAsset, withText = false) {
    if (withText) {
      const text = escapePromptText(window.prompt('Supporting text')?.trim() || 'Add supporting text here.')
      insertHtml(`<div data-layout="media-text"><figure><img src="${escapeAttribute(asset.publicUrl)}" alt="${escapeAttribute(asset.altText || asset.originalName)}" /><figcaption>${escapeHtml(asset.caption || asset.altText || asset.originalName)}</figcaption></figure><div><p>${escapeHtml(text)}</p></div></div><p><br /></p>`)
    } else {
      insertHtml(`<figure><img src="${escapeAttribute(asset.publicUrl)}" alt="${escapeAttribute(asset.altText || asset.originalName)}" /><figcaption>${escapeHtml(asset.caption || asset.altText || asset.originalName)}</figcaption></figure><p><br /></p>`)
    }
    setMediaOpen(false)
  }

  async function openMediaPicker() {
    setMediaOpen(true)
    if (mediaAssets.length > 0) return
    setMediaLoading(true)
    try {
      const result = await mediaApi.listMedia({ type: 'image', limit: 24 })
      setMediaAssets(result.assets)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the media library.')
    } finally {
      setMediaLoading(false)
    }
  }

  async function uploadAndInsert(file: File) {
    const altText = window.prompt('Describe the image for accessibility')?.trim()
    if (!altText) return
    setMediaLoading(true)
    try {
      const { asset } = await mediaApi.uploadMedia(file, altText, '')
      setMediaAssets((current) => [asset, ...current])
      insertMediaAsset(asset)
      toast.success('Image uploaded and added.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the image.')
    } finally {
      setMediaLoading(false)
    }
  }

  function addMediaTextBlock() {
    const src = window.prompt('Image URL')?.trim()
    if (!src) return
    const alt = window.prompt('Describe the image for accessibility')?.trim() || 'Article image'
    const text = escapePromptText(window.prompt('Supporting text')?.trim() || 'Add supporting text here.')
    insertHtml(`<div data-layout="media-text"><figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" /><figcaption>${escapeHtml(alt)}</figcaption></figure><div><p>${escapeHtml(text)}</p></div></div><p><br /></p>`)
  }

  const preventToolbarBlur = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    rememberSelection()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label htmlFor="content" className="text-[14px] font-medium text-neutral-900">Content</label>
          <p className="mt-1 text-[12px] text-neutral-400">Write visually with rich formatting, images, layouts, and a clean preview.</p>
        </div>
        <div className="flex shrink-0 gap-1 rounded-[6px] bg-neutral-100 p-0.5">
          {(['visual', 'preview'] as const).map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} aria-pressed={mode === item} className={`rounded-[4px] px-3 py-1 text-[12px] font-medium capitalize transition-colors ${mode === item ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {mode === 'visual' && <>
        <div className="admin-editor-toolbar" aria-label="Visual formatting tools">
          <div className="admin-editor-toolbar__heading-wrap">
            <button type="button" onMouseDown={preventToolbarBlur} onClick={() => setHeadingOpen((open) => !open)} aria-haspopup="menu" aria-expanded={headingOpen} title="Choose heading level" aria-label="Choose heading level"><Heading2 size={15} aria-hidden="true" /><span>Heading</span><ChevronDown size={13} aria-hidden="true" /></button>
            {headingOpen && <div className="admin-editor-toolbar__heading-menu" role="menu" aria-label="Heading levels">
              {[
                { label: 'H1', tag: 'h1', Icon: Heading1 },
                { label: 'H2', tag: 'h2', Icon: Heading2 },
                { label: 'H3', tag: 'h3', Icon: Heading3 },
                { label: 'H4', tag: 'h4', Icon: Heading4 },
              ].map(({ label, tag, Icon }) => (
                <button key={tag} type="button" role="menuitem" onMouseDown={preventToolbarBlur} onClick={() => { runCommand('formatBlock', tag); setHeadingOpen(false) }}><Icon size={15} aria-hidden="true" /><span>{label}</span></button>
              ))}
            </div>}
          </div>
          <div className="admin-editor-toolbar__size-wrap">
            <button type="button" onMouseDown={preventToolbarBlur} onClick={() => setFontSizeOpen((open) => !open)} aria-haspopup="menu" aria-expanded={fontSizeOpen} title="Choose text size" aria-label="Choose text size"><Type size={15} aria-hidden="true" /><span>Size</span><ChevronDown size={13} aria-hidden="true" /></button>
            {fontSizeOpen && <div className="admin-editor-toolbar__size-menu" role="menu" aria-label="Text sizes">
              {FONT_SIZES.map(({ label, value }) => (
                <button key={label} type="button" role="menuitem" onMouseDown={preventToolbarBlur} onClick={() => { applyFontSize(value); setFontSizeOpen(false) }}>{label}</button>
              ))}
            </div>}
          </div>
          <span className="admin-editor-toolbar__divider" aria-hidden="true" />
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('bold')} title="Bold" aria-label="Bold"><Bold size={15} aria-hidden="true" /><span>Bold</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('italic')} title="Italic" aria-label="Italic"><Italic size={15} aria-hidden="true" /><span>Italic</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('underline')} title="Underline" aria-label="Underline"><Underline size={15} aria-hidden="true" /><span>Underline</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('strikeThrough')} title="Strikethrough" aria-label="Strikethrough"><Strikethrough size={15} aria-hidden="true" /><span>Strike</span></button>
          <span className="admin-editor-toolbar__divider" aria-hidden="true" />
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => { const href = window.prompt('Link URL')?.trim(); if (href) runCommand('createLink', href) }} title="Link" aria-label="Link"><Link2 size={15} aria-hidden="true" /><span>Link</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('insertUnorderedList')} title="Bullet list" aria-label="Bullet list"><List size={15} aria-hidden="true" /><span>List</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('insertOrderedList')} title="Numbered list" aria-label="Numbered list"><ListOrdered size={15} aria-hidden="true" /><span>Numbered</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('formatBlock', 'blockquote')} title="Blockquote" aria-label="Blockquote"><Quote size={15} aria-hidden="true" /><span>Quote</span></button>
          <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('formatBlock', 'pre')} title="Code block" aria-label="Code block"><Code2 size={15} aria-hidden="true" /><span>Code</span></button>
          <button type="button" className="admin-editor-toolbar__more" onMouseDown={preventToolbarBlur} onClick={() => setAdvancedOpen((open) => !open)} aria-expanded={advancedOpen} title="More formatting"><MoreHorizontal size={16} aria-hidden="true" /><span>More</span></button>
          {advancedOpen && <div className="admin-editor-toolbar__advanced">
            <div className="admin-editor-toolbar__color-wrap">
              <button type="button" onMouseDown={preventToolbarBlur} onClick={() => setColorOpen((open) => !open)} aria-expanded={colorOpen} title="Text color" aria-label="Text color"><Palette size={15} aria-hidden="true" /><span>Color</span></button>
              {colorOpen && <div className="admin-editor-toolbar__color-menu" role="menu" aria-label="Text colors">
                {COLORS.map((color) => <button key={color.value} type="button" role="menuitem" onMouseDown={preventToolbarBlur} onClick={() => { wrapSelection('span', color.value); setColorOpen(false) }} title={color.label} aria-label={`Text color ${color.label}`}><span className={`admin-editor-toolbar__swatch ${color.className}`} aria-hidden="true" />{color.label}</button>)}
              </div>}
            </div>
            <button type="button" onMouseDown={preventToolbarBlur} onClick={() => wrapSelection('mark')} title="Highlight" aria-label="Highlight"><Highlighter size={15} aria-hidden="true" /><span>Highlight</span></button>
            <button type="button" onMouseDown={preventToolbarBlur} onClick={() => void openMediaPicker()} title="Browse media library" aria-label="Browse media library"><ImagePlus size={15} aria-hidden="true" /><span>Media</span></button>
            <button type="button" onMouseDown={preventToolbarBlur} onClick={addImage} title="Add image from URL" aria-label="Add image from URL"><ImagePlus size={15} aria-hidden="true" /><span>Image URL</span></button>
            <button type="button" onMouseDown={preventToolbarBlur} onClick={addMediaTextBlock} title="Add image with supporting text" aria-label="Add image with supporting text"><ImagePlus size={15} aria-hidden="true" /><span>Image + text</span></button>
            <button type="button" onMouseDown={preventToolbarBlur} onClick={() => runCommand('removeFormat')} title="Clear formatting" aria-label="Clear formatting"><Eraser size={15} aria-hidden="true" /><span>Clear</span></button>
          </div>}
        </div>
        <div
          ref={visualRef}
          id="content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'content-error' : undefined}
          onInput={syncVisualValue}
          onBlur={onBlur}
          className="admin-rich-editor markdown-rich-content min-h-[380px] rounded-[10px] border border-neutral-300 bg-white px-4 py-3 text-[15px] leading-[1.7] text-neutral-800 outline-none"
          data-placeholder="Start writing your article…"
        />
        <p className="text-[12px] text-neutral-400">Add images from a URL, or use Image + text for a responsive editorial split block.</p>
      </>}

      {mode === 'preview' && <div className="markdown-rich-content min-h-[380px] rounded-[10px] border border-neutral-200 bg-neutral-50 px-4 py-3 text-[14px] leading-[1.7] text-neutral-800">
        {value.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={markdownRehypePlugins}>{value}</ReactMarkdown> : <p className="text-neutral-400">Nothing to preview yet.</p>}
      </div>}

      {mediaOpen && <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setMediaOpen(false) }}>
        <section className="admin-modal admin-rich-media-picker" role="dialog" aria-modal="true" aria-labelledby="rich-media-picker-title">
          <div className="admin-modal__header">
            <div><p className="admin-eyebrow">Content media</p><h2 id="rich-media-picker-title">Choose an image</h2></div>
            <button type="button" className="admin-button admin-button--quiet" onClick={() => setMediaOpen(false)}>Close</button>
          </div>
          <label className="admin-upload-dropzone">
            <span className="font-medium text-neutral-900">Upload a new image</span>
            <span className="text-[12px] text-neutral-500">It will be added to the Media Library and inserted here.</span>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" disabled={mediaLoading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAndInsert(file) }} />
          </label>
          {mediaLoading ? <p className="text-[13px] text-neutral-500">Loading media…</p> : mediaAssets.length === 0 ? <p className="text-[13px] text-neutral-500">No images in the library yet. Upload one above.</p> : <div className="admin-rich-media-grid">{mediaAssets.map((asset) => <article key={asset.id} className="admin-rich-media-card"><img src={asset.publicUrl} alt="" /><div><strong>{asset.originalName}</strong><span>{asset.altText || 'Missing alt text'}</span></div><div className="admin-rich-media-card__actions"><button type="button" className="admin-button admin-button--secondary" onClick={() => insertMediaAsset(asset)}>Image</button><button type="button" className="admin-button admin-button--quiet" onClick={() => insertMediaAsset(asset, true)}>Image + text</button></div></article>)}</div>}
        </section>
      </div>}

      {error && <p id="content-error" className="admin-field-error" role="alert">{error}</p>}
      <div className="text-right text-[12px] text-neutral-400">{value.length.toLocaleString()} / 100,000</div>
    </div>
  )
}

export default RichContentEditor
