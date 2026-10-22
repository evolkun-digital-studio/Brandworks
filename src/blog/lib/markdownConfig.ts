import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { PluggableList } from 'unified'

const ALIGN = ['data-align', 'left', 'center', 'right', 'justify']

const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark', 'u', 'span', 'sub', 'sup'],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ['data-color', 'red', 'orange', 'green', 'blue', 'purple', 'accent'],
      ['data-font-size', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['data-layout', 'media-text'],
    ],
    // Text alignment set in the editor: a constrained data attribute, never inline style.
    p: [...(defaultSchema.attributes?.p ?? []), ALIGN],
    h1: [...(defaultSchema.attributes?.h1 ?? []), ALIGN],
    h2: [...(defaultSchema.attributes?.h2 ?? []), ALIGN],
    h3: [...(defaultSchema.attributes?.h3 ?? []), ALIGN],
    h4: [...(defaultSchema.attributes?.h4 ?? []), ALIGN],
    blockquote: [...(defaultSchema.attributes?.blockquote ?? []), ALIGN],
    li: [...(defaultSchema.attributes?.li ?? []), ALIGN],
  },
}

/**
 * Markdown remains the stored format. Raw HTML is parsed only so the editor
 * can offer a few useful inline marks, then sanitized to a small allow-list.
 * No style attributes, scripts, embeds, or arbitrary tags are accepted.
 */
export const markdownRehypePlugins: PluggableList = [
  rehypeRaw,
  [rehypeSanitize, markdownSchema],
]
