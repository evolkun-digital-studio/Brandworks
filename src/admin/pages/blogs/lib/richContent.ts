export const COLORS = [
  { label: 'Red', value: 'red', swatch: '#b42318' },
  { label: 'Orange', value: 'orange', swatch: '#c76a16' },
  { label: 'Green', value: 'green', swatch: '#34764a' },
  { label: 'Blue', value: 'blue', swatch: '#2463a8' },
  { label: 'Purple', value: 'purple', swatch: '#7446a8' },
  { label: 'Accent', value: 'accent', swatch: '#9bb900' },
] as const

export const FONT_SIZES = [
  { label: 'Default', value: '' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
  { label: '40', value: '40px' },
  { label: '48', value: '48px' },
] as const

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character)
}

export function escapeAttribute(value: string): string {
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

/** Browsers write presentational tags; store their semantic equivalents. */
const TAG_ALIASES: Record<string, string> = { b: 'strong', i: 'em', strike: 's', del: 's' }

/** Dropped with their contents — never unwrapped, so no stray scripts or styles survive. */
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'meta', 'link', 'head', 'title', 'svg', 'canvas', 'form', 'input', 'button', 'select', 'textarea'])

function isSafeResource(value: string): boolean {
  return /^(?:https?:\/\/|\/)/i.test(value)
}

/**
 * Reduces arbitrary HTML to the small vocabulary the editor and the public
 * renderer both understand. Unknown wrappers (font, table cells, Word spans…)
 * are unwrapped rather than deleted, so pasted text is never lost.
 */
export function sanitizeEditableHtml(source: string): string {
  const parsed = new DOMParser().parseFromString(source, 'text/html')
  const body = parsed.body

  function clean(element: Element) {
    Array.from(element.children).forEach((child) => {
      const original = child.tagName.toLowerCase()
      if (DROP_WITH_CONTENT.has(original)) {
        child.remove()
        return
      }

      clean(child)

      const tag = TAG_ALIASES[original] ?? original
      if (!EDITABLE_TAGS.has(tag)) {
        child.replaceWith(...Array.from(child.childNodes))
        return
      }

      let target = child
      if (tag !== original) {
        const replacement = parsed.createElement(tag)
        replacement.append(...Array.from(child.childNodes))
        child.replaceWith(replacement)
        target = replacement
      }

      Array.from(target.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase()
        const keep = (tag === 'span' && name === 'data-color' && COLORS.some((color) => color.value === attribute.value))
          || (tag === 'span' && name === 'data-font-size' && FONT_SIZES.some((size) => size.value === attribute.value))
          || (tag === 'div' && name === 'data-layout' && attribute.value === 'media-text')
          || ((tag === 'a' || tag === 'img') && ['href', 'src', 'alt', 'title'].includes(name) && (name === 'alt' || name === 'title' || isSafeResource(attribute.value)))
        if (!keep) target.removeAttribute(attribute.name)
      })

      // A span with nothing left to say is only noise.
      if (tag === 'span' && target.attributes.length === 0) target.replaceWith(...Array.from(target.childNodes))
    })
  }

  clean(body)
  return body.innerHTML
}

/** Plain text → paragraphs, for pasting text that carries no markup. */
export function textToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

export function markdownToEditableHtml(source: string): string {
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

export function mediaTextHtml(src: string, alt: string, caption: string, text: string): string {
  return `<div data-layout="media-text"><figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure><div><p>${escapeHtml(text)}</p></div></div><p><br /></p>`
}

export function figureHtml(src: string, alt: string, caption: string): string {
  return `<figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(alt)}" /><figcaption>${escapeHtml(caption)}</figcaption></figure><p><br /></p>`
}
