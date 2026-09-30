import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import type { AdminAccount } from '../api/types'

function errorMessage(err: unknown): string {
  return err instanceof ApiError
    ? err.message
    : 'Something went wrong. Please try again.'
}

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString()
}

function CreateSubAdminForm({ onCreated }: { onCreated: (admin: AdminAccount) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<
    { type: 'error' | 'success'; message: string } | null
  >(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus(null)
    setSubmitting(true)
    try {
      const { admin } = await adminApi.createSubAdmin(username, password)
      onCreated(admin)
      setUsername('')
      setPassword('')
      setStatus({ type: 'success', message: `Sub-admin "${admin.username}" created.` })
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
      <h2 className="text-[16px] font-semibold text-neutral-900">
        Create sub-admin
      </h2>

      {status && <FormMessage type={status.type}>{status.message}</FormMessage>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          id="new-admin-username"
          label="Login ID"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <FormField
          id="new-admin-password"
          label="Temporary password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-[42px] w-full items-center justify-center rounded-[6px] bg-neutral-900 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-fit sm:px-6"
      >
        {submitting ? 'Creating…' : 'Create sub-admin'}
      </button>
    </form>
  )
}

function AdminRow({
  account,
  onChanged,
}: {
  account: AdminAccount
  onChanged: (admin: AdminAccount) => void
}) {
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)

  const isManageable = account.role === 'sub_admin' && !account.isPrimary

  async function toggleEnabled() {
    setRowError(null)
    setBusy(true)
    try {
      const { admin } = await adminApi.setSubAdminEnabled(account._id, !account.enabled)
      onChanged(admin)
    } catch (err) {
      setRowError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm(`Delete sub-admin "${account.username}"? This cannot be undone.`)) {
      return
    }
    setRowError(null)
    setBusy(true)
    try {
      await adminApi.deleteSubAdmin(account._id)
      setDeleted(true)
    } catch (err) {
      setRowError(errorMessage(err))
      setBusy(false)
    }
  }

  if (deleted) return null

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="py-3 pr-4">
        <div className="text-[14px] font-medium text-neutral-900">
          {account.username}
          {account.isPrimary && (
            <span className="ml-2 rounded-[4px] border border-neutral-300 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Primary
            </span>
          )}
        </div>
        {rowError && <div className="mt-1 text-[12px] text-red-600">{rowError}</div>}
      </td>
      <td className="py-3 pr-4 text-[13px] uppercase tracking-wide text-neutral-600">
        {account.role === 'admin' ? 'Admin' : 'Sub-admin'}
      </td>
      <td className="py-3 pr-4">
        <span
          className={`rounded-[4px] px-2 py-0.5 text-[12px] font-medium ${
            account.enabled
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-neutral-100 text-neutral-500'
          }`}
        >
          {account.enabled ? 'Enabled' : 'Disabled'}
        </span>
      </td>
      <td className="py-3 pr-4 text-[13px] text-neutral-500">
        {formatDate(account.lastLoginAt)}
      </td>
      <td className="py-3 text-right">
        {isManageable && (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleEnabled()}
              className="rounded-[4px] border border-neutral-300 px-2.5 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-50"
            >
              {account.enabled ? 'Disable' : 'Enable'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-[4px] border border-red-300 px-2.5 py-1.5 text-[12px] font-medium text-red-600 transition-colors hover:border-red-600 disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

function Users() {
  const { admin } = useAdminAuth()
  const [admins, setAdmins] = useState<AdminAccount[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (admin?.role !== 'admin') return
    adminApi
      .listAdminUsers()
      .then(({ admins: list }) => setAdmins(list))
      .catch((err: unknown) => setLoadError(errorMessage(err)))
  }, [admin?.role])

  if (admin?.role !== 'admin') {
    return (
      <FormMessage type="error">
        Only admins can view and manage admin accounts.
      </FormMessage>
    )
  }

  function upsert(updated: AdminAccount) {
    setAdmins((prev) =>
      prev
        ? prev.map((item) => (item._id === updated._id ? updated : item))
        : prev,
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-[24px] font-semibold text-neutral-900">
        Admins &amp; Sub-admins
      </h1>

      <CreateSubAdminForm
        onCreated={(created) => setAdmins((prev) => (prev ? [...prev, created] : [created]))}
      />

      <div className="rounded-[12px] border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-[16px] font-semibold text-neutral-900">
          All accounts
        </h2>

        {loadError && <FormMessage type="error">{loadError}</FormMessage>}

        {!admins && !loadError && (
          <p className="text-[14px] text-neutral-500">Loading…</p>
        )}

        {admins && admins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="border-b border-neutral-200 text-[12px] uppercase tracking-wide text-neutral-500">
                  <th className="py-2 pr-4 font-medium">Login ID</th>
                  <th className="py-2 pr-4 font-medium">Role</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Last login</th>
                  <th className="py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((account) => (
                  <AdminRow key={account._id} account={account} onChanged={upsert} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Users
