import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  helperText?: string
}

/** Labeled input, styled to match the site's Contact form inputs. */
function FormField({ label, id, helperText, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="admin-form-label mb-0">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className={`admin-input disabled:bg-neutral-100 disabled:text-neutral-400 ${inputProps.className ?? ''}`}
      />
      {helperText && <p className="admin-form-helper">{helperText}</p>}
    </div>
  )
}

export default FormField
