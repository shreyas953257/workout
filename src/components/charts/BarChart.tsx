import { axisLabel, niceScale, useMeasure } from './useMeasure'

/** Vertical or horizontal bars. Horizontal is what long labels need. */

export interface BarDatum {
  label: string
  value: number
  /** Free-form secondary text, e.g. "4 sessions". */
  meta?: string
  color?: string
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

export function BarChart({
  data,
  height = 200,
  horizontal = false,
  valueFormat = axisLabel,
  ariaLabel,
  emptyText = 'No data yet.',
  maxBars = 24,
}: {
  data: BarDatum[]
  height?: number
  horizontal?: boolean
  valueFormat?: (n: number) => string
  ariaLabel: string
  emptyText?: string
  maxBars?: number
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const rows = data.slice(0, maxBars)

  if (rows.length === 0) {
    return (
      <div ref={ref}>
        <p className="hint center" style={{ padding: 'var(--sp-6) 0' }}>
          {emptyText}
        </p>
      </div>
    )
  }

  const max = Math.max(...rows.map((r) => r.value), 1)

  /* ---- horizontal: pure HTML, so long labels wrap and stay readable ---- */
  if (horizontal) {
    return (
      <div ref={ref} className="stack-3" role="img" aria-label={ariaLabel}>
        {rows.map((r, i) => {
          const pct = (r.value / max) * 100
          return (
            <div key={`${r.label}-${i}`} className="stack-2">
              <div className="row-between tiny">
                <span className="truncate" style={{ maxWidth: '62%' }}>
                  {r.label}
                </span>
                <span className="num strong">
                  {valueFormat(r.value)}
                  {r.meta ? <span className="faint" style={{ fontWeight: 400 }}> {r.meta}</span> : null}
                </span>
              </div>
              <div className="meter meter--thin" aria-hidden>
                <div
                  className="meter__fill"
                  style={{
                    '--pct': `${Math.max(pct, r.value > 0 ? 3 : 0)}%`,
                    background: r.color ?? PALETTE[i % PALETTE.length],
                  } as React.CSSProperties}
                />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  /* ---- vertical: SVG with a value axis ---- */
  const padL = 40
  const padR = 8
  const padT = 12
  const padB = 30
  const innerW = Math.max(30, width - padL - padR)
  const innerH = Math.max(30, height - padT - padB)
  const scale = niceScale(0, max, 4)
  const slot = innerW / rows.length
  const barW = Math.max(4, Math.min(46, slot * 0.62))
  const yAt = (v: number) => padT + innerH - (v / (scale.max || 1)) * innerH
  const labelEvery = Math.max(1, Math.ceil(rows.length / Math.max(2, Math.floor(innerW / 54))))

  return (
    <div ref={ref}>
      <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <g className="chart__grid">
          {scale.ticks.map((t) => (
            <line key={t} x1={padL} x2={padL + innerW} y1={yAt(t)} y2={yAt(t)} />
          ))}
        </g>
        <g className="chart__axis">
          {scale.ticks.map((t) => (
            <text key={t} x={padL - 8} y={yAt(t) + 3.5} textAnchor="end">
              {valueFormat(t)}
            </text>
          ))}
        </g>
        {rows.map((r, i) => {
          const x = padL + slot * i + (slot - barW) / 2
          const y = yAt(r.value)
          const h = Math.max(0, padT + innerH - y)
          return (
            <g key={`${r.label}-${i}`}>
              <rect x={x} y={y} width={barW} height={h} rx={Math.min(4, barW / 2)} fill={r.color ?? PALETTE[i % PALETTE.length]}>
                <title>{`${r.label}: ${valueFormat(r.value)}${r.meta ? ` · ${r.meta}` : ''}`}</title>
              </rect>
              {i % labelEvery === 0 ? (
                <text className="chart__axis" x={x + barW / 2} y={height - 10} textAnchor="middle" fill="var(--text-faint)" fontSize={10}>
                  {r.label.length > 9 ? `${r.label.slice(0, 8)}…` : r.label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/**
 * Grouped bars for a two-series comparison (e.g. this month vs last).
 */
export function GroupedBars({
  groups,
  height = 200,
  valueFormat = axisLabel,
  ariaLabel,
}: {
  groups: { label: string; a: number; b: number }[]
  height?: number
  valueFormat?: (n: number) => string
  ariaLabel: string
}) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  if (groups.length === 0) {
    return (
      <div ref={ref}>
        <p className="hint center" style={{ padding: 'var(--sp-6) 0' }}>
          No data yet.
        </p>
      </div>
    )
  }
  const padL = 40
  const padR = 8
  const padT = 12
  const padB = 28
  const innerW = Math.max(30, width - padL - padR)
  const innerH = Math.max(30, height - padT - padB)
  const max = Math.max(...groups.flatMap((g) => [g.a, g.b]), 1)
  const scale = niceScale(0, max, 4)
  const slot = innerW / groups.length
  const barW = Math.max(4, Math.min(20, slot * 0.28))
  const yAt = (v: number) => padT + innerH - (v / (scale.max || 1)) * innerH

  return (
    <div ref={ref}>
      <svg className="chart" width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel}>
        <g className="chart__grid">
          {scale.ticks.map((t) => (
            <line key={t} x1={padL} x2={padL + innerW} y1={yAt(t)} y2={yAt(t)} />
          ))}
        </g>
        <g className="chart__axis">
          {scale.ticks.map((t) => (
            <text key={t} x={padL - 8} y={yAt(t) + 3.5} textAnchor="end">
              {valueFormat(t)}
            </text>
          ))}
        </g>
        {groups.map((g, i) => {
          const cx = padL + slot * i + slot / 2
          return (
            <g key={`${g.label}-${i}`}>
              <rect x={cx - barW - 2} y={yAt(g.a)} width={barW} height={Math.max(0, padT + innerH - yAt(g.a))} rx={3} fill="var(--chart-1)">
                <title>{`${g.label} · A: ${valueFormat(g.a)}`}</title>
              </rect>
              <rect x={cx + 2} y={yAt(g.b)} width={barW} height={Math.max(0, padT + innerH - yAt(g.b))} rx={3} fill="var(--chart-3)" opacity={0.75}>
                <title>{`${g.label} · B: ${valueFormat(g.b)}`}</title>
              </rect>
              <text x={cx} y={height - 9} textAnchor="middle" fill="var(--text-faint)" fontSize={10}>
                {g.label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default BarChart
