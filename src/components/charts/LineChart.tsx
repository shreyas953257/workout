import { useState } from 'react'
import { axisLabel, niceScale, smoothPath, useMeasure } from './useMeasure'

/**
 * Line / area chart.
 *
 * Hand-rolled SVG rather than a chart library: no dependency, no CDN, works
 * offline, and the styling comes from the same CSS custom properties the rest
 * of the app uses — so a theme change repaints the charts too.
 */

export interface ChartPoint {
  /** Label used on the axis and in the tooltip. */
  label: string
  value: number
  /** Optional secondary value shown in the tooltip, e.g. set count. */
  meta?: string
}

export interface ChartSeries {
  name: string
  color?: string
  points: ChartPoint[]
}

export interface LineChartProps {
  series: ChartSeries[]
  height?: number
  /** Fill under the first series. */
  area?: boolean
  /** Curve the line. Off for step-like data such as levels. */
  smooth?: boolean
  /** Start the y-axis at zero instead of fitting the data. */
  zeroBased?: boolean
  yFormat?: (n: number) => string
  /** Show at most this many x labels, evenly spaced. */
  xTicks?: number
  showDots?: boolean
  ariaLabel: string
  emptyText?: string
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)']

export function LineChart({
  series,
  height = 220,
  area = true,
  smooth = true,
  zeroBased = true,
  yFormat = axisLabel,
  xTicks = 6,
  showDots = true,
  ariaLabel,
  emptyText = 'Nothing to chart yet.',
}: LineChartProps) {
  const { ref, width } = useMeasure<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const usable = series.filter((s) => s.points.length > 0)
  const padL = 42
  const padR = 12
  const padT = 14
  const padB = 26
  const innerW = Math.max(40, width - padL - padR)
  const innerH = Math.max(40, height - padT - padB)

  if (usable.length === 0) {
    return (
      <div ref={ref}>
        <p className="hint center" style={{ padding: 'var(--sp-6) 0' }}>
          {emptyText}
        </p>
      </div>
    )
  }

  const longest = usable.reduce((n, s) => Math.max(n, s.points.length), 0)
  const allValues = usable.flatMap((s) => s.points.map((p) => p.value)).filter((v) => Number.isFinite(v))
  const dataMin = allValues.length ? Math.min(...allValues) : 0
  const dataMax = allValues.length ? Math.max(...allValues) : 1
  const scale = niceScale(zeroBased ? Math.min(0, dataMin) : dataMin, dataMax, 4)

  const xAt = (i: number) => (longest <= 1 ? padL + innerW / 2 : padL + (i / (longest - 1)) * innerW)
  const yAt = (v: number) => padT + innerH - ((v - scale.min) / (scale.max - scale.min || 1)) * innerH

  const labelEvery = Math.max(1, Math.ceil(longest / xTicks))
  const labels = usable[0].points

  // The hover hit-area is one column wide, so a touch anywhere near a point
  // selects it.
  const columnW = longest > 1 ? innerW / (longest - 1) : innerW

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <svg
        className="chart"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - box.left - padL
          const index = Math.round(x / (columnW || 1))
          setHover(Math.max(0, Math.min(longest - 1, index)))
        }}
      >
        <defs>
          <linearGradient id="lcArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={usable[0].color ?? 'var(--chart-1)'} stopOpacity="0.34" />
            <stop offset="100%" stopColor={usable[0].color ?? 'var(--chart-1)'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid + y axis */}
        <g className="chart__grid">
          {scale.ticks.map((t) => (
            <line key={t} x1={padL} x2={padL + innerW} y1={yAt(t)} y2={yAt(t)} />
          ))}
        </g>
        <g className="chart__axis">
          {scale.ticks.map((t) => (
            <text key={t} x={padL - 8} y={yAt(t) + 3.5} textAnchor="end">
              {yFormat(t)}
            </text>
          ))}
          {labels.map((p, i) =>
            i % labelEvery === 0 || i === longest - 1 ? (
              <text key={`${p.label}-${i}`} x={xAt(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === longest - 1 ? 'end' : 'middle'}>
                {p.label}
              </text>
            ) : null,
          )}
        </g>

        {/* series */}
        {usable.map((s, si) => {
          const colour = s.color ?? PALETTE[si % PALETTE.length]
          const pts = s.points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }))
          const d = smooth ? smoothPath(pts) : `M ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')}`
          const areaD = `${d} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`
          return (
            <g key={s.name}>
              {area && si === 0 && pts.length > 1 ? <path className="chart__area" d={areaD} fill="url(#lcArea)" /> : null}
              <path d={d} fill="none" stroke={colour} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              {showDots && pts.length <= 60
                ? pts.map((p, i) => (
                    <circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={hover === i ? 4.6 : 2.8}
                      fill="var(--bg)"
                      stroke={colour}
                      strokeWidth={2}
                      style={{ transition: 'r 120ms var(--ease-out)' }}
                    />
                  ))
                : null}
            </g>
          )
        })}

        {/* hover rule */}
        {hover !== null && hover < longest ? (
          <line x1={xAt(hover)} x2={xAt(hover)} y1={padT} y2={padT + innerH} stroke="var(--line-strong)" strokeWidth={1} strokeDasharray="3 3" />
        ) : null}
      </svg>

      {hover !== null && hover < longest ? (
        <div
          className="panel"
          style={{
            position: 'absolute',
            left: Math.min(Math.max(xAt(hover) - 70, 0), Math.max(0, width - 150)),
            top: 0,
            padding: '6px 10px',
            pointerEvents: 'none',
            minWidth: 120,
            background: 'color-mix(in srgb, var(--bg-2) 94%, transparent)',
          }}
          role="status"
        >
          <div className="tiny faint upper">{labels[hover]?.label}</div>
          {usable.map((s, si) => (
            <div key={s.name} className="row-tight tiny" style={{ justifyContent: 'space-between', gap: 12 }}>
              <span className="row-tight" style={{ gap: 5 }}>
                <span className="chart-legend__swatch" style={{ background: s.color ?? PALETTE[si % PALETTE.length] }} />
                {usable.length > 1 ? s.name : ''}
              </span>
              <span className="num strong">
                {s.points[hover] ? yFormat(s.points[hover].value) : '—'}
                {s.points[hover]?.meta ? <span className="faint"> {s.points[hover].meta}</span> : null}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {usable.length > 1 ? (
        <div className="chart-legend" style={{ marginTop: 'var(--sp-2)' }}>
          {usable.map((s, si) => (
            <span key={s.name} className="chart-legend__item">
              <span className="chart-legend__swatch" style={{ background: s.color ?? PALETTE[si % PALETTE.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function Sparkline({
  values,
  height = 34,
  color = 'var(--accent)',
  ariaLabel,
  fill = true,
}: {
  values: number[]
  height?: number
  color?: string
  ariaLabel: string
  fill?: boolean
}) {
  const { ref, width } = useMeasure<HTMLDivElement>(200)
  const clean = values.filter((v) => Number.isFinite(v))
  if (clean.length < 2) {
    return (
      <div ref={ref} className="sparkline" aria-hidden>
        <svg width={width} height={height}>
          <line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke="var(--line)" strokeWidth={1.5} strokeDasharray="3 4" />
        </svg>
      </div>
    )
  }
  const min = Math.min(...clean, 0)
  const max = Math.max(...clean, 1)
  const pad = 3
  const xAt = (i: number) => (i / (clean.length - 1)) * width
  const yAt = (v: number) => pad + (height - pad * 2) * (1 - (v - min) / (max - min || 1))
  const pts = clean.map((v, i) => ({ x: xAt(i), y: yAt(v) }))
  const d = smoothPath(pts, 0.22)

  return (
    <div ref={ref} className="sparkline" role="img" aria-label={ariaLabel}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {fill ? <path d={`${d} L ${width} ${height} L 0 ${height} Z`} fill={color} opacity={0.14} /> : null}
        <path d={d} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={2.6} fill={color} />
      </svg>
    </div>
  )
}

export default LineChart
