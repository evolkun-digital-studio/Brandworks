import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { Element } from 'hast'
import { buildToc, parseMarkdown } from '../../lib/markdownMetrics'

function isExternalHref(href: string | undefined): boolean {
  return /^https?:\/\//i.test(href ?? '')
}

/**
 * react-markdown passes each custom component the underlying hast
 * `node`, whose `position.start.line` is the node's 1-indexed line
 * number in the original Markdown source. Reading that back out is a
 * stateless way to identify which heading is being rendered — no
 * mutable counter needed.
 */
function sourceStartLine(node: Element | undefined): number | undefined {
  return node?.position?.start.line
}

/**
 * Renders blog post content as safe, styled HTML. `rehype-raw` is
 * never enabled, so raw HTML in the Markdown source is never
 * executed — only recognized Markdown nodes are rendered, the same
 * safe-by-default assumption the admin editor's preview already uses
 * (see src/admin/pages/blogs/BlogEditor.tsx). Editorial styling is
 * applied manually via arbitrary-variant Tailwind utilities rather
 * than installing @tailwindcss/typography.
 *
 * H2/H3/H4 headings get an `id` so the Table of Contents (see
 * BlogDetailPage.tsx) can link directly to them. The id for each
 * heading comes from `buildToc()` — the exact same deterministic
 * parser/slugger already built in Phase 7 (src/lib/markdownMetrics.ts)
 * and reused here rather than re-implemented, per the Phase 8 spec.
 * IDs are never written back into the stored Markdown — they're
 * assigned at render time only.
 */
function ArticleMarkdown({ content }: { content: string }) {
  // Precomputed once per content change. `buildToc` keeps only levels
  // 2-4 without reordering, so filtering the same parsed headings down
  // to levels 2-4 reproduces its exact order/length — zipping the two
  // below is therefore a safe, exact pairing (BlogDetailPage computes
  // its own `toc` from the same content for the visible TOC list; this
  // component only needs the id lookup, not the entries themselves).
  const lineToId = useMemo(() => {
    const headings = parseMarkdown(content).headings
    const entries = buildToc(headings)
    const tocable = headings.filter((h) => h.level >= 2 && h.level <= 4)
    const map = new Map<number, string>()
    tocable.forEach((heading, i) => {
      const entry = entries[i]
      if (entry) {
        // Heading.line is 0-indexed; node.position.start.line (below)
        // is 1-indexed — align the two here, once, rather than at
        // every lookup.
        map.set(heading.line + 1, entry.id)
      }
    })
    return map
  }, [content])

  const components: Components = useMemo(() => {
    // Stateless: each heading looks up its own id from the source line
    // react-markdown reports for it, instead of relying on the order
    // components happen to be invoked in during a render pass.
    const idFor = (node: Element | undefined) => {
      const line = sourceStartLine(node)
      return line === undefined ? undefined : lineToId.get(line)
    }

    return {
      // Shifted down one level from the Markdown source's own heading
      // depth (source `#` -> rendered <h2>, etc.) so the article body
      // never produces a second <h1> alongside the page's own title
      // heading — one clean heading hierarchy per page, capped at <h6>.
      // Source H1/H5/H6 are excluded from the TOC (Phase 7 spec) and
      // get no id here either.
      h1: (props) => <h2 {...props} />,
      h2: ({ node, ...props }) => <h3 id={idFor(node)} {...props} />,
      h3: ({ node, ...props }) => <h4 id={idFor(node)} {...props} />,
      h4: ({ node, ...props }) => <h5 id={idFor(node)} {...props} />,
      h5: (props) => <h6 {...props} />,
      h6: (props) => <h6 {...props} />,
      // External links open in a new tab with safe rel attributes;
      // anything else (relative paths, #anchors, mailto:, tel:) stays
      // same-tab. A simple protocol check — not a link-rewriting system.
      a: ({ href, children, ...props }) =>
        isExternalHref(href) ? (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        ) : (
          <a href={href} {...props}>
            {children}
          </a>
        ),
    }
  }, [lineToId])

  return (
    <div
      className="max-w-none text-[16px] leading-[1.75] text-neutral-800
        [&_h2]:scroll-mt-24 [&_h3]:scroll-mt-24 [&_h4]:scroll-mt-24
        [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:text-[26px] [&_h2]:leading-[1.2] [&_h2]:font-bold [&_h2]:text-neutral-900 [&_h2]:first:mt-0
        [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-[20px] [&_h3]:leading-[1.3] [&_h3]:font-semibold [&_h3]:text-neutral-900
        [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-[17px] [&_h4]:font-semibold [&_h4]:text-neutral-900
        [&_p]:my-5 [&_strong]:font-semibold [&_strong]:text-neutral-900
        [&_ul]:my-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5
        [&_a]:text-neutral-900 [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-neutral-400 [&_a:hover]:decoration-neutral-900
        [&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-300 [&_blockquote]:pl-5 [&_blockquote]:text-neutral-600
        [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-[8px] [&_pre]:bg-neutral-900 [&_pre]:p-4 [&_pre]:text-[14px] [&_pre]:leading-[1.6] [&_pre]:text-neutral-100
        [&_code]:rounded-[4px] [&_code]:bg-neutral-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[14px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-inherit
        [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_table]:text-[14px]
        [&_th]:border-b [&_th]:border-neutral-300 [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:font-semibold [&_th]:text-neutral-900
        [&_td]:border-b [&_td]:border-neutral-100 [&_td]:py-2 [&_td]:pr-4
        [&_hr]:my-8 [&_hr]:border-neutral-200
        [&_img]:my-6 [&_img]:w-full [&_img]:rounded-[8px]"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default ArticleMarkdown
