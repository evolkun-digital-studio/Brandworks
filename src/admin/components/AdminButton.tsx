import type { ButtonHTMLAttributes, ReactNode } from 'react'

type AdminButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant
  icon?: ReactNode
}

function AdminButton({
  variant = 'secondary',
  icon,
  className = '',
  type = 'button',
  children,
  ...props
}: AdminButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={`admin-button admin-button--${variant} ${className}`}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export default AdminButton
