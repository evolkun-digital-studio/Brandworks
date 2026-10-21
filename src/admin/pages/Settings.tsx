import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { BellRing, Globe2, KeyRound, LockKeyhole } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAdminAuth } from '../context/useAdminAuth'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import * as siteSettingsApi from '../api/siteSettingsApi'
import type { SiteSettings } from '../api/siteSettingsApi'
import * as operationsApi from '../api/operationsApi'
import { toast } from 'sonner'

function errorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Something went wrong. Please try again.'
}

function SettingsSectionHeading({ icon: Icon, eyebrow, title, description }: { icon: LucideIcon; eyebrow: string; title: string; description: string }) {
  return <div className="admin-settings-heading"><span className="admin-settings-heading__icon"><Icon size={17} strokeWidth={1.8} aria-hidden="true" /></span><div><p className="admin-eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div></div>
}

function UsernameForm() {
  const { admin, refresh } = useAdminAuth()
  const [username, setUsername] = useState(admin?.username ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [status, setStatus] = useState<
    { type: 'error' | 'success'; message: string } | null
  >(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      await adminApi.updateUsername(username, currentPassword)
      await refresh()
      setCurrentPassword('')
      setStatus({ type: 'success', message: 'Login ID updated.' })
      toast.success('Login ID updated.')
    } catch (err) {
      setStatus({ type: 'error', message: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="admin-surface admin-settings-section flex flex-col gap-5 p-6"
      onSubmit={handleSubmit}
    >
      <SettingsSectionHeading icon={KeyRound} eyebrow="Account access" title="Login ID" description={`Your current login ID is ${admin?.username ?? 'not available'}.`} />

      {status && <FormMessage type={status.type}>{status.message}</FormMessage>}

      <FormField
        id="new-username"
        label="New login ID"
        type="text"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <FormField
        id="username-current-password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />

      <AdminButton
        type="submit"
        variant="primary"
        disabled={submitting}
      >
        {submitting ? 'Saving…' : 'Update login ID'}
      </AdminButton>
    </form>
  )
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState<
    { type: 'error' | 'success'; message: string } | null
  >(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      await adminApi.updatePassword(currentPassword, newPassword, confirmPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setStatus({ type: 'success', message: 'Password updated.' })
      toast.success('Password updated.')
    } catch (err) {
      setStatus({ type: 'error', message: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="admin-surface admin-settings-section flex flex-col gap-5 p-6"
      onSubmit={handleSubmit}
    >
      <SettingsSectionHeading icon={LockKeyhole} eyebrow="Account security" title="Password" description="At least 10 characters, including a letter and a number." />

      {status && <FormMessage type={status.type}>{status.message}</FormMessage>}

      <FormField
        id="current-password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        required
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <FormField
        id="new-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        required
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
      />
      <FormField
        id="confirm-password"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        required
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <AdminButton
        type="submit"
        variant="primary"
        disabled={submitting}
      >
        {submitting ? 'Saving…' : 'Update password'}
      </AdminButton>
    </form>
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
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(fallbackSettings))

  useEffect(() => {
    let active = true
    siteSettingsApi.getSiteSettings().then(({ settings: next }) => { if (active) { setSettings(next); setSavedSnapshot(JSON.stringify(next)) } }).catch((err: unknown) => { if (active) setStatus({ type: 'error', message: errorMessage(err) }) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function setField<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) { setSettings((current) => ({ ...current, [key]: value })) }
  function setNavField(key: keyof SiteSettings['navLabels'], value: string) { setSettings((current) => ({ ...current, navLabels: { ...current.navLabels, [key]: value } })) }
  function setSocial(index: number, value: string) { setSettings((current) => ({ ...current, socialLinks: current.socialLinks.map((link, linkIndex) => linkIndex === index ? { ...link, url: value } : link) })) }

  const isDirty = JSON.stringify(settings) !== savedSnapshot

  async function save(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setStatus(null)
    try { const result = await siteSettingsApi.updateSiteSettings(settings); setSettings(result.settings); setSavedSnapshot(JSON.stringify(result.settings)); setStatus({ type: 'success', message: 'Website settings saved.' }); toast.success('Website settings saved.') }
    catch (err) { setStatus({ type: 'error', message: errorMessage(err) }) } finally { setSubmitting(false) }
  }

  return <form className="admin-surface admin-settings-section mt-4 flex flex-col gap-5 p-6" onSubmit={save}>
    <SettingsSectionHeading icon={Globe2} eyebrow="Website controls" title="Controlled public content" description="Manage site-wide metadata, navigation labels, contact details, footer copy, and approved social links. Authored motion-led page sections remain code-controlled." />
    {status && <FormMessage type={status.type}>{status.message}</FormMessage>}
    {loading ? <p className="text-[13px] text-neutral-500">Loading website settings…</p> : <>
      <div className="grid gap-4 md:grid-cols-2"><FormField id="site-name" label="Site name" required value={settings.siteName} onChange={(event) => setField('siteName', event.target.value)} /><FormField id="contact-email" label="Contact email" required type="email" value={settings.contactEmail} onChange={(event) => setField('contactEmail', event.target.value)} /></div>
      <FormField id="site-description" label="Site description" required value={settings.siteDescription} onChange={(event) => setField('siteDescription', event.target.value)} />
      <FormField id="footer-tagline" label="Footer tagline" required value={settings.footerTagline} onChange={(event) => setField('footerTagline', event.target.value)} />
      <fieldset><legend className="mb-2 text-[13px] font-medium text-neutral-900">Navigation labels</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{(Object.keys(settings.navLabels) as Array<keyof SiteSettings['navLabels']>).map((key) => <FormField key={key} id={`nav-${key}`} label={key} required value={settings.navLabels[key]} onChange={(event) => setNavField(key, event.target.value)} />)}</div></fieldset>
      <fieldset><legend className="mb-2 text-[13px] font-medium text-neutral-900">Social links</legend><div className="grid gap-4 md:grid-cols-3">{settings.socialLinks.map((link, index) => <FormField key={link.label} id={`social-${link.label}`} label={link.label} type="url" value={link.url === '#' ? '' : link.url} placeholder="https://" onChange={(event) => setSocial(index, event.target.value || '#')} />)}</div></fieldset>
      <AdminButton type="submit" variant="primary" disabled={submitting || admin?.role !== 'admin' || !isDirty}>{admin?.role !== 'admin' ? 'Admin access required' : submitting ? 'Saving…' : isDirty ? 'Save website settings' : 'No changes to save'}</AdminButton>
    </>}
  </form>
}

function OperationsSettings() {
  const { admin } = useAdminAuth()
  const [preferences, setPreferences] = useState<operationsApi.NotificationPreferences>({ emailOnReview: true, emailOnPublishFailure: true, emailOnScheduledPublish: false })
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (admin?.role !== 'admin') return; operationsApi.getPreferences().then(({ preferences: next }) => { setPreferences(next); setSavedPreferences(next) }).catch((err: unknown) => setStatus({ type: 'error', message: errorMessage(err) })) }, [admin?.role])
  const [savedPreferences, setSavedPreferences] = useState(preferences)
  async function savePreferences() { setBusy(true); setStatus(null); try { const { preferences: next } = await operationsApi.savePreferences(preferences); setPreferences(next); setSavedPreferences(next); setStatus({ type: 'success', message: 'Notification preferences saved.' }); toast.success('Notification preferences saved.') } catch (err) { setStatus({ type: 'error', message: errorMessage(err) }) } finally { setBusy(false) } }
  async function exportBackup() { setBusy(true); setStatus(null); try { const blob = await operationsApi.downloadBackup(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `brandworks-blog-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url); setStatus({ type: 'success', message: 'Backup downloaded.' }); toast.success('Backup downloaded.') } catch (err) { setStatus({ type: 'error', message: errorMessage(err) }) } finally { setBusy(false) } }
  async function importBackup(file: File | undefined) { if (!file) return; if (!window.confirm('Restore this backup? Existing articles and redirects may be replaced.')) return; setBusy(true); setStatus(null); try { const data = JSON.parse(await file.text()) as Record<string, unknown>; const { restored } = await operationsApi.restoreBackup(data); setStatus({ type: 'success', message: `Restored ${restored.blogs} articles and ${restored.redirects} redirects.` }); toast.success(`Restored ${restored.blogs} articles and ${restored.redirects} redirects.`) } catch (err) { setStatus({ type: 'error', message: errorMessage(err) }) } finally { setBusy(false) } }
  if (admin?.role !== 'admin') return null
  return <section className="admin-surface admin-settings-section mt-4 flex flex-col gap-5 p-6"><SettingsSectionHeading icon={BellRing} eyebrow="Operations" title="Notifications and backups" description="Preferences are stored for future delivery integrations. Backups contain CMS articles and redirects; media binaries remain in GridFS." />{status && <FormMessage type={status.type}>{status.message}</FormMessage>}<fieldset className="grid gap-3"><legend className="mb-1 text-[13px] font-medium text-neutral-900">Notification preferences</legend>{([['emailOnReview', 'Review state changes'], ['emailOnPublishFailure', 'Scheduled publish failures'], ['emailOnScheduledPublish', 'Upcoming scheduled publishing']] as const).map(([key, label]) => <label key={key} className="flex min-h-[44px] items-center gap-3 text-[13px] text-neutral-700"><input type="checkbox" checked={preferences[key]} onChange={(event) => setPreferences((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</fieldset><div className="admin-settings-actions flex flex-wrap gap-3 border-t border-neutral-100 pt-5"><AdminButton variant="primary" disabled={busy || JSON.stringify(preferences) === JSON.stringify(savedPreferences)} onClick={() => void savePreferences()}>Save preferences</AdminButton><AdminButton variant="secondary" disabled={busy} onClick={() => void exportBackup()}>Download backup</AdminButton><label className="admin-button admin-button--secondary"><span>Restore backup</span><input className="sr-only" type="file" accept="application/json" disabled={busy} onChange={(event) => void importBackup(event.target.files?.[0])} /></label></div></section>
}

function Settings() {
  return (
    <div>
      <AdminPageHeader eyebrow="Workspace preferences" title="Settings" description="Keep your access secure and your controlled website content current." />
      <div className="admin-settings-security-grid"><UsernameForm /><PasswordForm /></div>
      <WebsiteSettingsForm />
      <OperationsSettings />
    </div>
  )
}

export default Settings
