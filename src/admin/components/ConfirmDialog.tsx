import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import AdminButton from './AdminButton'

export interface ConfirmOptions {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
}

interface DialogProps extends ConfirmOptions {
  onResolve: (confirmed: boolean) => void
}

function ConfirmDialog({ title, message, confirmLabel = 'Continue', cancelLabel = 'Cancel', tone = 'primary', onResolve }: DialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
    confirmRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onResolve(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onResolve])

  return (
    <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onResolve(false) }}>
      <section className="admin-modal w-[min(100%,400px)]" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby={message ? 'confirm-message' : undefined}>
        <div>
          <h2 id="confirm-title" className="text-[17px] font-semibold tracking-[-0.016em]">{title}</h2>
          {message && <p id="confirm-message" className="mt-1.5 text-[13.5px] leading-snug text-a-ink-2">{message}</p>}
        </div>
        <div className="admin-modal__actions">
          <AdminButton onClick={() => onResolve(false)}>{cancelLabel}</AdminButton>
          <AdminButton ref={confirmRef} variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => onResolve(true)}>{confirmLabel}</AdminButton>
        </div>
      </section>
    </div>
  )
}

/** In-app replacement for window.confirm: `await confirm({...})` resolves true or false. */
export function useConfirm() {
  const [pending, setPending] = useState<{ options: ConfirmOptions; resolve: (value: boolean) => void } | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ options, resolve })),
    [],
  )

  const handleResolve = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  const dialog = pending ? <ConfirmDialog {...pending.options} onResolve={handleResolve} /> : null
  return { confirm, dialog }
}

export default ConfirmDialog
