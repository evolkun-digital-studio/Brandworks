import { Bot, CircleHelp, Quote, Sparkles, Tags } from 'lucide-react'
import CollapsibleSection from './CollapsibleSection'
import FaqEditor from './FaqEditor'
import RepeatingTextField from './RepeatingTextField'
import TagInput from './TagInput'
import { SelectField, TextAreaField, TextField } from './fields'
import {
  ABOUT_MAX_ITEMS,
  AI_CONTEXT_FIELD_MAX,
  AI_SUMMARY_MAX,
  CONTENT_INTENTS,
  CONTENT_TYPES,
  ENTITY_MAX,
  EXPERT_QUOTE_MAX,
  EXPERT_QUOTE_NAME_MAX,
  KEY_TAKEAWAYS_MAX_ITEMS,
  KEY_TAKEAWAY_MAX,
  MAIN_ENTITY_MAX,
  MENTIONED_ENTITIES_MAX_ITEMS,
} from '../lib/editorForm'
import type { FormState } from '../lib/editorForm'

type Update = <K extends keyof FormState>(key: K, value: FormState[K]) => void

/** Optional structured detail that helps search and answer engines understand the article. */
function EnrichPanel({ form, update }: { form: FormState; update: Update }) {
  return (
    <div>
      <p className="admin-panel-section text-[13px] leading-snug text-a-ink-2">
        Everything here is optional. Add the detail that makes this article easier for people, search engines and AI assistants to understand.
      </p>

      <CollapsibleSection title="Summary and takeaways" icon={Sparkles} defaultOpen>
        <TextAreaField id="aiSummary" label="Summary" value={form.aiSummary} onChange={(next) => update('aiSummary', next)} max={AI_SUMMARY_MAX} rows={3} hint="Written by you, in one or two sentences." />
        <RepeatingTextField label="Key takeaways" values={form.keyTakeaways} onChange={(next) => update('keyTakeaways', next)} placeholder="A key takeaway" maxItems={KEY_TAKEAWAYS_MAX_ITEMS} maxItemLength={KEY_TAKEAWAY_MAX} />
      </CollapsibleSection>

      <CollapsibleSection title="Audience and intent" icon={Bot}>
        <TextField id="targetAudience" label="Audience" value={form.targetAudience} onChange={(next) => update('targetAudience', next)} max={AI_CONTEXT_FIELD_MAX} placeholder="e.g. Marketing managers" />
        <div className="grid grid-cols-2 gap-3">
          <TextField id="targetCountry" label="Country" value={form.targetCountry} onChange={(next) => update('targetCountry', next)} max={AI_CONTEXT_FIELD_MAX} placeholder="India" />
          <TextField id="targetLanguage" label="Language" value={form.targetLanguage} onChange={(next) => update('targetLanguage', next)} max={AI_CONTEXT_FIELD_MAX} placeholder="English" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField id="contentType" label="Type" value={form.contentType} onChange={(next) => update('contentType', next)} options={CONTENT_TYPES} />
          <SelectField id="contentIntent" label="Intent" value={form.contentIntent} onChange={(next) => update('contentIntent', next)} options={CONTENT_INTENTS} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Topics and entities" icon={Tags}>
        <TextField id="mainEntity" label="Main topic" value={form.mainEntity} onChange={(next) => update('mainEntity', next)} max={MAIN_ENTITY_MAX} placeholder="e.g. Brand identity" />
        <TagInput label="About" values={form.about} onChange={(next) => update('about', next)} placeholder="e.g. Logo design" maxItems={ABOUT_MAX_ITEMS} maxItemLength={ENTITY_MAX} />
        <TagInput label="Mentioned" values={form.mentionedEntities} onChange={(next) => update('mentionedEntities', next)} placeholder="e.g. Pantone" maxItems={MENTIONED_ENTITIES_MAX_ITEMS} maxItemLength={ENTITY_MAX} />
      </CollapsibleSection>

      <CollapsibleSection title="FAQ" icon={CircleHelp} meta={form.faq.length ? `${form.faq.length}` : undefined}>
        <FaqEditor items={form.faq} onChange={(next) => update('faq', next)} />
      </CollapsibleSection>

      <CollapsibleSection title="Expert quote" icon={Quote}>
        <TextAreaField id="expertQuoteText" label="Quote" value={form.expertQuoteText} onChange={(next) => update('expertQuoteText', next)} max={EXPERT_QUOTE_MAX} rows={3} />
        <TextField id="expertQuotePersonName" label="Person" value={form.expertQuotePersonName} onChange={(next) => update('expertQuotePersonName', next)} max={EXPERT_QUOTE_NAME_MAX} />
        <TextField id="expertQuoteOrganization" label="Organization" value={form.expertQuoteOrganization} onChange={(next) => update('expertQuoteOrganization', next)} max={EXPERT_QUOTE_NAME_MAX} />
        <TextField id="expertQuoteRole" label="Role (optional)" value={form.expertQuoteRole} onChange={(next) => update('expertQuoteRole', next)} max={EXPERT_QUOTE_NAME_MAX} />
      </CollapsibleSection>
    </div>
  )
}

export default EnrichPanel
