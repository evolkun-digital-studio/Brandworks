import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Power, ShieldCheck, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAdminAuth } from '../context/useAdminAuth'
import * as adminApi from '../api/adminApi'
import { ApiError } from '../api/client'
import FormField from '../components/FormField'
import FormMessage from '../components/FormMessage'
import AdminButton from '../components/AdminButton'
import AdminPageHeader from '../components/AdminPageHeader'
import AdminStatusBadge from '../components/AdminStatusBadge'
import { useConfirm } from '../components/ConfirmDialog'
import type { AdminAccount } from '../api/types'

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function formatDate(value: string | null): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function CreateSubAdminForm({ onCreated }: { onCreated: (admin: AdminAccount) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { admin } = await adminApi.createSubAdmin(username, password)
      onCreated(admin)
      setUsername('')
      setPassword('')
      toast.success(`Sub-admin “${admin.username}” created.`)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="admin-card overflow-hidden" onSubmit={handleSubmit}>
      <div className="px-6 pt-5 pb-1">
        <h2 className="text-[17px] font-semibold tracking-[-0.016em]">Add a teammate</h2>
        <p className="mt-0.5 text-[13px] text-a-ink-2">Sub-admins can write and edit articles. Publishing stays with administrators.</p>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">
        {error && <FormMessage type="error">{error}</FormMessage>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField id="new-admin-username" label="Login ID" type="text" required value={username} onChange={(event) => setUsername(event.target.value)} />
          <FormField id="new-admin-password" label="Temporary password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
      </div>
      <div className="border-t border-a-line bg-a-surface-2 px-6 py-3.5">
        <AdminButton type="submit" variant="primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add sub-admin'}</AdminButton>
      </div>
    </form>
  )
}

function AdminRow({ account, onChanged }: { account: AdminAccount; onChanged: (admin: AdminAccount) => void }) {
  const [busy, setBusy] = useState(false)
  const [rowError, setRowError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const { confirm, dialog } = useConfirm()
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
    const ok = await confirm({ title: `Remove “${account.username}”?`, message: 'They lose access immediately. This can’t be undone.', confirmLabel: 'Remove', tone: 'danger' })
    if (!ok) return
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
    <tr>
      <td>
        <div className="flex items-center gap-3">
          <span className="admin-avatar" aria-hidden="true">{account.username.slice(0, 2).toUpperCase()}</span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold">{account.username}</p>
            {rowError && <p className="text-xs text-a-danger" role="alert">{rowError}</p>}
          </div>
        </div>
        {dialog}
      </td>
      <td><AdminStatusBadge tone={account.role === 'admin' ? 'accent' : 'neutral'}>{account.role === 'admin' ? 'Admin' : 'Sub-admin'}</AdminStatusBadge></td>
      <td><AdminStatusBadge tone={account.enabled ? 'success' : 'neutral'}>{account.enabled ? 'Active' : 'Disabled'}</AdminStatusBadge></td>
      <td className="whitespace-nowrap text-a-ink-2 max-md:hidden">{formatDate(account.lastLoginAt)}</td>
      <td className="text-right">
        {isManageable ? (
          <div className="flex justify-end gap-2">
            <AdminButton size="sm" disabled={busy} onClick={() => void toggleEnabled()} icon={<Power size={12} aria-hidden="true" />}>{account.enabled ? 'Disable' : 'Enable'}</AdminButton>
            <AdminButton size="sm" variant="danger" disabled={busy} onClick={() => void remove()} icon={<Trash2 size={12} aria-hidden="true" />}>Remove</AdminButton>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs text-a-ink-2"><ShieldCheck size={14} aria-hidden="true" /> Protected</span>
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
    adminApi.listAdminUsers().then(({ admins: list }) => setAdmins(list)).catch((err: unknown) => setLoadError(errorMessage(err)))
  }, [admin?.role])

  if (admin?.role !== 'admin') {
    return <FormMessage type="error">Only administrators can manage the team.</FormMessage>
  }

  function upsert(updated: AdminAccount) {
    setAdmins((previous) => previous ? previous.map((item) => (item._id === updated._id ? updated : item)) : previous)
  }

  return (
    <div className="mx-auto flex max-w-[860px] flex-col gap-5">
      <AdminPageHeader title="Team" description="Who can sign in to Studio, and what they can do." />

      <CreateSubAdminForm onCreated={(created) => setAdmins((previous) => (previous ? [...previous, created] : [created]))} />

      <section className="admin-card overflow-hidden" aria-label="Accounts">
        <div className="admin-card__head"><h2>Accounts</h2><span className="text-xs text-a-ink-2">{admins?.length ?? 0}</span></div>
        {loadError && <div className="px-5.5 pb-5"><FormMessage type="error">{loadError}</FormMessage></div>}
        {!admins && !loadError && <div className="flex flex-col gap-3 px-5.5 pb-5" aria-busy="true"><span className="admin-skeleton h-10" /><span className="admin-skeleton h-10" /></div>}
        {admins && admins.length > 0 && (
          <div className="overflow-x-auto" aria-live="polite">
            <table className="admin-table">
              <thead>
                <tr><th>Account</th><th>Role</th><th>Status</th><th className="max-md:hidden">Last sign-in</th><th className="text-right"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>{admins.map((account) => <AdminRow key={account._id} account={account} onChanged={upsert} />)}</tbody>
            </table>
          </div>
        )}
        {admins && admins.length === 0 && (
          <div className="admin-empty-state"><p className="admin-empty-state__title">No teammates yet</p><p className="admin-empty-state__description">Add a sub-admin above to share the writing.</p></div>
        )}
      </section>
    </div>
  )
}

export default Users
