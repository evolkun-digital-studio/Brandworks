import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { PluggableList } from 'unified'

const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark', 'u', 'span'],
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
