import type { InputHTMLAttributes } from 'react'

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
}

/** Labeled input, styled to match the site's Contact form inputs. */
function FormField({ label, id, ...inputProps }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-[14px] font-medium text-neutral-900">
        {label}
      </label>
      <input
        id={id}
        {...inputProps}
        className="w-full rounded-[10px] border border-neutral-300 px-4 py-2.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-400"
      />
    </div>
  )
}

export default FormField
