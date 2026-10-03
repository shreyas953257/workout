import { useMeasure } from './useMeasure'

/** Donut chart with a legend — used for muscle-group and pattern splits. */

export interface DonutSlice {
  label: string
  value: number
  color?: string
  /** Short caption under the label in the legend, e.g. "32%". */
  meta?: string
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

export function Donut({
  slices,
  size = 168,
  thickness = 18,
  centerValue,
  centerLabel,
  ariaLabel,
  legend = true,
  emptyText = 'No data yet.',
}: {
  slices: DonutSlice[]
  size?: number
  thickness?: number
  centerValue?: string
  centerLabel?: string
  ariaLabel: string
  legend?: boolean
  emptyText?: string
}) {
  const { ref } = useMeasure<HTMLDivElement>()
  const usable = slices.filter((s) => Number.isFinite(s.value) && s.value > 0)
  const total = usable.reduce((n, s) => n + s.value, 0)

  if (usable.length === 0 || total <= 0) {
    return (
      <div ref={ref} className="center hint" style={{ padding: 'var(--sp-6) 0' }}>
        {emptyText}
      </div>
    )
  }

  const r = (size - thickness) / 2
  const circumference = 2 * Math.PI * r
  let consumed = 0

  const segments = usable.map((s, i) => {
    const fraction = s.value / total
    const dash = fraction * circumference
    const offset = -consumed
    consumed += dash
    return {
      slice: s,
      color: s.color ?? PALETTE[i % PALETTE.length],
      dash,
      offset,
      fraction,
    }
  })

  return (
    <div ref={ref} className="row" style={{ gap: 'var(--sp-5)', alignItems: 'center' }}>
      <div className="ring" style={{ '--size': `${size}px`, '--stroke': `${thickness}px` } as React.CSSProperties}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={ariaLabel}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={thickness} />
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            {segments.map((seg, i) => (
              <circle
                key={`${seg.slice.label}-${i}`}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                strokeDashoffset={seg.offset}
                strokeLinecap="butt"
              >
                <title>{`${seg.slice.label}: ${Math.round(seg.fraction * 100)}%`}</title>
              </circle>
            ))}
          </g>
        </svg>
        {centerValue || centerLabel ? (
          <div className="ring__center">
            {centerValue ? <span className="h4 num">{centerValue}</span> : null}
            {centerLabel ? <span className="eyebrow">{centerLabel}</span> : null}
          </div>
        ) : null}
      </div>

      {legend ? (
        <div className="stack-2 grow" style={{ minWidth: 130 }}>
          {segments
            .slice()
            .sort((a, b) => b.slice.value - a.slice.value)
            .map((seg, i) => (
              <div key={`${seg.slice.label}-${i}`} className="row-between tiny" style={{ gap: 'var(--sp-3)' }}>
                <span className="row-tight truncate" style={{ gap: 7 }}>
                  <span className="chart-legend__swatch" style={{ background: seg.color }} />
                  <span className="truncate">{seg.slice.label}</span>
                </span>
                <span className="num muted" style={{ flex: 'none' }}>
                  {seg.slice.meta ?? `${Math.round(seg.fraction * 100)}%`}
                </span>
              </div>
            ))}
        </div>
      ) : null}
    </div>
  )
}

export default Donut
