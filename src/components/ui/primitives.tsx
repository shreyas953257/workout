import { useId, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

/* ==========================================================================
   UI primitives. Small, presentational, and free of app state — every one of
   them takes what it needs as props so pages stay readable and testable.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Card
   -------------------------------------------------------------------------- */

export interface CardProps {
  children: ReactNode
  className?: string
  title?: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  icon?: IconName
  pad?: boolean | 'tight'
  glow?: boolean
  flat?: boolean
  topline?: boolean
  interactive?: boolean
  as?: 'div' | 'section' | 'article' | 'li'
  id?: string
  style?: React.CSSProperties
}

export function Card({
  children,
  className = '',
  title,
  sub,
  actions,
  footer,
  icon,
  pad = true,
  glow,
  flat,
  topline,
  interactive,
  as: Tag = 'div',
  id,
  style,
}: CardProps) {
  // Padding always lives on the body, never on the card itself, so that a
  // header rule or a footer can run edge to edge.
  const classes = [
    'card',
    glow ? 'card--glow' : '',
    flat ? 'card--flat' : '',
    topline ? 'card--topline' : '',
    interactive ? 'card--interactive' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const bodyClass = pad === 'tight' ? 'card__body--tight' : pad === true ? 'card__body' : undefined
  const hasHead = Boolean(title || actions || icon)

  return (
    <Tag className={classes} id={id} style={style}>
      {hasHead ? (
        <div className="card__head">
          <div className="row-tight" style={{ minWidth: 0 }}>
            {icon ? <Icon name={icon} size={17} className="accent" /> : null}
            <div style={{ minWidth: 0 }}>
              <h2 className="card__title truncate">{title}</h2>
              {sub ? <p className="card__sub">{sub}</p> : null}
            </div>
          </div>
          {actions ? <div className="row-2 items-start">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClass}>{children}</div>
      {footer ? <div className="card__foot">{footer}</div> : null}
    </Tag>
  )
}

/* --------------------------------------------------------------------------
   Section heading used inside pages
   -------------------------------------------------------------------------- */

export function SectionHead({
  title,
  sub,
  actions,
  icon,
  id,
}: {
  title: ReactNode
  sub?: ReactNode
  actions?: ReactNode
  icon?: IconName
  id?: string
}) {
  return (
    <div className="row-between" id={id}>
      <div className="stack-2" style={{ minWidth: 0 }}>
        <h2 className="h4 row-tight">
          {icon ? <Icon name={icon} size={18} className="accent" /> : null}
          {title}
        </h2>
        {sub ? <p className="muted small">{sub}</p> : null}
      </div>
      {actions ? <div className="row-2">{actions}</div> : null}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Stat
   -------------------------------------------------------------------------- */

export function Stat({
  label,
  value,
  unit,
  delta,
  deltaDir,
  icon,
  hint,
  size = 'md',
}: {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  delta?: ReactNode
  deltaDir?: 'up' | 'down' | 'flat'
  icon?: IconName
  hint?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className="stat" title={hint}>
      <span className="stat__label row-tight">
        {icon ? <Icon name={icon} size={12} /> : null}
        {label}
      </span>
      <span className={`stat__value ${size === 'sm' ? 'stat__value--sm' : ''}`}>
        {value}
        {unit ? <span className="muted small" style={{ marginLeft: 4, fontWeight: 500 }}>{unit}</span> : null}
      </span>
      {delta ? (
        <span className={`stat__delta ${deltaDir === 'up' ? 'stat__delta--up' : deltaDir === 'down' ? 'stat__delta--down' : ''}`}>
          {deltaDir === 'up' ? <Icon name="trending-up" size={13} /> : deltaDir === 'down' ? <Icon name="trending-down" size={13} /> : null}
          {delta}
        </span>
      ) : null}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Chips, badges, dots
   -------------------------------------------------------------------------- */

export function Chip({
  children,
  tone = 'neutral',
  icon,
  as: Tag = 'span',
  className = '',
  ...rest
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'good' | 'warn' | 'bad' | 'info' | 'solid'
  icon?: IconName
  as?: 'span' | 'button'
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const toneClass = tone === 'neutral' ? '' : `chip--${tone}`
  return (
    <Tag className={`chip ${toneClass} ${className}`} {...(rest as object)}>
      {icon ? <Icon name={icon} size={12} /> : null}
      {children}
    </Tag>
  )
}

export function Badge({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <span className={`badge ${muted ? 'badge--muted' : ''}`}>{children}</span>
}

export function Dot({ tone }: { tone?: 'accent' | 'good' | 'warn' | 'bad' }) {
  const colour =
    tone === 'good' ? 'var(--good)' : tone === 'warn' ? 'var(--warn)' : tone === 'bad' ? 'var(--bad)' : 'var(--accent)'
  return <span className="dot" style={{ background: colour, boxShadow: `0 0 8px ${colour}` }} aria-hidden />
}

/* --------------------------------------------------------------------------
   Meter + Ring
   -------------------------------------------------------------------------- */

export function Meter({
  pct,
  tone,
  glow = true,
  height,
  label,
  valueLabel,
  ticks,
  showText = false,
}: {
  pct: number
  tone?: 'accent' | 'good' | 'warn' | 'bad'
  glow?: boolean
  height?: 'thin' | 'normal' | 'thick'
  label?: string
  valueLabel?: string
  ticks?: boolean
  showText?: boolean
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
  const toneClass = tone && tone !== 'accent' ? `meter--${tone}` : ''
  const sizeClass = height === 'thin' ? 'meter--thin' : height === 'thick' ? 'meter--thick' : ''

  const bar = (
    <div
      className={`meter ${toneClass} ${sizeClass} ${glow ? 'meter--glow' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'progress'}
    >
      <div className="meter__fill" style={{ '--pct': `${clamped}%` } as React.CSSProperties} />
      {ticks ? <div className="meter__ticks" aria-hidden /> : null}
    </div>
  )

  if (!showText) return bar

  return (
    <div className="stack-2">
      {label || valueLabel ? (
        <div className="row-between tiny">
          <span className="muted">{label}</span>
          <span className="num strong">{valueLabel}</span>
        </div>
      ) : null}
      {bar}
    </div>
  )
}

export function Ring({
  pct,
  size = 120,
  stroke = 10,
  children,
  label,
  trackOpacity = 1,
}: {
  pct: number
  size?: number
  stroke?: number
  children?: ReactNode
  label?: string
  trackOpacity?: number
}) {
  const gradientId = useId()
  const clamped = Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped / 100)

  return (
    <div
      className="ring"
      style={{ '--size': `${size}px`, '--stroke': `${stroke}px` } as React.CSSProperties}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'progress'}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="55%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent-3)" />
          </linearGradient>
        </defs>
        <circle className="ring__track" cx={size / 2} cy={size / 2} r={r} opacity={trackOpacity} />
        <circle
          className="ring__fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          style={
            {
              stroke: `url(#${gradientId.replace(/:/g, '')})`,
              '--dash': circumference,
              '--offset': offset,
            } as React.CSSProperties
          }
        />
      </svg>
      {children ? <div className="ring__center">{children}</div> : null}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Segmented control (a real radiogroup, keyboard operable)
   -------------------------------------------------------------------------- */

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: IconName
  title?: string
  disabled?: boolean
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: {
  options: readonly SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  size?: 'sm' | 'md'
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const on = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={opt.disabled}
            title={opt.title}
            className={`seg ${on ? 'is-on' : ''} ${size === 'sm' ? 'tiny' : ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
              e.preventDefault()
              const enabled = options.filter((o) => !o.disabled)
              const i = enabled.findIndex((o) => o.value === value)
              const next = enabled[(i + (e.key === 'ArrowRight' ? 1 : enabled.length - 1)) % enabled.length]
              if (next) onChange(next.value)
            }}
          >
            {opt.icon ? <Icon name={opt.icon} size={13} style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 5 }} /> : null}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Form fields
   -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className = '',
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  children: ReactNode
  htmlFor?: string
  className?: string
}) {
  return (
    <div className={`field ${className}`}>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <span className="error-text" role="alert">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="row-between" style={{ gap: 'var(--sp-4)' }}>
      <div className="stack-2" style={{ minWidth: 0 }}>
        <label className="small strong" htmlFor={id} style={{ cursor: disabled ? 'default' : 'pointer' }}>
          {label}
        </label>
        {hint ? <span className="hint">{hint}</span> : null}
      </div>
      <span className="switch" style={{ flex: 'none' }}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="switch__track" aria-hidden>
          <span className="switch__thumb" />
        </span>
      </span>
    </div>
  )
}

/** A number input that never lets a negative or absurd value escape. */
export function NumberInput({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
  ariaLabel,
  className = '',
  disabled,
}: {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  ariaLabel: string
  className?: string
  disabled?: boolean
}) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))

  return (
    <div className={`row-tight ${className}`} style={{ gap: 4 }}>
      <button
        type="button"
        className="iconbtn"
        aria-label={`Decrease ${ariaLabel}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
      >
        <Icon name="minus" size={15} />
      </button>
      <div className="searchbar" style={{ flex: '1 1 62px', minWidth: 62 }}>
        <input
          className="input input--num"
          style={{ paddingRight: suffix ? 30 : 10, minHeight: 34 }}
          type="number"
          inputMode="decimal"
          aria-label={ariaLabel}
          value={Number.isFinite(value) ? value : ''}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value
            if (raw === '') {
              onChange(min)
              return
            }
            const n = Number(raw)
            if (Number.isFinite(n)) onChange(clamp(Math.round(n * 100) / 100))
          }}
        />
        {suffix ? (
          <span className="faint tiny" style={{ position: 'absolute', right: 9, pointerEvents: 'none' }}>
            {suffix}
          </span>
        ) : null}
      </div>
      <button
        type="button"
        className="iconbtn"
        aria-label={`Increase ${ariaLabel}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + step))}
      >
        <Icon name="plus" size={15} />
      </button>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Empty state, skeleton, divider
   -------------------------------------------------------------------------- */

export function Empty({
  icon = 'info',
  title,
  text,
  action,
}: {
  icon?: IconName
  title: ReactNode
  text?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={24} />
      </span>
      <p className="empty__title">{title}</p>
      {text ? <p className="empty__text">{text}</p> : null}
      {action ? <div className="row-2" style={{ justifyContent: 'center' }}>{action}</div> : null}
    </div>
  )
}

export function Skeleton({ w, h = 14, r }: { w?: number | string; h?: number; r?: number }) {
  return <div className="skeleton" style={{ width: w ?? '100%', height: h, borderRadius: r }} aria-hidden />
}

export function Divider({ vertical }: { vertical?: boolean }) {
  return vertical ? <span className="divider-v" aria-hidden /> : <hr className="divider" aria-hidden />
}

/* --------------------------------------------------------------------------
   Key/value list
   -------------------------------------------------------------------------- */

export function KeyValue({ rows }: { rows: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl className="kv">
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt className="kv__k">{row.k}</dt>
          <dd className="kv__v" style={{ margin: 0 }}>{row.v}</dd>
        </div>
      ))}
    </dl>
  )
}

/* --------------------------------------------------------------------------
   Locked overlay — used by gated programmes, variations and themes
   -------------------------------------------------------------------------- */

export function LockNote({ requirement, icon = 'lock' }: { requirement: string; icon?: IconName }) {
  return (
    <span className="chip chip--warn" title={requirement}>
      <Icon name={icon} size={12} />
      {requirement}
    </span>
  )
}
