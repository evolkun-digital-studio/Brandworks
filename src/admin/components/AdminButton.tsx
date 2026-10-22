import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react'

type AdminButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
type AdminButtonSize = 'sm' | 'md' | 'lg'

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant
  size?: AdminButtonSize
  icon?: ReactNode
  ref?: Ref<HTMLButtonElement>
}

function AdminButton({
  variant = 'secondary',
  size = 'md',
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
      className={`admin-button admin-button--${variant}${size === 'md' ? '' : ` admin-button--${size}`} ${className}`.trim()}
    >
      {icon}
      {children != null && <span>{children}</span>}
    </button>
  )
}

export default AdminButton
