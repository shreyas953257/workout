import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Icon, type IconName } from './Icon'

/**
 * Toasts.
 *
 * A module-level store rather than context: the replay engine discovers
 * achievements and unlocks deep inside the component tree, and any of them
 * should be able to announce itself without prop drilling. `useSyncExternalStore`
 * keeps React 19 concurrent rendering honest about the external subscription.
 */

export type ToastTone = 'accent' | 'good' | 'warn' | 'bad' | 'info'

export interface ToastItem {
  id: string
  title: string
  text?: string
  tone: ToastTone
  icon: IconName
  /** ms; 0 keeps it until dismissed. */
  duration: number
  /** Optional click-through, e.g. "view the achievement". */
  href?: string
  createdAt: number
}

export interface ToastInput {
  title: string
  text?: string
  tone?: ToastTone
  icon?: IconName
  duration?: number
  href?: string
}

let items: ToastItem[] = []
const listeners = new Set<() => void>()
let counter = 0

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot() {
  return items
}

export function pushToast(input: ToastInput): string {
  counter += 1
  const id = `t${counter}_${Date.now().toString(36)}`
  const toast: ToastItem = {
    id,
    title: input.title,
    text: input.text,
    tone: input.tone ?? 'accent',
    icon: input.icon ?? (input.tone === 'bad' ? 'alert-triangle' : input.tone === 'good' ? 'check-circle' : 'spark'),
    duration: input.duration ?? 5200,
    href: input.href,
    createdAt: Date.now(),
  }
  // Cap the queue so a burst of unlocks cannot bury the screen.
  items = [...items, toast].slice(-4)
  emit()
  return id
}

export function dismissToast(id: string) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function clearToasts() {
  items = []
  emit()
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/** Convenience wrappers used across the app. */
export const toast = {
  success: (title: string, text?: string) => pushToast({ title, text, tone: 'good', icon: 'check-circle' }),
  error: (title: string, text?: string) => pushToast({ title, text, tone: 'bad', icon: 'alert-triangle', duration: 8000 }),
  warn: (title: string, text?: string) => pushToast({ title, text, tone: 'warn', icon: 'alert-triangle', duration: 7000 }),
  info: (title: string, text?: string) => pushToast({ title, text, tone: 'info', icon: 'info' }),
  xp: (title: string, text?: string) => pushToast({ title, text, tone: 'accent', icon: 'spark' }),
  unlock: (title: string, text?: string, href?: string) => pushToast({ title, text, tone: 'accent', icon: 'unlock', href, duration: 8000 }),
  achievement: (title: string, text?: string, href?: string) => pushToast({ title, text, tone: 'accent', icon: 'trophy', href, duration: 8000 }),
  pr: (title: string, text?: string) => pushToast({ title, text, tone: 'good', icon: 'star' }),
}

/* -------------------------------------------------------------------------- */

function ToastCard({ item, onDismiss, onNavigate }: { item: ToastItem; onDismiss: (id: string) => void; onNavigate?: (href: string) => void }) {
  const timer = useRef<number | undefined>(undefined)
  const [leaving, setLeaving] = useState(false)

  const close = useCallback(() => {
    if (item.duration === 0) {
      onDismiss(item.id)
      return
    }
    setLeaving(true)
    window.setTimeout(() => onDismiss(item.id), 180)
  }, [item.duration, item.id, onDismiss])

  useEffect(() => {
    if (item.duration <= 0) return
    timer.current = window.setTimeout(close, item.duration)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [item.duration, close])

  const body = (
    <>
      <span className="toast__icon">
        <Icon name={item.icon} size={19} />
      </span>
      <span className="toast__body">
        <span className="toast__title">{item.title}</span>
        {item.text ? <span className="toast__text">{item.text}</span> : null}
      </span>
      <button type="button" className="iconbtn" style={{ width: 26, height: 26 }} onClick={close} aria-label={`Dismiss: ${item.title}`}>
        <Icon name="x" size={14} />
      </button>
    </>
  )

  const className = `toast toast--${item.tone} ${leaving ? 'is-leaving' : ''}`

  if (item.href && onNavigate) {
    return (
      <div
        className={className}
        role="status"
        tabIndex={0}
        style={{ cursor: 'pointer' }}
        onClick={() => {
          onNavigate(item.href!)
          onDismiss(item.id)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onNavigate(item.href!)
            onDismiss(item.id)
          }
        }}
      >
        {body}
      </div>
    )
  }

  return (
    <div className={className} role="status" aria-live="polite">
      {body}
    </div>
  )
}

export function ToastHost({ onNavigate }: { onNavigate?: (href: string) => void }) {
  const toasts = useToasts()
  if (toasts.length === 0) return null
  return (
    <div className="toast-stack" aria-live="polite" aria-relevant="additions">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onDismiss={dismissToast} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

export default ToastHost
