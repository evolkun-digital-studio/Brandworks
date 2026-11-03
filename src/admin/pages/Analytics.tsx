import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { toast } from 'sonner'
import { useAdminAuth } from '../context/useAdminAuth'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import SettingsCard from '../components/SettingsCard'
import * as siteSettingsApi from '../api/siteSettingsApi'
import type { TrackingSettings } from '../api/siteSettingsApi'
import { ApiError } from '../api/client'

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

const emptyTracking: TrackingSettings = { ga4MeasurementId: '', gscVerification: '', metaPixelId: '' }

function TrackingSettingsForm() {
  const { admin } = useAdminAuth()
  const [tracking, setTracking] = useState<TrackingSettings>(emptyTracking)
  const [saved, setSaved] = useState<TrackingSettings>(emptyTracking)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    siteSettingsApi.getSiteSettings()
      .then(({ settings }) => { if (active) { setTracking(settings.tracking); setSaved(settings.tracking) } })
      .catch((err: unknown) => { if (active) setError(errorMessage(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  function setField(key: keyof TrackingSettings, value: string) { setTracking((current) => ({ ...current, [key]: value })) }

  const isDirty = JSON.stringify(tracking) !== JSON.stringify(saved)

  async function save(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const { settings } = await siteSettingsApi.updateTrackingSettings(tracking)
      setTracking(settings.tracking)
      setSaved(settings.tracking)
      toast.success('Tracking settings saved. The live site picks them up on the next page load.')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsCard
      title="Tracking IDs"
      description="Analytics and the pixel load only after a visitor accepts cookies. Leave a field empty to turn that tool off."
      onSubmit={save}
      footer={
        <>
          <AdminButton type="submit" variant="primary" disabled={submitting || admin?.role !== 'admin' || !isDirty}>{submitting ? 'Saving…' : 'Save tracking'}</AdminButton>
          {admin?.role !== 'admin' && <span className="text-xs text-a-ink-2">Only administrators can change these.</span>}
        </>
      }
    >
      {error && <FormMessage type="error">{error}</FormMessage>}
      {loading ? (
        <div className="flex flex-col gap-3" aria-busy="true"><span className="admin-skeleton h-9" /><span className="admin-skeleton h-9" /><span className="admin-skeleton h-9" /></div>
      ) : (
        <>
          <FormField
            id="tracking-ga4"
            label="Google Analytics 4 measurement ID"
            placeholder="G-XXXXXXXXXX"
            autoComplete="off"
            spellCheck={false}
            value={tracking.ga4MeasurementId}
            onChange={(event) => setField('ga4MeasurementId', event.target.value)}
            helperText="In Google Analytics: Admin → Data streams → your web stream → Measurement ID."
          />
          <FormField
            id="tracking-gsc"
            label="Google Search Console verification"
            placeholder="Paste the token or the whole <meta> tag"
            autoComplete="off"
            spellCheck={false}
            value={tracking.gscVerification}
            onChange={(event) => setField('gscVerification', event.target.value)}
            helperText="In Search Console, add a URL-prefix property and choose the HTML tag method. Save here first, then press Verify in Search Console."
          />
          <FormField
            id="tracking-meta"
            label="Meta Pixel ID"
            placeholder="1234567890123456"
            inputMode="numeric"
            autoComplete="off"
            value={tracking.metaPixelId}
            onChange={(event) => setField('metaPixelId', event.target.value)}
            helperText="In Meta Events Manager: Data sources → your pixel → Settings → Pixel ID (the dataset ID)."
          />
        </>
      )}
    </SettingsCard>
  )
}

function Analytics() {
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <AdminPageHeader title="Analytics" description="Connect Google Analytics, Search Console and Meta Pixel to the website." />
      <TrackingSettingsForm />
    </div>
  )
}

export default Analytics
