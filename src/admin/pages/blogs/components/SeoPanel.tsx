import { useState } from 'react'
import { Globe, Share2, SlidersHorizontal, Tags as TagsIcon } from 'lucide-react'
import CollapsibleSection from './CollapsibleSection'
import CustomMetaTagsEditor from './CustomMetaTagsEditor'
import TagInput from './TagInput'
import { AnalysisDetails, MetricsList, ScoreRings } from './AnalysisPanel'
import { SelectField, TextAreaField, TextField, ToggleRow } from './fields'
import {
  FOCUS_KEYWORD_MAX,
  OG_DESCRIPTION_MAX,
  OG_TITLE_MAX,
  SECONDARY_KEYWORDS_MAX_ITEMS,
  SECONDARY_KEYWORD_MAX,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  TWITTER_CARD_OPTIONS,
  isLikelyUrl,
} from '../lib/editorForm'
import type { FormState } from '../lib/editorForm'
import type { AnalysisResult } from '../lib/blogAnalyzer'

type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void

interface SeoPanelProps {
  form: FormState
  update: Update
  analysis: AnalysisResult
}

function hostLabel() {
  if (typeof window === 'undefined') return 'brandworks.me'
  return window.location.host || 'brandworks.me'
}

/** How the article might appear in a search result. Illustrative, not a ranking prediction. */
function SearchPreview({ title, slug, description }: { title: string; slug: string; description: string }) {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const host = hostLabel()
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold">Search preview</span>
        <div className="admin-segmented-control" role="group" aria-label="Preview device">
          <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}>Desktop</button>
          <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}>Mobile</button>
        </div>
      </div>
      <div className={`rounded-a-lg bg-a-surface-2 p-3.5 ring-1 ring-a-line ${device === 'mobile' ? 'max-w-[300px]' : ''}`}>
        <div className="flex items-center gap-2 text-xs">
          <span className="grid size-6 flex-none place-items-center rounded-full bg-a-fill-2 text-[10px] font-bold text-a-ink-2">B</span>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-medium">BRANDWORKS</p>
            <p className="truncate text-a-ink-2">{host} › blog › {slug || 'your-slug'}</p>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-[17px] leading-snug text-a-accent">{title || 'Untitled article'}</p>
        <p className="mt-1 line-clamp-3 text-[13px] leading-snug text-a-ink-2">{description || 'A meta description will appear here.'}</p>
      </div>
    </div>
  )
}

function SocialPreview({ title, description, image }: { title: string; description: string; image: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="overflow-hidden rounded-a-lg bg-a-surface-2 ring-1 ring-a-line">
      <div className="grid aspect-[1200/630] place-items-center bg-a-fill text-xs text-a-ink-3">
        {isLikelyUrl(image) && !failed
          ? <img src={image} alt="" className="size-full object-cover" onError={() => setFailed(true)} />
          : 'No image'}
      </div>
      <div className="p-3">
        <p className="text-[11px] tracking-wide text-a-ink-2 uppercase">{hostLabel()}</p>
        <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug font-semibold">{title || 'Untitled article'}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-a-ink-2">{description}</p>
      </div>
    </div>
  )
}

function SeoPanel({ form, update, analysis }: SeoPanelProps) {
  return (
    <div>
      <section className="admin-panel-section">
        <ScoreRings analysis={analysis} />
      </section>

      <section className="admin-panel-section flex flex-col gap-3.5">
        <TextField
          id="seoTitle"
          label="SEO title"
          value={form.seoTitle}
          onChange={(next) => update('seoTitle', next)}
          max={SEO_TITLE_MAX}
          soft={60}
          placeholder={form.title || 'Falls back to the title'}
          hint="Around 50–60 characters reads best in search."
        />
        <TextAreaField
          id="seoDescription"
          label="Meta description"
          value={form.seoDescription}
          onChange={(next) => update('seoDescription', next)}
          max={SEO_DESCRIPTION_MAX}
          soft={160}
          rows={3}
          placeholder={form.excerpt || 'Falls back to the excerpt'}
          hint="Around 120–160 characters."
        />
        <SearchPreview title={form.seoTitle || form.title} slug={form.slug} description={form.seoDescription || form.excerpt} />
        <TextField id="focusKeyword" label="Focus keyword" value={form.focusKeyword} onChange={(next) => update('focusKeyword', next)} max={FOCUS_KEYWORD_MAX} hint="The phrase you most want this article to be found for." />
        <TagInput
          label="Secondary keywords"
          values={form.secondaryKeywords}
          onChange={(next) => update('secondaryKeywords', next)}
          placeholder="Add a keyword"
          maxItems={SECONDARY_KEYWORDS_MAX_ITEMS}
          maxItemLength={SECONDARY_KEYWORD_MAX}
        />
      </section>

      <CollapsibleSection title="Social sharing" icon={Share2}>
        <SocialPreview
          title={form.ogTitle || form.seoTitle || form.title}
          description={form.ogDescription || form.seoDescription || form.excerpt}
          image={form.ogImage || form.coverImage}
        />
        <TextField id="ogTitle" label="Share title" value={form.ogTitle} onChange={(next) => update('ogTitle', next)} max={OG_TITLE_MAX} placeholder={form.seoTitle || form.title || 'Falls back to the title'} />
        <TextAreaField id="ogDescription" label="Share description" value={form.ogDescription} onChange={(next) => update('ogDescription', next)} max={OG_DESCRIPTION_MAX} rows={2} placeholder={form.seoDescription || form.excerpt || 'Falls back to the description'} />
        <TextField id="ogImage" label="Share image address" value={form.ogImage} onChange={(next) => update('ogImage', next)} placeholder={form.coverImage || 'https://…'} hint="Leave empty to use the cover image." />
        <SelectField id="twitterCard" label="Card style" value={form.twitterCard} onChange={(next) => update('twitterCard', next)} options={TWITTER_CARD_OPTIONS} />
      </CollapsibleSection>

      <CollapsibleSection title="Indexing" icon={Globe}>
        <ToggleRow id="robotsIndex" label="Show in search results" description="Let search engines index this article." checked={form.robotsIndex} onChange={(next) => update('robotsIndex', next)} />
        <ToggleRow id="breadcrumbEnabled" label="Breadcrumb trail" description="Show navigation breadcrumbs on the page." checked={form.breadcrumbEnabled} onChange={(next) => update('breadcrumbEnabled', next)} />
        <TextField id="canonicalUrl" label="Canonical address" value={form.canonicalUrl} onChange={(next) => update('canonicalUrl', next)} placeholder="https://…" hint="Only set this if the article first appeared elsewhere." />
      </CollapsibleSection>

      <CollapsibleSection title="Custom meta tags" icon={SlidersHorizontal} meta="Advanced">
        <CustomMetaTagsEditor items={form.customMetaTags} onChange={(next) => update('customMetaTags', next)} />
      </CollapsibleSection>

      <CollapsibleSection title="Content stats" icon={TagsIcon} defaultOpen>
        <MetricsList analysis={analysis} />
      </CollapsibleSection>

      <AnalysisDetails analysis={analysis} />
    </div>
  )
}

export default SeoPanel
