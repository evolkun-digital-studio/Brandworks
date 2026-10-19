import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface AdminIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
}

const AdminIconButton = forwardRef<HTMLButtonElement, AdminIconButtonProps>(function AdminIconButton(
  { label, className = '', children, ...props },
  ref,
) {
  return (
    <button
      {...props}
      ref={ref}
      type={props.type ?? 'button'}
      aria-label={label}
      title={label}
      className={`admin-icon-button ${className}`}
    >
      {children}
    </button>
  )
})

AdminIconButton.displayName = 'AdminIconButton'

export default AdminIconButton
