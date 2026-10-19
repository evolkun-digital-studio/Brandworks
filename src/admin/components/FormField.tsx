import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
  error?: string
}

/** Labeled input, styled to match the site's Contact form inputs. */
function FormField({ label, id, helperText, error, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="admin-form-label mb-0">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : inputProps['aria-describedby']}
        className={`admin-input disabled:bg-neutral-100 disabled:text-neutral-400 ${error ? 'admin-input--error' : ''} ${inputProps.className ?? ''}`}
      />
      {helperText && <p className="admin-form-helper">{helperText}</p>}
      {error && <p id={`${id}-error`} className="admin-field-error" role="alert">{error}</p>}
    </div>
  )
}

export default FormField
