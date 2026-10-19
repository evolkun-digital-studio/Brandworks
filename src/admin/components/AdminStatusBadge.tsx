import type { ReactNode } from 'react'

type AdminStatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent'

interface AdminStatusBadgeProps {
  children: ReactNode
  tone?: AdminStatusTone
  dot?: boolean
}

function AdminStatusBadge({ children, tone = 'neutral', dot = true }: AdminStatusBadgeProps) {
  return (
    <span className={`admin-status admin-status--${tone}`}>
      {dot && <span className="admin-status__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export default AdminStatusBadge
