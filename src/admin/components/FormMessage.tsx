import type { ReactNode } from 'react'
import { CheckCircle2, TriangleAlert } from 'lucide-react'

interface FormMessageProps {
  type: 'error' | 'success'
  children: ReactNode
}

/** Small inline banner for form-level success/error feedback. */
function FormMessage({ type, children }: FormMessageProps) {
  const isError = type === 'error'
  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`admin-form-message admin-form-message--${type}`}
    >
      {isError ? <TriangleAlert size={17} aria-hidden="true" /> : <CheckCircle2 size={17} aria-hidden="true" />}
      {children}
    </div>
  )
}

export default FormMessage
