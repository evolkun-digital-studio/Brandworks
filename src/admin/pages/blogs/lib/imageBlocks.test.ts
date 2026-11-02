// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { EditorHistory } from './editorHistory'
import {
  createFigure,
  deleteImage,
  ensureTrailingParagraph,
  imageNextToCaret,
  initialImageWidth,
  isSamePosition,
  moveBlock,
  normalizeWebAddress,
  nudgeBlock,
  placeBlocks,
  prepareImages,
  resolveInsertionPoint,
  serializeEditorHtml,
  setImageAlign,
  setImageLink,
  setImageWidth,
  setImageWrap,
  toggleImageCaption,
  validateImageFile,
} from './imageBlocks'
import { markdownToEditableHtml, sanitizeEditableHtml } from './richContent'

let root: HTMLElement

function figureOf(src = '/a.png') {
  return createFigure(document, { src, alt: 'An image', width: 50, align: 'center' })
}

function caretIn(node: Node, offset: number) {
  const range = document.createRange()
  range.setStart(node, offset)
  range.collapse(true)
  return range
}

const order = () => Array.from(root.children).map((child) => child.tagName === 'FIGURE' ? 'IMG' : child.textContent || '∅')

beforeEach(() => {
  root = document.createElement('div')
  document.body.replaceChildren(root)
})

describe('inserting at the cursor', () => {
  it('splits a paragraph at the caret and keeps all of its text', () => {
    root.innerHTML = '<p data-align="center">Hello <strong>brave</strong> world</p><p>After</p>'
    const text = root.querySelector('strong')?.firstChild as Text
    const point = resolveInsertionPoint(root, caretIn(text, 2))
    const paragraph = placeBlocks(root, [figureOf()], point)

    expect(order()).toEqual(['Hello br', 'IMG', '∅', 'ave world', 'After'])
    expect(root.children[3].getAttribute('data-align')).toBe('center')
    expect(paragraph).toBe(root.children[2])
  })

  it('goes before a paragraph when the caret is at its start, and after when at its end', () => {
    root.innerHTML = '<p>One</p><p>Two</p>'
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, caretIn(root.children[1].firstChild as Text, 0)))
    expect(order()).toEqual(['One', 'IMG', '∅', 'Two'])

    root.innerHTML = '<p>One</p><p>Two</p>'
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, caretIn(root.children[0].firstChild as Text, 3)))
    expect(order()).toEqual(['One', 'IMG', '∅', 'Two'])
  })

  it('takes the place of an empty paragraph', () => {
    root.innerHTML = '<p>One</p><p><br></p><p>Two</p>'
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, caretIn(root.children[1], 0)))
    expect(order()).toEqual(['One', 'IMG', '∅', 'Two'])
  })

  it('goes after the block when text is selected, leaving the selection intact', () => {
    root.innerHTML = '<p>Selected text</p><p>Next</p>'
    const text = root.children[0].firstChild as Text
    const range = document.createRange()
    range.setStart(text, 0)
    range.setEnd(text, 8)
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, range))
    expect(order()).toEqual(['Selected text', 'IMG', '∅', 'Next'])
  })

  it('never splits a list, quote or code block', () => {
    root.innerHTML = '<ul><li>One</li><li>Two</li></ul><p>End</p>'
    const text = root.querySelectorAll('li')[0].firstChild as Text
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, caretIn(text, 1)))
    expect(root.querySelectorAll('li')).toHaveLength(2)
    expect(root.children[0].tagName).toBe('UL')
    expect(root.children[1].tagName).toBe('FIGURE')
  })

  it('wraps bare typed text instead of losing the caret position', () => {
    root.innerHTML = 'Typed straight in'
    const text = root.firstChild as Text
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, caretIn(text, 5)))
    expect(order()).toEqual(['Typed', 'IMG', '∅', ' straight in'])
  })

  it('falls back to the end only when the editor has never had a cursor', () => {
    root.innerHTML = '<p>One</p>'
    placeBlocks(root, [figureOf()], resolveInsertionPoint(root, null))
    expect(order()).toEqual(['One', 'IMG', '∅'])
  })
})

describe('moving a block', () => {
  beforeEach(() => {
    root.innerHTML = '<h2>Heading</h2><p>Para one</p><p>Para two</p><ul><li>Item</li></ul><blockquote>Quote</blockquote><pre>Code</pre>'
  })

  it.each([
    ['the very top', 0],
    ['between paragraphs', 2],
    ['before a list', 3],
    ['after a quote', 5],
  ])('moves to %s without duplicating or losing anything', (_label, index) => {
    const figure = figureOf()
    root.children[1].after(figure)
    const text = root.textContent
    moveBlock(root, figure, root.children[index])
    expect(root.querySelectorAll('figure')).toHaveLength(1)
    expect(root.textContent).toBe(text)
    expect(root.querySelectorAll('p, h2, ul, blockquote, pre')).toHaveLength(6)
  })

  it('moves to the very bottom and keeps a line below for the caret', () => {
    const figure = figureOf()
    root.prepend(figure)
    moveBlock(root, figure, null)
    expect(root.lastElementChild?.previousElementSibling).toBe(figure)
    expect(root.lastElementChild?.tagName).toBe('P')
  })

  it('takes the empty line under the image with it rather than leaving a gap', () => {
    root.innerHTML = '<p>One</p><p>Two</p><p>Three</p>'
    const figure = figureOf()
    const spare = document.createElement('p')
    spare.innerHTML = '<br>'
    root.children[0].after(figure, spare)
    moveBlock(root, figure, root.lastElementChild)
    expect(order()).toEqual(['One', 'Two', 'IMG', 'Three'])
  })

  it('recognises a drop that would change nothing', () => {
    root.innerHTML = '<p>One</p><p>Two</p>'
    const figure = figureOf()
    const spare = document.createElement('p')
    spare.innerHTML = '<br>'
    root.children[0].after(figure, spare)
    expect(isSamePosition(figure, root, spare)).toBe(true)
    expect(isSamePosition(figure, root, root.lastElementChild)).toBe(true)
    expect(isSamePosition(figure, root, root.firstElementChild)).toBe(false)
    expect(isSamePosition(figure, root, null)).toBe(false)
  })

  it('nudges one real block at a time, and stops at the ends', () => {
    root.innerHTML = '<p>One</p><p>Two</p>'
    const figure = figureOf()
    root.prepend(figure)
    expect(nudgeBlock(root, figure, 'up')).toBe(false)
    expect(nudgeBlock(root, figure, 'down')).toBe(true)
    expect(order()).toEqual(['One', 'IMG', 'Two'])
    expect(nudgeBlock(root, figure, 'down')).toBe(true)
    expect(order()).toEqual(['One', 'Two', 'IMG', '∅'])
    expect(nudgeBlock(root, figure, 'down')).toBe(false)
    expect(nudgeBlock(root, figure, 'up')).toBe(true)
    expect(order().filter((item) => item === 'IMG')).toHaveLength(1)
  })

  it('lifts an image out of a list with its first nudge', () => {
    root.innerHTML = '<ul><li></li></ul><p>After</p>'
    const figure = figureOf()
    root.querySelector('li')?.append(figure)
    expect(nudgeBlock(root, figure, 'down')).toBe(true)
    expect(root.children[1]).toBe(figure)
    expect(root.querySelector('li')?.innerHTML).toBe('<br>')
  })
})

describe('deleting', () => {
  it('removes only the image', () => {
    root.innerHTML = '<p>One</p><p>Two</p>'
    const figure = figureOf()
    root.children[0].after(figure)
    deleteImage(root, figure)
    expect(order()).toEqual(['One', 'Two'])
  })

  it('keeps the text of an image-and-text layout', () => {
    root.innerHTML = '<div data-layout="media-text"><figure><img src="/a.png" alt=""></figure><div><p>Kept</p><p>Also kept</p></div></div>'
    prepareImages(root)
    deleteImage(root, root.querySelector('figure') as HTMLElement)
    expect(order()).toEqual(['Kept', 'Also kept'])
  })

  it('selects a neighbouring image first when Backspace or Delete would remove it', () => {
    root.innerHTML = '<p>Before</p><p>After</p>'
    const figure = figureOf()
    root.children[0].after(figure)
    const after = root.children[2].firstChild as Text
    expect(imageNextToCaret(root, caretIn(after, 0), 'backward')?.figure).toBe(figure)
    expect(imageNextToCaret(root, caretIn(after, 2), 'backward')).toBeNull()
    const before = root.children[0].firstChild as Text
    expect(imageNextToCaret(root, caretIn(before, 6), 'forward')?.figure).toBe(figure)
    expect(imageNextToCaret(root, caretIn(before, 1), 'forward')).toBeNull()
  })
})

describe('layout rules', () => {
  it('leaves full width with a visibly different size', () => {
    const figure = figureOf()
    setImageAlign(figure, 'full')
    expect(figure.getAttribute('data-width')).toBe('100')
    setImageAlign(figure, 'left')
    expect(figure.getAttribute('data-width')).toBe('75')
  })

  it('shrinks a wide image when wrapping, and alignment clears the wrap', () => {
    const figure = figureOf()
    setImageWidth(figure, 100)
    setImageWrap(figure, 'right')
    expect(figure.getAttribute('data-width')).toBe('50')
    expect(figure.getAttribute('data-align')).toBe('right')
    setImageAlign(figure, 'center')
    expect(figure.hasAttribute('data-wrap')).toBe(false)
  })

  it('stops wrapping at 100%, because no room is left for text', () => {
    const figure = figureOf()
    setImageWrap(figure, 'left')
    setImageWidth(figure, 100)
    expect(figure.hasAttribute('data-wrap')).toBe(false)
  })

  it('adds and removes a link without touching the image', () => {
    const figure = figureOf()
    setImageLink(figure, 'https://example.com')
    expect(figure.querySelector('a img')).not.toBeNull()
    setImageLink(figure, null)
    expect(figure.querySelector('a')).toBeNull()
    expect(figure.querySelector('img')).not.toBeNull()
  })

  it('starts small images at their own size', () => {
    expect(initialImageWidth(336, 672)).toBe(50)
    expect(initialImageWidth(4000, 672)).toBe(100)
    expect(initialImageWidth(null, 672)).toBe(100)
  })
})

describe('stored HTML', () => {
  it('strips editor scaffolding and keeps every image attribute', () => {
    const figure = createFigure(document, { src: '/a.png', alt: 'Alt', caption: 'Cap', link: 'https://example.com', width: 50, align: 'right', wrap: 'right', naturalWidth: 800, naturalHeight: 600 })
    root.append(figure)
    ensureTrailingParagraph(root)
    expect(figure.getAttribute('contenteditable')).toBe('false')
    expect(figure.style.getPropertyValue('--rc-image-width')).toBe('50%')

    expect(serializeEditorHtml(root)).toBe('<figure data-width="50" data-align="right" data-wrap="right"><a href="https://example.com"><img src="/a.png" alt="Alt" width="800" height="600"></a><figcaption>Cap</figcaption></figure>')
  })

  it('stores a caption as plain words, without editing leftovers', () => {
    const figure = figureOf()
    const caption = toggleImageCaption(figure) as HTMLElement
    caption.innerHTML = ' <span style="color:red">Styled</span> words '
    caption.setAttribute('style', '')
    root.append(figure)
    expect(serializeEditorHtml(root)).toContain('<figcaption>Styled words</figcaption>')
  })

  it('never stores an unfinished upload or an empty caption', () => {
    root.innerHTML = '<p>Text</p><div data-rte-upload="upload-1" contenteditable="false">Uploading</div>'
    const figure = figureOf()
    toggleImageCaption(figure)
    root.append(figure)
    const stored = serializeEditorHtml(root)
    expect(stored).not.toContain('upload')
    expect(stored).not.toContain('figcaption')
    expect(stored).toContain('<p>Text</p>')
  })

  it('survives a full save and reload unchanged', () => {
    const figure = createFigure(document, { src: 'https://example.com/a.png', alt: 'Alt', caption: 'Cap', link: 'https://example.com/', width: 25, align: 'left', wrap: 'left', naturalWidth: 10, naturalHeight: 20, vector: true })
    figure.setAttribute('data-ratio', '1.5')
    root.append(figure)
    const stored = serializeEditorHtml(root)

    root.innerHTML = markdownToEditableHtml(stored)
    prepareImages(root)
    expect(serializeEditorHtml(root)).toBe(stored)
  })

  it('removes invalid or scriptable attributes on load', () => {
    const clean = sanitizeEditableHtml('<figure data-width="500" data-align="evil" data-wrap="x" data-ratio="abc" onclick="x()" style="width:1px"><img src="javascript:alert(1)" alt="a" width="1e9" onerror="x()"></figure>')
    expect(clean).toBe('<figure><img alt="a"></figure>')
  })
})

describe('older content', () => {
  it('turns a bare image into a block without losing the text around it', () => {
    root.innerHTML = '<p>Before <strong>bold <img src="/a.png"> tail</strong> after</p>'
    prepareImages(root)
    expect(root.children).toHaveLength(3)
    expect(root.children[0].textContent).toBe('Before bold ')
    expect(root.children[1].tagName).toBe('FIGURE')
    expect(root.children[1].querySelector('img')?.getAttribute('alt')).toBe('')
    expect(root.children[2].textContent).toBe(' tail after')
  })

  it('keeps a linked bare image linked', () => {
    root.innerHTML = '<p><a href="https://example.com"><img src="/a.png" alt="A"></a></p>'
    prepareImages(root)
    expect(root.children).toHaveLength(1)
    expect(root.querySelector('figure > a > img')).not.toBeNull()
  })

  it('leaves a plain figure stored without any layout attributes untouched', () => {
    root.innerHTML = '<figure><img src="/a.png" alt="A"></figure>'
    prepareImages(root)
    expect(serializeEditorHtml(root)).toBe('<figure><img src="/a.png" alt="A"></figure>')
  })
})

describe('checks before inserting', () => {
  it('validates the file type and size with a clear message', () => {
    const file = (type: string, size = 100) => ({ name: 'a.file', type, size })
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']) expect(validateImageFile(file(type))).toBeNull()
    expect(validateImageFile(file('image/bmp'))).toContain('JPG, PNG, WebP, GIF or SVG')
    expect(validateImageFile(file('application/pdf'))).toContain('JPG, PNG, WebP, GIF or SVG')
    expect(validateImageFile(file('image/png', 21 * 1024 * 1024))).toContain('21.0 MB')
    expect(validateImageFile(file('image/png', 0))).toContain('empty')
  })

  it('only accepts safe link addresses', () => {
    expect(normalizeWebAddress('https://example.com/a')).toBe('https://example.com/a')
    expect(normalizeWebAddress('/services')).toBe('/services')
    expect(normalizeWebAddress('example.com')).toBe('https://example.com')
    expect(normalizeWebAddress('javascript:alert(1)')).toBeNull()
    expect(normalizeWebAddress('not a link')).toBeNull()
  })
})

describe('undo history', () => {
  const state = (html: string) => ({ html, selection: null, image: -1 })

  it('walks back and forward, and a new edit clears the forward path', () => {
    const history = new EditorHistory()
    history.reset(state('a'))
    history.commit(state('b'))
    history.commit(state('c'))
    expect(history.undo()?.html).toBe('b')
    expect(history.undo()?.html).toBe('a')
    expect(history.undo()).toBeNull()
    expect(history.redo()?.html).toBe('b')
    history.commit(state('d'))
    expect(history.redo()).toBeNull()
    expect(history.undo()?.html).toBe('b')
  })

  it('does not add a step for identical content, or for an upload finishing', () => {
    const history = new EditorHistory()
    history.reset(state('a'))
    history.commit(state('a'))
    expect(history.hasEdits).toBe(false)
    history.commit(state('placeholder'))
    history.replaceCurrent(state('finished'))
    expect(history.undo()?.html).toBe('a')
    expect(history.redo()?.html).toBe('finished')
  })
})
