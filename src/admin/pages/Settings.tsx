import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAdminAuth } from '../context/useAdminAuth'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'

function errorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Something went wrong. Please try again.'
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
    } catch (err) {
      setStatus({ type: 'error', message: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="admin-surface flex flex-col gap-5 p-6"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-[16px] font-semibold text-neutral-900">
          Login ID
        </h2>
        <p className="mt-1 text-[13px] text-neutral-500">
          Your current login ID is{' '}
          <span className="font-medium text-neutral-900">
            {admin?.username}
          </span>
          .
        </p>
      </div>

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
    } catch (err) {
      setStatus({ type: 'error', message: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="admin-surface flex flex-col gap-5 p-6"
      onSubmit={handleSubmit}
    >
      <div>
        <h2 className="text-[16px] font-semibold text-neutral-900">
          Password
        </h2>
        <p className="mt-1 text-[13px] text-neutral-500">
          At least 10 characters, including a letter and a number.
        </p>
      </div>

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

function Settings() {
  return (
    <div>
      <AdminPageHeader eyebrow="Workspace preferences" title="Settings" description="Keep your access secure and your account details current." />
      <UsernameForm />
      <div className="mt-4"><PasswordForm /></div>
    </div>
  )
}

export default Settings
