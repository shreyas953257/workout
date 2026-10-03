import { addDays, parseDateKey, startOfWeek, todayKey } from '../../lib/dates'

/**
 * Training heatmap — the "did I show up" picture.
 *
 * Level 0 means nothing was logged that day; 4 is the heaviest. The mapping from
 * sessions to levels lives in lib/analytics.ts (`heatmapData`), so this component
 * only draws what it is given and never invents activity.
 */

export interface HeatCell {
  date: string
  level: 0 | 1 | 2 | 3 | 4
  /** Accessible + tooltip text, e.g. "Tue 3 Mar · 1 workout · 42 min". */
  title: string
}

const DOW_LABELS_MON = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const DOW_LABELS_SUN = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function Heatmap({
  cells,
  weeks = 26,
  weekStartsOn = 1,
  endDate = todayKey(),
  ariaLabel = 'Training heatmap',
}: {
  cells: HeatCell[]
  weeks?: number
  weekStartsOn?: 0 | 1
  endDate?: string
  ariaLabel?: string
}) {
  const byDate = new Map(cells.map((c) => [c.date, c]))
  const last = startOfWeek(endDate, weekStartsOn)
  const first = addDays(last, -(weeks - 1) * 7)
  const today = todayKey()
  const dowLabels = weekStartsOn === 0 ? DOW_LABELS_SUN : DOW_LABELS_MON

  // Build the columns, then a month label wherever the month changes.
  const columns: HeatCell[][] = []
  const monthLabels: { index: number; label: string }[] = []
  let previousMonth = -1

  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(first, w * 7)
    const column: HeatCell[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)
      const parsed = parseDateKey(date)
      const month = parsed ? parsed.getMonth() : -1
      if (d === 0 && month !== previousMonth) {
        monthLabels.push({ index: w, label: MONTHS[month] ?? '' })
        previousMonth = month
      }
      const known = byDate.get(date)
      column.push(
        known ?? {
          date,
          level: 0,
          title: `${date} · no training logged`,
        },
      )
    }
    columns.push(column)
  }

  return (
    <div className="stack-3">
      <div style={{ overflowX: 'auto', paddingBottom: 2 }}>
        <div style={{ minWidth: weeks * 14 }}>
          <div style={{ position: 'relative', marginBottom: 4, height: 12 }}>
            {monthLabels.map((m) => (
              <span
                key={`${m.index}-${m.label}`}
                className="tiny faint"
                style={{ position: 'absolute', left: m.index * 14, top: 0, whiteSpace: 'nowrap' }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="row-tight" style={{ gap: 6, alignItems: 'flex-start' }}>
            <div className="stack-2" style={{ gap: 3, paddingTop: 0 }} aria-hidden>
              {dowLabels.map((l, i) => (
                <span key={i} className="tiny faint" style={{ height: 11, lineHeight: '11px', fontSize: 9 }}>
                  {i % 2 === 1 ? l : ''}
                </span>
              ))}
            </div>
            <div
              className="heat"
              role="img"
              aria-label={`${ariaLabel}: ${cells.filter((c) => c.level > 0).length} days with training over the last ${weeks} weeks`}
            >
              {columns.flat().map((cell) => (
                <span
                  key={cell.date}
                  className={`heat__cell ${cell.date === today ? 'is-today' : ''} ${cell.date > today ? 'is-future' : ''}`}
                  data-level={cell.level}
                  data-date={cell.date}
                  title={cell.title}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="row-between tiny faint">
        <span>{cells.filter((c) => c.level > 0).length} days trained</span>
        <span className="heat-scale">
          Less
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className="heat-scale__box"
              data-level={level}
              style={
                {
                  background:
                    level === 0
                      ? 'var(--surface-2)'
                      : `color-mix(in srgb, var(--accent) ${[26, 48, 72, 100][level - 1]}%, var(--surface-2))`,
                } as React.CSSProperties
              }
              aria-hidden
            />
          ))}
          More
        </span>
      </div>
    </div>
  )
}

export default Heatmap
