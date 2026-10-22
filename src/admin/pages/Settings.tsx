import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { toast } from 'sonner'
import { useAdminAuth } from '../context/useAdminAuth'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import { useConfirm } from '../components/ConfirmDialog'
import * as siteSettingsApi from '../api/siteSettingsApi'
import type { SiteSettings } from '../api/siteSettingsApi'
import * as operationsApi from '../api/operationsApi'

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

/** A titled group of settings with its own save action in the footer. */
function SettingsCard({ title, description, children, footer, onSubmit }: { title: string; description?: string; children: ReactNode; footer?: ReactNode; onSubmit?: (event: FormEvent) => void }) {
  const body = (
    <>
      <div className="px-6 pt-5 pb-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.016em]">{title}</h2>
        {description && <p className="mt-0.5 max-w-[60ch] text-[13px] leading-snug text-a-ink-2">{description}</p>}
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
      {footer && <div className="flex flex-wrap items-center gap-3 border-t border-a-line bg-a-surface-2 px-6 py-3.5">{footer}</div>}
    </>
  )
  return onSubmit
    ? <form className="admin-card overflow-hidden" onSubmit={onSubmit}>{body}</form>
    : <section className="admin-card overflow-hidden">{body}</section>
}

function UsernameForm() {
  const { admin, refresh } = useAdminAuth()
  const [username, setUsername] = useState(admin?.username ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await adminApi.updateUsername(username, currentPassword)
      await refresh()
      setCurrentPassword('')
      toast.success('Login ID updated.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsCard
      title="Login ID"
      description={`You sign in as ${admin?.username ?? 'your current ID'}.`}
      onSubmit={handleSubmit}
      footer={<AdminButton type="submit" variant="primary" disabled={submitting || username === admin?.username}>{submitting ? 'Saving…' : 'Update login ID'}</AdminButton>}
    >
      {error && <FormMessage type="error">{error}</FormMessage>}
      <FormField id="new-username" label="New login ID" type="text" required value={username} onChange={(event) => setUsername(event.target.value)} />
      <FormField id="username-current-password" label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
    </SettingsCard>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await adminApi.updatePassword(currentPassword, newPassword, confirmPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsCard
      title="Password"
      description="At least 10 characters, with a letter and a number."
      onSubmit={handleSubmit}
      footer={<AdminButton type="submit" variant="primary" disabled={submitting}>{submitting ? 'Saving…' : 'Update password'}</AdminButton>}
    >
      {error && <FormMessage type="error">{error}</FormMessage>}
      <FormField id="current-password" label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="new-password" label="New password" type="password" autoComplete="new-password" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
        <FormField id="confirm-password" label="Confirm new password" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      </div>
    </SettingsCard>
  )
}

const fallbackSettings: SiteSettings = {
  siteName: 'BRANDWORKS',
  siteDescription: 'We help brands build a stronger presence through strategic brand identity, social media, content, marketing, development and SEO.',
  contactEmail: 'hello@brandworks.com',
  footerTagline: 'Based in India, working worldwide.',
  socialLinks: [{ label: 'Instagram', url: '#' }, { label: 'LinkedIn', url: '#' }, { label: 'X', url: '#' }],
  navLabels: { home: 'Home', about: 'About', services: 'Services', projects: 'Projects', insights: 'Insights' },
}

function WebsiteSettingsForm() {
  const { admin } = useAdminAuth()
  const [settings, setSettings] = useState<SiteSettings>(fallbackSettings)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(fallbackSettings))

  useEffect(() => {
    let active = true
    siteSettingsApi.getSiteSettings()
      .then(({ settings: next }) => { if (active) { setSettings(next); setSavedSnapshot(JSON.stringify(next)) } })
      .catch((err: unknown) => { if (active) setError(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function setField<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) { setSettings((current) => ({ ...current, [key]: value })) }
  function setNavField(key: keyof SiteSettings['navLabels'], value: string) { setSettings((current) => ({ ...current, navLabels: { ...current.navLabels, [key]: value } })) }
  function setSocial(index: number, value: string) { setSettings((current) => ({ ...current, socialLinks: current.socialLinks.map((link, linkIndex) => linkIndex === index ? { ...link, url: value } : link) })) }

  const isDirty = JSON.stringify(settings) !== savedSnapshot

  async function save(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await siteSettingsApi.updateSiteSettings(settings)
      setSettings(result.settings)
      setSavedSnapshot(JSON.stringify(result.settings))
      toast.success('Website settings saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsCard
      title="Website"
      description="Site name, contact details, navigation labels, footer and social links. Page designs themselves stay in code."
      onSubmit={save}
      footer={
        <>
          <AdminButton type="submit" variant="primary" disabled={submitting || admin?.role !== 'admin' || !isDirty}>{submitting ? 'Saving…' : 'Save changes'}</AdminButton>
          {admin?.role !== 'admin' && <span className="text-xs text-a-ink-2">Only administrators can change these.</span>}
        </>
      }
    >
      {error && <FormMessage type="error">{error}</FormMessage>}
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true"><span className="admin-skeleton h-9" /><span className="admin-skeleton h-9" /><span className="admin-skeleton h-9" /></div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField id="site-name" label="Site name" required value={settings.siteName} onChange={(event) => setField('siteName', event.target.value)} />
            <FormField id="contact-email" label="Contact email" required type="email" value={settings.contactEmail} onChange={(event) => setField('contactEmail', event.target.value)} />
          </div>
          <FormField id="site-description" label="Description" required value={settings.siteDescription} onChange={(event) => setField('siteDescription', event.target.value)} />
          <FormField id="footer-tagline" label="Footer tagline" required value={settings.footerTagline} onChange={(event) => setField('footerTagline', event.target.value)} />
          <fieldset className="m-0 border-0 p-0">
            <legend className="admin-form-label">Navigation labels</legend>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.keys(settings.navLabels) as Array<keyof SiteSettings['navLabels']>).map((key) => (
                <FormField key={key} id={`nav-${key}`} label={key[0].toUpperCase() + key.slice(1)} required value={settings.navLabels[key]} onChange={(event) => setNavField(key, event.target.value)} />
              ))}
            </div>
          </fieldset>
          <fieldset className="m-0 border-0 p-0">
            <legend className="admin-form-label">Social links</legend>
            <div className="grid gap-3 md:grid-cols-3">
              {settings.socialLinks.map((link, index) => (
                <FormField key={link.label} id={`social-${link.label}`} label={link.label} type="url" value={link.url === '#' ? '' : link.url} placeholder="https://" onChange={(event) => setSocial(index, event.target.value || '#')} />
              ))}
            </div>
          </fieldset>
        </>
      )}
    </SettingsCard>
  )
}

function OperationsSettings() {
  const { admin } = useAdminAuth()
  const { confirm, dialog } = useConfirm()
  const [preferences, setPreferences] = useState<operationsApi.NotificationPreferences>({ emailOnReview: true, emailOnPublishFailure: true, emailOnScheduledPublish: false })
  const [savedPreferences, setSavedPreferences] = useState(preferences)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (admin?.role !== 'admin') return
    operationsApi.getPreferences()
      .then(({ preferences: next }) => { setPreferences(next); setSavedPreferences(next) })
      .catch((err: unknown) => setError(errorMessage(err)))
  }, [admin?.role])

  async function savePreferences() {
    setBusy(true)
    setError(null)
    try {
      const { preferences: next } = await operationsApi.savePreferences(preferences)
      setPreferences(next)
      setSavedPreferences(next)
      toast.success('Notification preferences saved.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function exportBackup() {
    setBusy(true)
    setError(null)
    try {
      const blob = await operationsApi.downloadBackup()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `brandworks-blog-backup-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function importBackup(file: File | undefined) {
    if (!file) return
    const ok = await confirm({
      title: 'Restore this backup?',
      message: 'Existing articles and redirects may be replaced by what’s in the file.',
      confirmLabel: 'Restore',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    setError(null)
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>
      const { restored } = await operationsApi.restoreBackup(data)
      toast.success(`Restored ${restored.blogs} articles and ${restored.redirects} redirects.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (admin?.role !== 'admin') return null

  return (
    <>
      <SettingsCard
        title="Notifications"
        description="Choose which events should notify you. Delivery is connected separately."
        footer={<AdminButton variant="primary" disabled={busy || JSON.stringify(preferences) === JSON.stringify(savedPreferences)} onClick={() => void savePreferences()}>Save preferences</AdminButton>}
      >
        {error && <FormMessage type="error">{error}</FormMessage>}
        {([['emailOnReview', 'Review changes', 'When an article is sent for review or approved.'], ['emailOnPublishFailure', 'Publishing problems', 'When a scheduled article fails to publish.'], ['emailOnScheduledPublish', 'Upcoming releases', 'A heads-up before scheduled articles go live.']] as const).map(([key, label, hint]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <label htmlFor={`pref-${key}`} className="min-w-0 cursor-pointer">
              <span className="block text-[14px] font-medium">{label}</span>
              <span className="block text-[13px] text-a-ink-2">{hint}</span>
            </label>
            <span className="admin-switch">
              <input id={`pref-${key}`} type="checkbox" role="switch" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} />
              <span aria-hidden="true" />
            </span>
          </div>
        ))}
      </SettingsCard>

      <SettingsCard
        title="Backup"
        description="Download every article and redirect as a file, or restore from one. Media files are stored separately."
        footer={
          <>
            <AdminButton disabled={busy} onClick={() => void exportBackup()}>Download backup</AdminButton>
            <label className="admin-button cursor-pointer">
              <span>Restore from file</span>
              <input className="sr-only" type="file" accept="application/json" disabled={busy} onChange={(event) => { void importBackup(event.target.files?.[0]); event.target.value = '' }} />
            </label>
          </>
        }
      >
        <p className="text-[13px] text-a-ink-2">A backup is a good idea before a large edit or import.</p>
      </SettingsCard>
      {dialog}
    </>
  )
}

function Settings() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <AdminPageHeader title="Settings" description="Your account, the website’s details and how Studio keeps you informed." />
      <UsernameForm />
      <PasswordForm />
      <WebsiteSettingsForm />
      <OperationsSettings />
    </div>
  )
}

export default Settings
