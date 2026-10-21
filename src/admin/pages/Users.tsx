import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Power, ShieldCheck, Trash2, UserPlus, UsersRound } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminAuth } from '../context/useAdminAuth'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
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
      toast.success(`Sub-admin "${admin.username}" created.`)
    } catch (err) {
      setStatus({ type: 'error', message: errorMessage(err) })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      className="admin-surface admin-team-create flex flex-col gap-5 p-6"
      onSubmit={handleSubmit}
    >
      <div className="admin-team-heading"><span className="admin-team-heading__icon"><UserPlus size={17} strokeWidth={1.8} aria-hidden="true" /></span><div><p className="admin-eyebrow">Access provisioning</p><h2>Create sub-admin</h2><p>Invite a teammate with the existing sub-admin permission set.</p></div></div>

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

      <AdminButton
        type="submit"
        variant="primary"
        disabled={submitting}
      >
        {submitting ? 'Creating…' : 'Create sub-admin'}
      </AdminButton>
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
      toast.success(`${admin.username} is now ${admin.enabled ? 'enabled' : 'disabled'}.`)
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
      toast.success(`${account.username} was removed.`)
    } catch (err) {
      setRowError(errorMessage(err))
      setBusy(false)
    }
  }

  if (deleted) return null

  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td data-label="Login ID" className="py-3 pr-4">
        <div className="text-[14px] font-medium text-neutral-900">
          {account.username}
          {account.isPrimary && (
            <span className="ml-2 rounded-[4px] border border-neutral-300 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
              Primary
            </span>
          )}
        </div>
        {rowError && <div className="admin-team-row__error" role="alert">{rowError}</div>}
      </td>
      <td data-label="Role" className="py-3 pr-4">
        <AdminStatusBadge tone={account.role === 'admin' ? 'accent' : 'neutral'}>{account.role === 'admin' ? 'Admin' : 'Sub-admin'}</AdminStatusBadge>
      </td>
      <td data-label="Status" className="py-3 pr-4">
        <AdminStatusBadge tone={account.enabled ? 'success' : 'neutral'}>{account.enabled ? 'Enabled' : 'Disabled'}</AdminStatusBadge>
      </td>
      <td data-label="Last login" className="py-3 pr-4 text-[13px] text-neutral-500">
        {formatDate(account.lastLoginAt)}
      </td>
      <td data-label="Actions" className="py-3 text-right">
        {isManageable ? (
          <div className="flex justify-end gap-2">
            <AdminButton
              variant="secondary"
              disabled={busy}
              onClick={() => void toggleEnabled()}
              icon={<Power size={14} strokeWidth={1.8} aria-hidden="true" />}
            >
              {account.enabled ? 'Disable' : 'Enable'}
            </AdminButton>
            <AdminButton
              variant="danger"
              disabled={busy}
              onClick={() => void remove()}
              icon={<Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />}
            >
              Delete
            </AdminButton>
          </div>
        ) : <span className="admin-team-protected"><ShieldCheck size={14} strokeWidth={1.8} aria-hidden="true" /> Protected</span>}
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

  const enabledCount = admins?.filter((account) => account.enabled).length ?? 0
  const subAdminCount = admins?.filter((account) => account.role === 'sub_admin').length ?? 0
  const primaryCount = admins?.filter((account) => account.isPrimary).length ?? 0

  return (
    <div>
      <AdminPageHeader eyebrow="Access control" title="Team" description="Manage administrator and sub-admin access without changing role permissions." />

      {admins && <section className="admin-team-summary" aria-label="Team summary"><div><span>Total accounts</span><strong>{admins.length}</strong></div><div><span>Enabled</span><strong>{enabledCount}</strong></div><div><span>Sub-admins</span><strong>{subAdminCount}</strong></div><div><span>Protected</span><strong>{primaryCount}</strong></div></section>}

      <CreateSubAdminForm
        onCreated={(created) => setAdmins((prev) => (prev ? [...prev, created] : [created]))}
      />

      <div className="admin-surface admin-team-accounts mt-4 p-6">
        <div className="admin-team-accounts__heading"><div><p className="admin-eyebrow">Workspace access</p><h2>All accounts</h2></div><span>{admins?.length ?? 0} members</span></div>

        {loadError && <FormMessage type="error">{loadError}</FormMessage>}

        {!admins && !loadError && (
          <p className="text-[14px] text-neutral-500">Loading…</p>
        )}

        {admins && admins.length > 0 && (
          <div className="overflow-x-auto" aria-live="polite">
              <table className="admin-team-table w-full text-left">
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

        {admins && admins.length === 0 && <div className="admin-empty-state"><p className="admin-empty-state__title">No team members yet</p><p className="admin-empty-state__description">Create a sub-admin account to share publishing operations.</p></div>}
      </div>
    </div>
  )
}

export default Users
