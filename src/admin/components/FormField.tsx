import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  error?: string
}

/** Labeled input with an optional hint and inline validation message. */
function FormField({ label, id, helperText, error, ...inputProps }: FormFieldProps) {
  const describedBy = [error ? `${id}-error` : null, helperText ? `${id}-hint` : null, inputProps['aria-describedby']]
    .filter(Boolean)
    .join(' ') || undefined

  return (
    <div className="admin-field">
      <label htmlFor={id} className="admin-form-label">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`admin-input ${error ? 'admin-input--error' : ''} ${inputProps.className ?? ''}`.trim()}
      />
      {helperText && <p id={`${id}-hint`} className="admin-form-helper mt-1.5">{helperText}</p>}
      {error && <p id={`${id}-error`} className="admin-field-error" role="alert">{error}</p>}
    </div>
  )
}

export default FormField
