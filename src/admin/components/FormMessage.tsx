import type { ReactNode } from 'react'

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
      className={`rounded-[8px] border px-4 py-3 text-[14px] leading-[1.4] ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {children}
    </div>
  )
}

export default FormMessage
