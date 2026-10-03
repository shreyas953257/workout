import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from './Icon'

/**
 * An accessible dialog.
 *
 * Portalled to <body> so no ancestor transform or overflow can clip it, locked
 * against background scroll, closed by Escape or a backdrop click, and focused
 * on open with focus returned to whatever opened it. Focus is kept inside while
 * it is open — Tab from the last control wraps to the first.
 */

export interface ModalProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  sub?: ReactNode
  icon?: IconName
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Clicking the backdrop closes it. Off for destructive confirmations. */
  dismissible?: boolean
}

export function Modal({ open, onClose, title, sub, icon, children, footer, wide, dismissible = true }: ModalProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<Element | null>(null)

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (dismissible) {
          e.stopPropagation()
          onClose()
        }
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [dismissible, onClose],
  )

  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKey, true)

    // Move focus into the dialog after it paints.
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current
      if (!panel) return
      const autofocus = panel.querySelector<HTMLElement>('[data-autofocus]')
      const first = panel.querySelector<HTMLElement>(
        'input:not([type="hidden"]), textarea, select, button:not([disabled]), a[href]',
      )
      ;(autofocus ?? first ?? panel).focus()
    })

    return () => {
      cancelAnimationFrame(raf)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey, true)
      const back = restoreTo.current
      if (back instanceof HTMLElement && document.contains(back)) back.focus()
    }
  }, [open, handleKey])

  if (!open) return null

  return createPortal(
    <div
      className="modal-backdrop"
      onPointerDown={(e) => {
        if (dismissible && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`modal ${wide ? 'modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
      >
        <div className="modal__head">
          <div className="row-tight" style={{ minWidth: 0 }}>
            {icon ? (
              <span className="empty__icon" style={{ width: 34, height: 34, borderRadius: 10 }}>
                <Icon name={icon} size={17} className="accent" />
              </span>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <h2 className="h5" id={titleId}>
                {title}
              </h2>
              {sub ? <p className="hint">{sub}</p> : null}
            </div>
          </div>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Close dialog">
            <Icon name="x" size={17} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

/**
 * A confirmation dialog for destructive actions. Nothing is deleted until the
 * user confirms, and the confirm button is the one that receives focus.
 */
export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  icon,
  children,
}: {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  icon?: IconName
  children?: ReactNode
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      icon={icon ?? (danger ? 'alert-triangle' : 'help-circle')}
      dismissible
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            data-autofocus
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="stack-3">
        <p className="muted">{message}</p>
        {children}
      </div>
    </Modal>
  )
}

export default Modal
