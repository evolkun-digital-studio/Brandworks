import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Download,
  Eye,
  Keyboard,
  Link2,
  LoaderCircle,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  PanelRight,
  Pencil,
  ExternalLink,
  ImageOff,
  ImagePlus,
  RefreshCw,
  Redo2,
  Replace,
  Rocket,
  SearchCheck,
  Sparkles,
  Trash2,
  Undo2,
  X,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { useNavigate, useParams } from '../../../routing'
import * as blogApi from '../../api/blogAdminApi'
import { ApiError } from '../../api/client'
import AdminButton from '../../components/AdminButton'
import AdminIconButton from '../../components/AdminIconButton'
import AdminStatusBadge from '../../components/AdminStatusBadge'
import FormMessage from '../../components/FormMessage'
import { useConfirm } from '../../components/ConfirmDialog'
import { useAdminAuth } from '../../context/useAdminAuth'
import DocumentPanel from './components/DocumentPanel'
import EnrichPanel from './components/EnrichPanel'
import ImageDetailsDialog from './components/ImageDetailsDialog'
import { isOptimizedPreview, previewUrl } from '../../lib/imageUrl'
import MediaPicker from './components/MediaPicker'
import RichContentEditor from './components/RichContentEditor'
import SeoPanel from './components/SeoPanel'
import { PreviewDialog, PublishSheet, ShortcutsSheet } from './components/EditorDialogs'
import type { ImageDetails } from './components/ImageDetailsDialog'
import type { RichEditorHandle } from './components/RichContentEditor'
import { analyzeBlog } from './lib/blogAnalyzer'
import type { AnalyzerInput } from './lib/blogAnalyzer'
import {
  EMPTY_FORM,
  EXCERPT_MAX,
  TITLE_MAX,
  SLUG_MAX,
  buildAiContext,
  buildEntitySeo,
  buildExpertQuote,
  fieldError,
  formFromPost,
  isLikelyUrl,
  suggestSlug,
  toDatetimeLocalValue,
  validateForm,
} from './lib/editorForm'
import type { FormState, InlineField } from './lib/editorForm'
import type { AdminBlogPost, BlogStatus, ReviewStatus, TwitterCardType } from '../../api/blogTypes'
import type { AdminBlogRevision } from '../../api/blogAdminApi'

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

type PanelTab = 'document' | 'seo' | 'enrich'

const PANEL_TABS: Array<{ id: PanelTab; label: string; icon: typeof FileText }> = [
  { id: 'document', label: 'Document', icon: FileText },
  { id: 'seo', label: 'SEO', icon: SearchCheck },
  { id: 'enrich', label: 'Enrich', icon: Sparkles },
]

/** First sentences of the article as plain text, cut at a word boundary. */
function excerptFromContent(html: string): string {
  const text = (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim()
  if (text.length <= 170) return text
  const cut = text.slice(0, 170)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 100))}…`
}

function timeLabel(date: Date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

/** A borderless textarea that grows with its content. */
function GrowingTextarea({ value, onChange, className, onEnter, innerRef, ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & { onChange: (next: string) => void; onEnter?: () => void; innerRef?: React.RefObject<HTMLTextAreaElement | null> }) {
  const ref = useRef<HTMLTextAreaElement | null>(null)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    element.style.height = '0px'
    element.style.height = `${element.scrollHeight}px`
  }, [value])
  return (
    <textarea
      {...rest}
      ref={(node) => {
        ref.current = node
        if (innerRef) innerRef.current = node
      }}
      rows={1}
      value={value}
      className={className}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          onEnter?.()
        }
        rest.onKeyDown?.(event)
      }}
    />
  )
}

function CoverImage({
  form,
  update,
  touched,
  onTouch,
}: {
  form: FormState
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void
  touched: Partial<Record<InlineField, boolean>>
  onTouch: (field: InlineField) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [useOriginal, setUseOriginal] = useState(false)
  const [dialog, setDialog] = useState<{ src: string; initial: Partial<ImageDetails> } | null>(null)
  const hasImage = isLikelyUrl(form.coverImage)
  const altError = touched.coverImageAlt ? fieldError(form, 'coverImageAlt') : null
  const fromLibrary = form.coverImage.includes('/api/media/')

  useEffect(() => {
    setFailed(false)
    setUseOriginal(false)
  }, [form.coverImage])

  function applyLink() {
    const value = linkDraft.trim()
    if (!isLikelyUrl(value)) {
      toast.error('Enter an image address that starts with https://')
      return
    }
    setLinkOpen(false)
    setLinkDraft('')
    setDialog({ src: value, initial: { alt: form.coverImageAlt, title: form.coverImageTitle, caption: form.coverImageCaption } })
  }

  function saveDetails(result: ImageDetails) {
    if (!dialog) return
    update('coverImage', dialog.src)
    update('coverImageAlt', result.alt)
    update('coverImageTitle', result.title)
    update('coverImageCaption', result.caption)
    setDialog(null)
  }

  return (
    <div className="admin-ed-cover">
      {hasImage ? (
        <div className="group relative overflow-hidden rounded-a-xl bg-a-fill">
          {failed ? (
            <div className="flex aspect-[16/7] flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="grid size-11 place-items-center rounded-[13px] bg-a-surface text-a-ink-2"><ImageOff size={20} strokeWidth={1.6} aria-hidden="true" /></span>
              <p className="text-[15px] font-semibold tracking-[-0.012em]">This image can’t be loaded</p>
              <p className="max-w-[46ch] text-[13px] leading-snug text-a-ink-2">
                {fromLibrary ? 'It may have been removed from the media library, or it belongs to a different site. ' : 'The address may be wrong, or the image may have been taken down. '}
                Choose another image, or try again.
              </p>
              <p className="max-w-full truncate text-xs text-a-ink-3" title={form.coverImage}>{form.coverImage}</p>
              <div className="mt-1 flex flex-wrap justify-center gap-2">
                <AdminButton variant="primary" onClick={() => setPickerOpen(true)} icon={<Replace size={14} aria-hidden="true" />}>Replace image</AdminButton>
                <AdminButton onClick={() => { setFailed(false); setAttempt((count) => count + 1) }} icon={<RefreshCw size={14} aria-hidden="true" />}>Try again</AdminButton>
                <AdminButton variant="quiet" onClick={() => { update('coverImage', ''); update('coverImageAlt', '') }}>Remove</AdminButton>
              </div>
            </div>
          ) : (
            <>
              <img
                key={attempt}
                src={useOriginal ? form.coverImage : previewUrl(form.coverImage, 1200)}
                alt={form.coverImageAlt || 'Cover image'}
                title={form.coverImageTitle || undefined}
                className="aspect-[16/7] w-full object-cover"
                onError={(event) => {
                  if (!useOriginal && isOptimizedPreview(event.currentTarget.getAttribute('src') ?? '')) setUseOriginal(true)
                  else setFailed(true)
                }}
              />
              <div className="absolute top-3 right-3 flex gap-2 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100 max-md:opacity-100">
                <button type="button" className="admin-chip-button" onClick={() => setDialog({ src: form.coverImage, initial: { alt: form.coverImageAlt, title: form.coverImageTitle, caption: form.coverImageCaption } })}><Pencil size={14} aria-hidden="true" /> Details</button>
                <button type="button" className="admin-chip-button" onClick={() => setPickerOpen(true)}><Replace size={14} aria-hidden="true" /> Replace</button>
                <button type="button" className="admin-chip-button" onClick={() => { update('coverImage', ''); update('coverImageAlt', '') }}><X size={14} aria-hidden="true" /> Remove</button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="admin-ed-cover__empty">
          <span className="grid size-11 place-items-center rounded-[13px] bg-a-fill text-a-ink-2"><ImagePlus size={20} strokeWidth={1.6} aria-hidden="true" /></span>
          <p className="text-[15px] font-semibold tracking-[-0.012em]">Add a cover image</p>
          <p className="max-w-[40ch] text-[13px] text-a-ink-2">It appears at the top of the article and when it’s shared.</p>
          <div className="mt-1 flex flex-wrap justify-center gap-2">
            <AdminButton variant="primary" onClick={() => setPickerOpen(true)} icon={<ImagePlus size={14} aria-hidden="true" />}>Choose image</AdminButton>
            <AdminButton onClick={() => setLinkOpen((open) => !open)} icon={<Link2 size={14} aria-hidden="true" />}>Use a link</AdminButton>
          </div>
          {linkOpen && (
            <div className="mt-2 flex w-full max-w-md gap-2" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyLink() } }}>
              <label htmlFor="cover-link" className="sr-only">Image address</label>
              <input id="cover-link" className="admin-input" autoFocus placeholder="https://…" value={linkDraft} onChange={(event) => setLinkDraft(event.target.value)} />
              <AdminButton variant="primary" onClick={applyLink}>Continue</AdminButton>
            </div>
          )}
          {touched.coverImage && fieldError(form, 'coverImage') && <p className="admin-field-error" role="alert">{fieldError(form, 'coverImage')}</p>}
        </div>
      )}

      {hasImage && (
        <div className="mt-3">
          <label htmlFor="coverImageAlt" className="sr-only">Cover image description</label>
          <input
            id="coverImageAlt"
            className={`admin-input ${altError ? 'admin-input--error' : ''}`}
            placeholder="Describe the image for people who can’t see it (required)"
            value={form.coverImageAlt}
            maxLength={300}
            aria-invalid={altError ? true : undefined}
            onChange={(event) => update('coverImageAlt', event.target.value)}
            onBlur={() => onTouch('coverImageAlt')}
          />
          {altError && <p className="admin-field-error" role="alert">{altError}</p>}
          {(form.coverImageTitle || form.coverImageCaption) && (
            <p className="mt-1.5 truncate text-xs text-a-ink-2">
              {form.coverImageTitle && <>Title: <span className="text-a-ink">{form.coverImageTitle}</span></>}
              {form.coverImageTitle && form.coverImageCaption && ' · '}
              {form.coverImageCaption && <>Caption: <span className="text-a-ink">{form.coverImageCaption}</span></>}
            </p>
          )}
        </div>
      )}

      {pickerOpen && (
        <MediaPicker
          title={hasImage ? 'Replace the cover image' : 'Choose a cover image'}
          onClose={() => setPickerOpen(false)}
          onPick={({ asset, url }) => {
            setPickerOpen(false)
            setDialog({
              src: url,
              initial: {
                alt: asset.altText || form.coverImageAlt,
                title: form.coverImageTitle,
                caption: asset.caption || form.coverImageCaption,
              },
            })
          }}
        />
      )}

      {dialog && (
        <ImageDetailsDialog
          src={dialog.src}
          mode="cover"
          initial={dialog.initial}
          onCancel={() => setDialog(null)}
          onSubmit={saveDetails}
          onReplace={() => { setDialog(null); setPickerOpen(true) }}
        />
      )}
    </div>
  )
}

function BlogEditor() {
  const { id } = useParams<{ id: string }>()
  const isEditing = Boolean(id)
  const navigate = useNavigate()
  const { admin } = useAdminAuth()
  const isAdmin = admin?.role === 'admin'
  const { confirm, dialog } = useConfirm()

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [status, setStatus] = useState<BlogStatus | null>(null)
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('draft')
  const [reviewNote, setReviewNote] = useState<string | null>(null)
  const [publishedAtDisplay, setPublishedAtDisplay] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)
  const [scheduleInput, setScheduleInput] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [slugEditing, setSlugEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [panelTab, setPanelTab] = useState<PanelTab>('document')
  const [isAppleDevice, setIsAppleDevice] = useState(false)
  const [recoverySnapshot, setRecoverySnapshot] = useState<{ form: FormState; savedAt: string } | null>(null)
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<string | null>(null)
  const [touched, setTouched] = useState<Partial<Record<InlineField, boolean>>>({})
  const [loading, setLoading] = useState(isEditing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<'save' | 'publish' | 'unpublish' | 'schedule' | 'unschedule' | 'review' | null>(null)
  const recoveryKey = `brandworks.editor.recovery.${id ?? 'new'}`
  const editorRef = useRef<RichEditorHandle>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  const excerptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    setIsAppleDevice(/Mac|iPhone|iPad|iPod/.test(window.navigator.platform))
    // Phones start with the side panel closed so the page itself is what you see.
    if (window.matchMedia('(max-width: 1000px)').matches) setPanelOpen(false)
  }, [])

  useEffect(() => {
    if (isEditing || !admin?.username) return
    setForm((current) => (current.authorName ? current : { ...current, authorName: admin.username }))
  }, [admin?.username, isEditing])

  useEffect(() => {
    setScheduleInput(scheduledAt ? toDatetimeLocalValue(scheduledAt) : '')
  }, [scheduledAt])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    blogApi
      .fetchBlogPost(id)
      .then(({ blog }) => {
        if (cancelled) return
        setForm(formFromPost(blog))
        setStatus(blog.status)
        setReviewStatus(blog.reviewStatus ?? 'draft')
        setReviewNote(blog.reviewNote ?? null)
        setPublishedAtDisplay(blog.publishedAt)
        setScheduledAt(blog.scheduledAt)
        setSlugTouched(true)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // A local backup is offered if the tab was closed with unsaved work.
  useEffect(() => {
    if (loading) return
    try {
      const raw = window.localStorage.getItem(recoveryKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as { form?: Partial<FormState>; savedAt?: string }
      if (parsed.form && parsed.savedAt) {
        setRecoverySnapshot({
          form: { ...EMPTY_FORM, ...parsed.form, authorName: parsed.form.authorName || admin?.username || '' },
          savedAt: parsed.savedAt,
        })
      }
    } catch {
      // Local recovery is best-effort and must never block the editor.
    }
  }, [admin?.username, loading, recoveryKey])

  useEffect(() => {
    if (!dirty || loading || recoverySnapshot) return
    const timer = window.setTimeout(() => {
      try {
        const stamp = new Date().toISOString()
        window.localStorage.setItem(recoveryKey, JSON.stringify({ version: 1, savedAt: stamp, form }))
        setLocalDraftSavedAt(stamp)
      } catch {
        // Storage can be disabled or full; explicit saving remains available.
      }
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [dirty, form, loading, recoveryKey, recoverySnapshot])

  useEffect(() => {
    function handler(event: BeforeUnloadEvent) {
      if (!dirty) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  // The analyzer scans the whole body, so it waits for a pause in typing.
  const [debouncedForm, setDebouncedForm] = useState(form)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedForm(form), 400)
    return () => clearTimeout(timer)
  }, [form])

  const analyzerInput = useMemo<AnalyzerInput>(() => ({
    title: debouncedForm.title,
    slug: debouncedForm.slug,
    excerpt: debouncedForm.excerpt,
    content: debouncedForm.content,
    coverImage: debouncedForm.coverImage,
    coverImageAlt: debouncedForm.coverImageAlt,
    category: debouncedForm.category,
    tags: debouncedForm.tags,
    aiSummary: debouncedForm.aiSummary,
    keyTakeaways: debouncedForm.keyTakeaways,
    aiContext: buildAiContext(debouncedForm),
    entitySeo: buildEntitySeo(debouncedForm),
    faq: debouncedForm.faq,
    expertQuote: buildExpertQuote(debouncedForm),
    seoTitle: debouncedForm.seoTitle,
    seoDescription: debouncedForm.seoDescription,
    focusKeyword: debouncedForm.focusKeyword,
    secondaryKeywords: debouncedForm.secondaryKeywords,
    canonicalUrl: debouncedForm.canonicalUrl,
    robotsIndex: debouncedForm.robotsIndex,
    ogTitle: debouncedForm.ogTitle,
    ogDescription: debouncedForm.ogDescription,
    ogImage: debouncedForm.ogImage,
    twitterCard: debouncedForm.twitterCard,
    breadcrumbEnabled: debouncedForm.breadcrumbEnabled,
    customMetaTags: debouncedForm.customMetaTags,
    authorName: debouncedForm.authorName,
  }), [debouncedForm])

  const analysis = useMemo(() => analyzeBlog(analyzerInput), [analyzerInput])

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }))
    setDirty(true)
  }, [])

  function markTouched(field: InlineField) {
    setTouched((current) => (current[field] ? current : { ...current, [field]: true }))
  }

  function clearLocalRecovery() {
    try {
      window.localStorage.removeItem(recoveryKey)
    } catch {
      // Ignore storage restrictions.
    }
    setRecoverySnapshot(null)
    setLocalDraftSavedAt(null)
  }

  function restoreLocalRecovery() {
    if (!recoverySnapshot) return
    setForm(recoverySnapshot.form)
    setDirty(true)
    setRecoverySnapshot(null)
    toast.success('Backup restored. Save to keep these changes.')
  }

  function handleTitleChange(value: string) {
    setForm((previous) => ({
      ...previous,
      title: value,
      // Only derives the slug while creating, before it has been touched.
      slug: !isEditing && !slugTouched ? suggestSlug(value) : previous.slug,
    }))
    setDirty(true)
  }

  function handleSlugChange(value: string) {
    setSlugTouched(true)
    update('slug', value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))
  }

  async function handleBack() {
    if (dirty) {
      const leave = await confirm({
        title: 'Leave without saving?',
        message: 'You have changes that haven’t been saved. A local backup is kept on this device.',
        confirmLabel: 'Leave',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      })
      if (!leave) return
    }
    navigate('/admin/blogs')
  }

  async function persist(): Promise<AdminBlogPost | null> {
    const validationError = validateForm(form)
    if (validationError) {
      toast.error(validationError)
      setTouched({ title: true, slug: true, excerpt: true, content: true, coverImage: true, coverImageAlt: true })
      return null
    }

    const seoTitle = form.seoTitle.trim() || null
    const seoDescription = form.seoDescription.trim() || null

    const structuredFields = {
      authorName: form.authorName.trim(),
      coverImageTitle: form.coverImageTitle.trim() || null,
      coverImageCaption: form.coverImageCaption.trim() || null,
      coverImageDescription: form.coverImageDescription.trim() || null,
      category: form.category.trim() || null,
      tags: form.tags,
      aiSummary: form.aiSummary.trim() || null,
      keyTakeaways: form.keyTakeaways.filter((item) => item.trim().length > 0),
      aiContext: buildAiContext(form),
      entitySeo: buildEntitySeo(form),
      faq: form.faq.filter((item) => item.question.trim() && item.answer.trim()),
      expertQuote: buildExpertQuote(form),
      focusKeyword: form.focusKeyword.trim() || null,
      secondaryKeywords: form.secondaryKeywords,
      canonicalUrl: form.canonicalUrl.trim() || null,
      robotsIndex: form.robotsIndex,
      ogTitle: form.ogTitle.trim() || null,
      ogDescription: form.ogDescription.trim() || null,
      ogImage: form.ogImage.trim() || null,
      twitterCard: (form.twitterCard || null) as TwitterCardType | null,
      breadcrumbEnabled: form.breadcrumbEnabled,
      customMetaTags: form.customMetaTags.filter((tag) => tag.name.trim() && tag.content.trim()),
    }

    if (isEditing && id) {
      const { blog } = await blogApi.updateBlogPost(id, {
        title: form.title,
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage,
        coverImageAlt: form.coverImageAlt,
        seoTitle,
        seoDescription,
        ...structuredFields,
      })
      return blog
    }

    const { blog } = await blogApi.createBlogPost({
      title: form.title,
      slug: form.slug.trim() || undefined,
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage,
      coverImageAlt: form.coverImageAlt,
      seoTitle,
      seoDescription,
      publishedAt: form.publishDate ? new Date(form.publishDate).toISOString() : null,
      ...structuredFields,
    })
    return blog
  }

  function applySaved(saved: AdminBlogPost) {
    clearLocalRecovery()
    setDirty(false)
    setSavedAt(new Date())
    setStatus(saved.status)
    setReviewStatus(saved.reviewStatus ?? 'draft')
    setReviewNote(saved.reviewNote ?? null)
    setPublishedAtDisplay(saved.publishedAt)
    setScheduledAt(saved.scheduledAt)
  }

  async function handleSave(event?: { preventDefault: () => void }) {
    event?.preventDefault()
    if (submitting) return
    setTouched({ title: true, slug: true, excerpt: true, content: true, coverImage: true, coverImageAlt: true })
    setSubmitting('save')
    try {
      const saved = await persist()
      if (!saved) return
      applySaved(saved)
      if (!isEditing) {
        toast.success('Draft created.')
        navigate(`/admin/blogs/${saved.id}/edit`, { replace: true })
        return
      }
      setForm(formFromPost(saved))
      toast.success('Saved.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function requestPublish() {
    const validationError = validateForm(form)
    if (validationError) {
      setTouched({ title: true, slug: true, excerpt: true, content: true, coverImage: true, coverImageAlt: true })
      toast.error(validationError)
      return
    }
    setPublishOpen(true)
  }

  async function handlePublishToggle(nextStatus: BlogStatus) {
    setPublishOpen(false)
    setSubmitting(nextStatus === 'published' ? 'publish' : 'unpublish')
    try {
      const saved = await persist()
      if (!saved) return
      const { blog } = await blogApi.setBlogPostStatus(saved.id, nextStatus)
      applySaved(blog)
      setForm(formFromPost(blog))
      toast.success(blog.status === 'published' ? 'Published.' : 'Unpublished.')
      if (!isEditing) navigate(`/admin/blogs/${blog.id}/edit`, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleUnpublish() {
    setMoreOpen(false)
    const ok = await confirm({
      title: 'Unpublish this article?',
      message: 'It disappears from the website straight away. You can publish it again at any time.',
      confirmLabel: 'Unpublish',
      tone: 'danger',
    })
    if (ok) await handlePublishToggle('unpublished')
  }

  async function handleSchedule() {
    if (!scheduleInput) {
      toast.error('Choose a date and time first.')
      return
    }
    const parsed = new Date(scheduleInput)
    if (Number.isNaN(parsed.getTime())) {
      toast.error('That date and time isn’t valid.')
      return
    }
    if (parsed.getTime() <= Date.now()) {
      toast.error('Choose a time in the future.')
      return
    }
    const rescheduled = Boolean(scheduledAt)
    setSubmitting('schedule')
    try {
      const saved = await persist()
      if (!saved) return
      const { blog } = await blogApi.scheduleBlogPost(saved.id, parsed.toISOString())
      applySaved(blog)
      setForm(formFromPost(blog))
      toast.success(`${rescheduled ? 'Rescheduled' : 'Scheduled'} for ${blog.scheduledAt ? new Date(blog.scheduledAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'later'}.`)
      if (!isEditing) navigate(`/admin/blogs/${blog.id}/edit`, { replace: true })
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleUnschedule() {
    if (!id) return
    setSubmitting('unschedule')
    try {
      const { blog } = await blogApi.unscheduleBlogPost(id)
      clearLocalRecovery()
      setStatus(blog.status)
      setScheduledAt(blog.scheduledAt)
      toast.success('Schedule canceled.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleReview(nextStatus: ReviewStatus, note: string | null = null) {
    if (!id) return
    setSubmitting('review')
    try {
      const { updateReview } = await import('../../api/operationsApi')
      const { blog } = await updateReview(id, nextStatus, note)
      setReviewStatus(blog.reviewStatus ?? nextStatus)
      setReviewNote(blog.reviewNote ?? note)
      toast.success(nextStatus === 'in_review' ? 'Sent for review.' : nextStatus === 'approved' ? 'Approved.' : 'Changes requested.')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setSubmitting(null)
    }
  }

  async function handleRestoreRevision(revision: AdminBlogRevision) {
    if (!id) return
    const { blog } = await blogApi.restoreBlogRevision(id, revision.id)
    setForm(formFromPost(blog))
    applySaved(blog)
    toast.success('Version restored. Publishing status is unchanged.')
  }

  async function handleDelete() {
    setMoreOpen(false)
    if (!id) return
    const ok = await confirm({
      title: 'Delete this article?',
      message: 'It moves to Deleted, where an administrator can restore it later.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    try {
      await blogApi.deleteBlogPost(id)
      clearLocalRecovery()
      setDirty(false)
      toast.success('Article moved to Deleted.')
      navigate('/admin/blogs')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  function copyLink() {
    setMoreOpen(false)
    const url = `${window.location.origin}/blog/${form.slug}`
    navigator.clipboard.writeText(url).then(
      () => toast.success('Link copied.'),
      () => toast.error('Could not copy the link.'),
    )
  }

  function downloadHtml() {
    setMoreOpen(false)
    const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${form.title.replace(/</g, '&lt;')}</title></head><body>\n<h1>${form.title.replace(/</g, '&lt;')}</h1>\n${form.content}\n</body></html>`
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${form.slug || 'article'}.html`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const command = event.metaKey || event.ctrlKey
      if (!command) return
      const key = event.key.toLowerCase()
      if (key === 's') {
        event.preventDefault()
        void handleSave()
      } else if (event.shiftKey && key === 'p') {
        event.preventDefault()
        setPreviewOpen(true)
      } else if (event.shiftKey && key === 'f') {
        event.preventDefault()
        setFocusMode((current) => !current)
      } else if (key === '\\') {
        event.preventDefault()
        setPanelOpen((current) => !current)
      } else if (key === '/') {
        event.preventDefault()
        setShortcutsOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (!moreOpen) return
    const onPointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onEscape)
    }
  }, [moreOpen])

  const busy = submitting !== null
  const mod = isAppleDevice ? '⌘' : 'Ctrl'

  if (loading) {
    return (
      <div className="admin-editor" aria-busy="true">
        <header className="admin-ed-bar"><span className="admin-skeleton h-6 w-40" /></header>
        <div className="mx-auto w-full max-w-[720px] px-6 pt-20">
          <span className="admin-skeleton mb-6 block h-12 w-3/4" />
          <span className="admin-skeleton mb-3 block h-5 w-full" />
          <span className="admin-skeleton block h-5 w-2/3" />
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-md px-6 pt-28">
        <FormMessage type="error">{loadError}</FormMessage>
        <AdminButton className="mt-4" onClick={() => navigate('/admin/blogs')} icon={<ArrowLeft size={14} aria-hidden="true" />}>Back to articles</AdminButton>
      </div>
    )
  }

  const saveLabel = submitting === 'save'
    ? 'Saving…'
    : dirty
      ? localDraftSavedAt ? 'Unsaved · backed up on this device' : 'Unsaved changes'
      : savedAt ? `Saved at ${timeLabel(savedAt)}` : isEditing ? 'All changes saved' : 'New article'
  const saveTone = submitting === 'save' ? 'busy' : dirty ? 'dirty' : 'clean'
  const statusTone = status === 'published' ? 'success' : scheduledAt ? 'accent' : status === 'unpublished' ? 'warning' : 'neutral'
  const statusText = status === 'published' ? 'Published' : scheduledAt ? 'Scheduled' : status === 'unpublished' ? 'Unpublished' : 'Draft'
  const slugError = touched.slug ? fieldError(form, 'slug') : null
  const host = typeof window === 'undefined' ? 'brandworks.me' : window.location.host

  const primary = (() => {
    if (status === 'published') {
      return <AdminButton variant="primary" disabled={busy || !dirty} onClick={() => void handleSave()}>{submitting === 'save' ? 'Updating…' : 'Update'}</AdminButton>
    }
    if (isAdmin) {
      return (
        <AdminButton variant="primary" disabled={busy} onClick={() => void requestPublish()} icon={<Rocket size={14} aria-hidden="true" />}>
          {submitting === 'publish' ? 'Publishing…' : 'Publish'}
        </AdminButton>
      )
    }
    if (isEditing && reviewStatus !== 'in_review' && reviewStatus !== 'approved') {
      return <AdminButton variant="primary" disabled={busy || dirty} onClick={() => void handleReview('in_review')} title={dirty ? 'Save your changes first' : undefined}>Request review</AdminButton>
    }
    return null
  })()

  return (
    <div className={`admin-editor ${focusMode ? 'admin-editor--focus' : ''} ${panelOpen && !focusMode ? 'admin-editor--panel' : ''}`}>
      <header className="admin-ed-bar">
        <div className="flex min-w-0 items-center gap-1.5">
          <AdminIconButton label="Back to articles" onClick={() => void handleBack()}><ArrowLeft size={18} strokeWidth={1.8} /></AdminIconButton>
          <div className="flex min-w-0 flex-col leading-tight max-sm:hidden">
            <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">{form.title.trim() || 'Untitled article'}</span>
            <span className={`admin-save-state admin-save-state--${saveTone}`} role="status" aria-live="polite">
              {saveTone === 'busy' ? <LoaderCircle size={11} className="animate-spin" aria-hidden="true" /> : <span className="admin-save-state__dot" aria-hidden="true" />}
              {saveLabel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="max-md:hidden"><AdminStatusBadge tone={statusTone}>{statusText}</AdminStatusBadge></span>
          <AdminIconButton label="Undo" className="max-md:hidden" onClick={() => editorRef.current?.undo()}><Undo2 size={16} strokeWidth={1.8} /></AdminIconButton>
          <AdminIconButton label="Redo" className="max-md:hidden" onClick={() => editorRef.current?.redo()}><Redo2 size={16} strokeWidth={1.8} /></AdminIconButton>
          <AdminIconButton label={`Preview (${mod}⇧P)`} onClick={() => setPreviewOpen(true)}><Eye size={17} strokeWidth={1.8} /></AdminIconButton>
          <AdminIconButton label={`${panelOpen ? 'Hide' : 'Show'} settings (${mod}\\)`} aria-pressed={panelOpen && !focusMode} onClick={() => { setFocusMode(false); setPanelOpen((open) => !open) }}>
            <PanelRight size={17} strokeWidth={1.8} />
          </AdminIconButton>

          <div className="admin-menu" ref={moreRef}>
            <AdminIconButton label="More" aria-haspopup="menu" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={18} strokeWidth={1.8} /></AdminIconButton>
            {moreOpen && (
              <div className="admin-menu__panel" role="menu" aria-label="More actions">
                <button type="button" role="menuitem" className="admin-menu__item" onClick={() => { setMoreOpen(false); setFocusMode((current) => !current) }}>
                  {focusMode ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />} {focusMode ? 'Exit focus mode' : 'Focus mode'}
                </button>
                <button type="button" role="menuitem" className="admin-menu__item" onClick={() => { setMoreOpen(false); setShortcutsOpen(true) }}>
                  <Keyboard size={15} aria-hidden="true" /> Keyboard shortcuts
                </button>
                <div className="admin-menu__sep" />
                {status === 'published' && form.slug && (
                  <>
                    <a role="menuitem" className="admin-menu__item" href={`/blog/${form.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} aria-hidden="true" /> View on website</a>
                    <button type="button" role="menuitem" className="admin-menu__item" onClick={copyLink}><Link2 size={15} aria-hidden="true" /> Copy link</button>
                  </>
                )}
                <button type="button" role="menuitem" className="admin-menu__item" onClick={downloadHtml}><Download size={15} aria-hidden="true" /> Download as HTML</button>
                {(status === 'published' && isAdmin) || (isEditing && isAdmin) ? <div className="admin-menu__sep" /> : null}
                {status === 'published' && isAdmin && (
                  <button type="button" role="menuitem" className="admin-menu__item admin-menu__item--danger" onClick={() => void handleUnpublish()}>Unpublish…</button>
                )}
                {isEditing && isAdmin && (
                  <button type="button" role="menuitem" className="admin-menu__item admin-menu__item--danger" onClick={() => void handleDelete()}><Trash2 size={15} aria-hidden="true" /> Move to Deleted…</button>
                )}
              </div>
            )}
          </div>

          {status !== 'published' && (
            <AdminButton variant={primary ? 'secondary' : 'primary'} disabled={busy} onClick={() => void handleSave()}>
              {submitting === 'save' ? 'Saving…' : 'Save draft'}
            </AdminButton>
          )}
          {primary}
        </div>
      </header>

      <div className="admin-ed-body">
        <div className="admin-ed-canvas">
          <form id="article-form" className="admin-ed-page" onSubmit={(event) => void handleSave(event)} noValidate>
            {recoverySnapshot && (
              <div className="admin-ed-banner" role="status">
                <div className="min-w-0">
                  <strong className="block text-[13px]">Unsaved work found on this device</strong>
                  <span className="text-xs text-a-ink-2">Backed up {new Date(recoverySnapshot.savedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}. It was never sent to the server.</span>
                </div>
                <div className="flex gap-2">
                  <AdminButton size="sm" variant="primary" onClick={restoreLocalRecovery}>Restore</AdminButton>
                  <AdminButton size="sm" onClick={clearLocalRecovery}>Discard</AdminButton>
                </div>
              </div>
            )}

            <CoverImage form={form} update={update} touched={touched} onTouch={markTouched} />

            <div className="mt-8">
              <label htmlFor="title" className="sr-only">Title</label>
              <GrowingTextarea
                id="title"
                className="admin-ed-title"
                placeholder="Title"
                value={form.title}
                maxLength={TITLE_MAX + 20}
                aria-invalid={touched.title && fieldError(form, 'title') ? true : undefined}
                autoFocus={!isEditing}
                onChange={handleTitleChange}
                onBlur={() => markTouched('title')}
                onEnter={() => excerptRef.current?.focus()}
              />
              {touched.title && fieldError(form, 'title') && <p className="admin-field-error" role="alert">{fieldError(form, 'title')}</p>}

              <div className="admin-ed-permalink">
                <span className="text-a-ink-3">{host}/blog/</span>
                {slugEditing ? (
                  <>
                    <label htmlFor="slug" className="sr-only">Slug</label>
                    <input
                      id="slug"
                      className="admin-ed-slug"
                      value={form.slug}
                      maxLength={SLUG_MAX}
                      autoFocus
                      aria-invalid={slugError ? true : undefined}
                      onChange={(event) => handleSlugChange(event.target.value)}
                      onBlur={() => { markTouched('slug'); setSlugEditing(false) }}
                      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } }}
                    />
                  </>
                ) : (
                  <button type="button" className="admin-ed-slug-button" onClick={() => setSlugEditing(true)} aria-label="Edit the link">
                    <span>{form.slug || 'your-article-link'}</span>
                    <Pencil size={11} aria-hidden="true" />
                  </button>
                )}
              </div>
              {slugError && <p className="admin-field-error" role="alert">{slugError}</p>}
              {isEditing && status === 'published' && slugEditing && <p className="mt-1 text-xs text-a-warning">This article is live — changing its link can break existing links.</p>}

              <div className="mt-6">
                <label htmlFor="excerpt" className="sr-only">Summary</label>
                <GrowingTextarea
                  id="excerpt"
                  className="admin-ed-excerpt"
                  placeholder="Add a short summary…"
                  value={form.excerpt}
                  maxLength={EXCERPT_MAX + 20}
                  aria-invalid={touched.excerpt && fieldError(form, 'excerpt') ? true : undefined}
                  onChange={(next) => update('excerpt', next)}
                  onBlur={() => markTouched('excerpt')}
                  onEnter={() => editorRef.current?.focus()}
                  innerRef={excerptRef}
                />
                <div className="mt-1 flex min-h-5 items-center justify-between gap-3 text-xs">
                  <span>
                    {touched.excerpt && fieldError(form, 'excerpt')
                      ? <span className="text-a-danger" role="alert">{fieldError(form, 'excerpt')}</span>
                      : !form.excerpt.trim() && form.content.replace(/<[^>]*>/g, '').trim().length > 40
                        ? <button type="button" className="admin-link text-xs" onClick={() => update('excerpt', excerptFromContent(form.content))}><Sparkles size={12} aria-hidden="true" /> Write it from the article</button>
                        : null}
                  </span>
                  <span className={`tabular-nums ${form.excerpt.length > EXCERPT_MAX ? 'text-a-danger' : 'text-a-ink-3'}`}>{form.excerpt.length > 0 ? `${form.excerpt.length}/${EXCERPT_MAX}` : ''}</span>
                </div>
              </div>
            </div>

            <RichContentEditor
              value={form.content}
              onChange={(next) => update('content', next)}
              onBlur={() => markTouched('content')}
              error={touched.content ? fieldError(form, 'content') : null}
              handleRef={editorRef}
            />
          </form>

          <footer className="admin-ed-footer" aria-label="Article statistics">
            <span className="tabular-nums">{analysis.metrics.wordCount.toLocaleString()} words</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{analysis.metrics.readingTimeMinutes} min read</span>
            <span aria-hidden="true" className="max-sm:hidden">·</span>
            <button type="button" className="admin-ed-footer__score max-sm:hidden" onClick={() => { setFocusMode(false); setPanelOpen(true); setPanelTab('seo') }}>
              SEO <b className="tabular-nums">{analysis.seo.score}</b>
            </button>
            {dirty && <span className="ml-auto flex items-center gap-1.5"><span className="admin-save-state__dot" aria-hidden="true" /> Unsaved</span>}
          </footer>
        </div>

        {panelOpen && !focusMode && (
          <>
            <button type="button" className="admin-ed-panel-scrim" aria-label="Close settings" onClick={() => setPanelOpen(false)} />
            <aside className="admin-ed-panel" aria-label="Article settings">
              <div className="admin-ed-panel__head">
                <div className="admin-segmented-control w-full" role="tablist" aria-label="Settings">
                  {PANEL_TABS.map(({ id: tabId, label, icon: Icon }) => (
                    <button key={tabId} type="button" role="tab" aria-selected={panelTab === tabId} className="flex-1 px-2 whitespace-nowrap" onClick={() => setPanelTab(tabId)}>
                      <Icon size={13} className="mr-1 inline -translate-y-px" aria-hidden="true" />{label}
                    </button>
                  ))}
                </div>
                <AdminIconButton label="Close settings" className="lg:hidden" onClick={() => setPanelOpen(false)}><X size={17} strokeWidth={1.8} /></AdminIconButton>
              </div>
              <div className="admin-ed-panel__body" role="tabpanel">
                {panelTab === 'document' && (
                  <DocumentPanel
                    id={id}
                    form={form}
                    update={update}
                    analysis={analysis}
                    isEditing={isEditing}
                    isAdmin={isAdmin}
                    status={status}
                    reviewStatus={reviewStatus}
                    reviewNote={reviewNote}
                    publishedAt={publishedAtDisplay}
                    scheduledAt={scheduledAt}
                    scheduleInput={scheduleInput}
                    onScheduleInput={setScheduleInput}
                    busy={busy}
                    scheduling={submitting === 'schedule'}
                    unscheduling={submitting === 'unschedule'}
                    onSchedule={() => void handleSchedule()}
                    onUnschedule={() => void handleUnschedule()}
                    onReview={(next, note) => void handleReview(next, note)}
                    onJumpToHeading={(index) => editorRef.current?.scrollToHeading(index)}
                    onRestoreRevision={handleRestoreRevision}
                  />
                )}
                {panelTab === 'seo' && <SeoPanel form={form} update={update} analysis={analysis} />}
                {panelTab === 'enrich' && <EnrichPanel form={form} update={update} />}
              </div>
            </aside>
          </>
        )}
      </div>

      {previewOpen && <PreviewDialog form={form} readingMinutes={analysis.metrics.readingTimeMinutes} onClose={() => setPreviewOpen(false)} />}
      {shortcutsOpen && <ShortcutsSheet isApple={isAppleDevice} onClose={() => setShortcutsOpen(false)} />}
      {publishOpen && (
        <PublishSheet
          analysis={analysis}
          busy={submitting === 'publish'}
          onCancel={() => setPublishOpen(false)}
          onConfirm={() => void handlePublishToggle('published')}
          onSchedule={() => { setPublishOpen(false); setFocusMode(false); setPanelOpen(true); setPanelTab('document') }}
        />
      )}
      {dialog}
    </div>
  )
}

export default BlogEditor

