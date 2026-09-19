import { describe, expect, it } from 'vitest'
import {
  buildToc,
  classifyLink,
  computeReadingTimeMinutes,
  computeWordCount,
  detectHeadingJumps,
  isQuestionHeading,
  parseMarkdown,
} from './markdownMetrics'

describe('parseMarkdown — headings', () => {
  it('detects heading levels and strips inline formatting from the text', () => {
    const content = '# Title\n\n## **Bold** Section\n\n### _Italic_ sub-section'
    const { headings } = parseMarkdown(content)
    expect(headings).toEqual([
      { level: 1, text: 'Title', line: 0 },
      { level: 2, text: 'Bold Section', line: 2 },
      { level: 3, text: 'Italic sub-section', line: 4 },
    ])
  })

  it('does not treat a heading-like line inside a fenced code block as a real heading', () => {
    const content = '# Real Heading\n\n```\n# not a heading\n```\n'
    const { headings, codeBlockCount } = parseMarkdown(content)
    expect(headings).toHaveLength(1)
    expect(headings[0].text).toBe('Real Heading')
    expect(codeBlockCount).toBe(1)
  })
})

describe('heading hierarchy', () => {
  it('H2 -> H3 -> H4 produces no warnings', () => {
    const { headings } = parseMarkdown('## A\n### B\n#### C')
    expect(detectHeadingJumps(headings)).toEqual([])
  })

  it('H2 -> H4 (skipping H3) produces a warning', () => {
    const { headings } = parseMarkdown('## A\n#### B')
    const warnings = detectHeadingJumps(headings)
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/H2 to H4/)
  })
})

describe('buildToc', () => {
  it('includes H2-H4 and excludes H1', () => {
    const { headings } = parseMarkdown('# Title\n## Section One\n### Sub\n#### Detail')
    const toc = buildToc(headings)
    expect(toc.map((t) => t.level)).toEqual([2, 3, 4])
    expect(toc.some((t) => t.text === 'Title')).toBe(false)
  })

  it('gives duplicate headings unique ids', () => {
    const { headings } = parseMarkdown('## Overview\n## Overview\n## Overview')
    const toc = buildToc(headings)
    const ids = toc.map((t) => t.id)
    expect(ids).toEqual(['overview', 'overview-2', 'overview-3'])
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('links and images', () => {
  it('extracts links and images separately, without double-counting images as links', () => {
    const content = '![alt text](https://example.com/img.jpg)\n\n[a link](https://brandworks.com/blog/x)'
    const { links, images } = parseMarkdown(content)
    expect(images).toEqual([{ alt: 'alt text', url: 'https://example.com/img.jpg' }])
    expect(links).toEqual([{ text: 'a link', url: 'https://brandworks.com/blog/x' }])
  })

  it('flags a link with an empty URL as malformed', () => {
    const { malformedLinkCount, links } = parseMarkdown('[broken]()')
    expect(malformedLinkCount).toBe(1)
    expect(links).toEqual([])
  })
})

describe('classifyLink', () => {
  it('treats relative paths, hashes, mailto, and tel as internal', () => {
    expect(classifyLink('/blog/other-post')).toBe('internal')
    expect(classifyLink('#section')).toBe('internal')
    expect(classifyLink('mailto:hello@brandworks.com')).toBe('internal')
    expect(classifyLink('tel:+1234567890')).toBe('internal')
  })

  it('treats a brandworks.com absolute URL as internal', () => {
    expect(classifyLink('https://brandworks.com/blog/post')).toBe('internal')
  })

  it('treats an unrelated absolute URL as external', () => {
    expect(classifyLink('https://example.com/article')).toBe('external')
  })

  it('falls back to internal for an unparsable value (conservative heuristic)', () => {
    expect(classifyLink('not a url at all')).toBe('internal')
  })
})

describe('word count', () => {
  it('does not count markdown syntax, URLs, or code as words', () => {
    const content =
      '# Heading\n\nSome **bold** and _italic_ text with a [link](https://example.com/some/long/path) and `inline code`.'
    const { plainText } = parseMarkdown(content)
    const words = computeWordCount(plainText)
    // Heading, Some, bold, and, italic, text, with, a, link, and = 10.
    // Inline code content is deliberately excluded (code isn't prose),
    // and the stray "." left behind isn't counted as a word either.
    expect(words).toBe(10)
  })

  it('returns 0 for empty content', () => {
    expect(computeWordCount(parseMarkdown('').plainText)).toBe(0)
  })
})

describe('reading time', () => {
  it('is 0 for empty content', () => {
    expect(computeReadingTimeMinutes(0)).toBe(0)
  })

  it('never rounds down to 0 for non-empty content', () => {
    expect(computeReadingTimeMinutes(1)).toBe(1)
    expect(computeReadingTimeMinutes(50)).toBe(1)
  })

  it('rounds sensibly at higher word counts', () => {
    expect(computeReadingTimeMinutes(450)).toBe(2) // 450/225 = 2.0
    expect(computeReadingTimeMinutes(2025)).toBe(9) // 2025/225 = 9.0
  })
})

describe('isQuestionHeading', () => {
  it('recognizes a heading ending in a question mark', () => {
    expect(isQuestionHeading('What is technical SEO?')).toBe(true)
  })

  it('recognizes a heading starting with a question word', () => {
    expect(isQuestionHeading('How does schema markup work')).toBe(true)
    expect(isQuestionHeading('Why Core Web Vitals matter')).toBe(true)
  })

  it('does not treat an ordinary statement heading as a question', () => {
    expect(isQuestionHeading('Technical SEO Basics')).toBe(false)
  })
})

describe('paragraphs, blockquotes', () => {
  it('counts contiguous prose lines as one paragraph, excluding headings/quotes/lists', () => {
    const content = '# Title\n\nFirst paragraph line one.\nFirst paragraph line two.\n\n> A quote\n> continues\n\nSecond paragraph.'
    const { paragraphCount, blockquoteCount } = parseMarkdown(content)
    expect(paragraphCount).toBe(2)
    expect(blockquoteCount).toBe(1)
  })
})
