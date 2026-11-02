import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import type { PluggableList } from 'unified'
import { IMAGE_ALIGNS, IMAGE_DIMENSION_PATTERN, IMAGE_RATIO_PATTERN, IMAGE_WIDTH_PATTERN, IMAGE_WRAPS } from './articleImage'

// Attribute names here are hast property names: `dataAlign`, not `data-align`.
// The sanitizer silently drops anything else, so these must stay camelCase.
const ALIGN = ['dataAlign', 'left', 'center', 'right', 'justify']

const markdownSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark', 'u', 'span', 'sub', 'sup', 'figure', 'figcaption'],
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ['dataColor', 'red', 'orange', 'green', 'blue', 'purple', 'accent'],
      ['dataFontSize', '12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '40px', '48px'],
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      ['dataLayout', 'media-text'],
    ],
    figure: [
      ['dataWidth', IMAGE_WIDTH_PATTERN],
      ['dataRatio', IMAGE_RATIO_PATTERN],
      ['dataAlign', ...IMAGE_ALIGNS],
      ['dataWrap', ...IMAGE_WRAPS],
    ],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      ['width', IMAGE_DIMENSION_PATTERN],
      ['height', IMAGE_DIMENSION_PATTERN],
      'dataVector',
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
