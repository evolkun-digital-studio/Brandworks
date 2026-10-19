import type { ReactNode } from 'react'

interface AdminPageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

function AdminPageHeader({ eyebrow, title, description, actions }: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="min-w-0">
        {eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}
        <h1 className="admin-page-title">{title}</h1>
        {description && <p className="admin-page-description">{description}</p>}
      </div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  )
}

export default AdminPageHeader
