import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'

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
      className="flex flex-col gap-5 rounded-[12px] border border-neutral-200 bg-white p-6"
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

      <button
        type="submit"
        disabled={submitting}
        className="flex h-[42px] w-full items-center justify-center rounded-[6px] bg-neutral-900 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-fit sm:px-6"
      >
        {submitting ? 'Saving…' : 'Update login ID'}
      </button>
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
      className="flex flex-col gap-5 rounded-[12px] border border-neutral-200 bg-white p-6"
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

      <button
        type="submit"
        disabled={submitting}
        className="flex h-[42px] w-full items-center justify-center rounded-[6px] bg-neutral-900 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-fit sm:px-6"
      >
        {submitting ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}

function Settings() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[24px] font-semibold text-neutral-900">Settings</h1>
      <UsernameForm />
      <PasswordForm />
    </div>
  )
}

export default Settings
