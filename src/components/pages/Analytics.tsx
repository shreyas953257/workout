import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, Chip, Empty, SectionHead, Segmented, Stat } from '../ui/primitives'
import { BarChart, Donut, GroupedBars, LineChart, Sparkline } from '../charts'
import { ExerciseHistory } from '../workout/ExerciseBits'
import { RecordCard } from '../gamification/Records'
import { useAppState } from '../../lib/store'
import { EXERCISE_MAP, getExercise } from '../../data/exercises'
import {
  exerciseProgression,
  frequencyStats,
  muscleDistribution,
  patternDistribution,
  periodDelta,
  progressionCandidates,
  recordsSummary,
  seriesChange,
  timeOfDayDistribution,
  volumeProgression,
  weekdayDistribution,
  xpProgression,
  dailyCumulativeXp,
} from '../../lib/analytics'
import { topRecords } from '../../lib/prs'
import { formatDate, todayKey } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'

type Window = '30' | '90' | '365' | 'all'

const WINDOWS: { value: Window; label: string }[] = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
  { value: 'all', label: 'All' },
]

function num(n: number, digits = 0): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits })
}

/** Charts, all built from logged sessions. If there is not enough data, say so. */

export function Analytics() {
  const { data, progress } = useAppState()
  const [window_, setWindow] = useState<Window>('90')
  const [exerciseId, setExerciseId] = useState<string>(() => progressionCandidates(data.sessions, 1)[0]?.id ?? '')
  const units = data.profile.units

  const sessions = useMemo(() => {
    if (window_ === 'all') return data.sessions
    const cutoff = new Date(Date.now() - (Number(window_) - 1) * 86400000).toISOString().slice(0, 10)
    return data.sessions.filter((s) => (s.date || '') >= cutoff)
  }, [data.sessions, window_])

  const delta = useMemo(() => periodDelta(data.sessions, Number(window_) || 365), [data.sessions, window_])
  const freq = useMemo(() => frequencyStats(sessions, data.preferences.weekStartsOn), [sessions, data.preferences.weekStartsOn])
  const volume = useMemo(() => volumeProgression(sessions), [sessions])
  const xpSeries = useMemo(() => (window_ === 'all' ? dailyCumulativeXp(progress.xpByDay) : xpProgression(progress.xpEvents)), [window_, progress.xpByDay, progress.xpEvents])
  const muscles = useMemo(() => muscleDistribution(sessions), [sessions])
  const patterns = useMemo(() => patternDistribution(sessions), [sessions])
  const weekdays = useMemo(() => weekdayDistribution(sessions, data.preferences.weekStartsOn), [sessions, data.preferences.weekStartsOn])
  const times = useMemo(() => timeOfDayDistribution(sessions), [sessions])
  const candidates = useMemo(() => progressionCandidates(data.sessions, 14), [data.sessions])
  const records = useMemo(() => topRecords(progress.prs, 8), [progress.prs])
  const summary = useMemo(() => recordsSummary(progress.prs), [progress.prs])
  const chosen = exerciseId ? getExercise(exerciseId) : undefined
  const progression = useMemo(() => (exerciseId ? exerciseProgression(sessions, exerciseId, 'weight') : []), [sessions, exerciseId])
  const change = useMemo(() => seriesChange(progression), [progression])

  const volumeBars = useMemo(() => {
    const byWeek = new Map<string, { label: string; value: number; sets: number }>()
    for (const s of sessions) {
      const key = s.date || todayKey()
      const label = formatDate(key, 'short')
      const cur = byWeek.get(label) ?? { label, value: 0, sets: 0 }
      cur.value += s.volumeKg || 0
      cur.sets += s.completedSets || 0
      byWeek.set(label, cur)
    }
    return [...byWeek.values()].slice(-20)
  }, [sessions])

  const rpeTrend = useMemo(() => {
    const points = sessions
      .map((s) => {
        const rpes = s.exercises.flatMap((l) => l.sets.filter((x) => x.completed && x.rpe).map((x) => x.rpe as number))
        const avg = rpes.length > 0 ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null
        return avg ? { label: formatDate(s.date, 'short'), value: Math.round(avg * 10) / 10, meta: s.title } : null
      })
      .filter(Boolean) as { label: string; value: number; meta: string }[]
    return points.slice(-30)
  }, [sessions])

  const weekly = useMemo(() => progress.weekly.slice(-12), [progress.weekly])

  const empty = data.sessions.length === 0

  return (
    <div className="page">
      <SectionHead
        icon="chart"
        title="Analytics"
        sub="Every chart here reads your own log. No projections, no filler — where there is not enough data, it says so."
        actions={
          <Segmented ariaLabel="Time window" options={WINDOWS} value={window_} onChange={(v) => setWindow(v as Window)} />
        }
      />

      {empty ? (
        <Card>
          <Empty
            icon="chart"
            title="No data to chart yet"
            text="Analytics need logged sessions. Finish one workout and this page fills in with volume, frequency, distribution and progression charts."
            action={
              <Link to="/workouts" className="btn btn--primary btn--sm">
                Start a workout
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid-4">
            <Stat
              label={`Workouts (${window_ === 'all' ? 'all time' : `last ${window_}d`})`}
              value={sessions.length}
              icon="dumbbell"
              delta={delta.workouts.pct !== null ? `${delta.workouts.pct > 0 ? '+' : ''}${delta.workouts.pct}%` : undefined}
              deltaDir={delta.workouts.pct === null ? undefined : delta.workouts.pct > 0 ? 'up' : delta.workouts.pct < 0 ? 'down' : 'flat'}
              hint="Change against the previous equal-length window"
            />
            <Stat label="Volume" value={num(sessions.reduce((n, s) => n + s.volumeKg, 0))} unit={units} icon="layers" />
            <Stat label="Sets" value={num(sessions.reduce((n, s) => n + s.completedSets, 0))} icon="repeat" />
            <Stat label="Time" value={formatDuration(sessions.reduce((n, s) => n + s.durationMin, 0))} icon="clock" />
          </div>

          <div className="grid-2">
            <Card
              title="Session volume over time"
              icon="layers"
              sub={volume.length > 1 ? `${volume.length} sessions · ${seriesChange(volume)?.pct ?? 0}% change across this window` : 'Needs at least two sessions'}
            >
              <LineChart
                series={[{ name: `Volume (${units})`, points: volume.map((p) => ({ label: p.label, value: p.value, meta: p.secondary ? String(p.secondary) : undefined })) }]}
                height={230}
                area
                ariaLabel={`Session volume in ${units} across ${volume.length} sessions`}
                emptyText="Log another session to see a trend line."
              />
            </Card>
            <Card title="XP earned" icon="spark" sub={`${progress.xp.toLocaleString()} XP total · level ${progress.level.level} ${progress.level.title}`}>
              <LineChart
                series={[{ name: 'Cumulative XP', points: xpSeries.map((p) => ({ label: p.label, value: p.value, meta: p.secondary ? String(p.secondary) : undefined })), color: 'var(--accent)' }]}
                height={230}
                area
                ariaLabel="Cumulative XP over time"
                emptyText="No XP yet — this fills in as you log sessions."
              />
            </Card>
          </div>

          <Card title="Volume per training day" icon="bar-chart" sub={`${volumeBars.length} training days in this window${freq.perActiveWeek ? ` · ${freq.perActiveWeek.toFixed(1)} sessions per active week` : ''}`}>
            <BarChart data={volumeBars.map((v) => ({ label: v.label, value: Math.round(v.value), meta: `${v.sets} sets` }))} height={200} ariaLabel="Volume lifted per training day" />
          </Card>

          <div className="grid-2">
            <Card title="Muscles trained" icon="pie-chart" sub="Share of completed sets by primary muscle group">
              <Donut
                slices={muscles.slice(0, 6).map((m) => ({ label: m.label, value: m.value, meta: `${m.value} sets` }))}
                centerValue={String(muscles.reduce((n, m) => n + m.value, 0))}
                centerLabel="sets"
                ariaLabel="Distribution of completed sets by muscle group"
              />
            </Card>
            <Card title="Movement patterns" icon="pie-chart" sub="Balance between squat, hinge, push, pull and the rest">
              {patterns.length === 0 ? (
                <Empty icon="pie-chart" title="Nothing to show" text="No completed sets in this window." />
              ) : (
                <Donut
                  slices={patterns.map((p) => ({ label: p.label, value: p.value, meta: `${p.value} sets` }))}
                  centerValue={String(patterns.reduce((n, p) => n + p.value, 0))}
                  centerLabel="sets"
                  ariaLabel="Distribution of completed sets by movement pattern"
                />
              )}
            </Card>
          </div>

          <div className="grid-2">
            <Card title="Which days you train" icon="calendar" sub={`Scheduled rest days are not failures — the bar shows what actually happened`}>
              <BarChart data={weekdays.map((w) => ({ label: w.label, value: w.value, meta: `${w.secondary ?? 0} sets` }))} height={190} ariaLabel="Sessions by weekday" />
            </Card>
            <Card title="Time of day" icon="clock" sub="Derived from each session's start time">
              <BarChart data={times.map((t) => ({ label: t.label, value: t.value, meta: `${t.secondary ?? 0} sets` }))} height={190} ariaLabel="Sessions by time of day" />
            </Card>
          </div>

          <Card title="Weekly consistency" icon="bar-chart" sub="Sessions and sets, per week">
            {weekly.length < 2 ? (
              <Empty icon="bar-chart" title="One week is not a trend" text="Come back after a second training week." />
            ) : (
              <GroupedBars
                groups={weekly.map((w) => ({ label: w.label, a: w.workouts, b: Math.round(w.sets / 5) }))}
                height={210}
                ariaLabel="Sessions and scaled set count per week"
              />
            )}
          </Card>

          <Card title="Average RPE per session" icon="trending-up" sub="Only shown for sessions where you logged an RPE">
            {rpeTrend.length < 2 ? (
              <Empty icon="trending-up" title="Not enough RPE data" text="Log an RPE on your sets and this shows how hard the sessions really were." />
            ) : (
              <LineChart
                series={[{ name: 'Average RPE', points: rpeTrend, color: 'var(--warn)' }]}
                height={200}
                zeroBased={false}
                ariaLabel="Average reported RPE per session"
              />
            )}
          </Card>

          <Card
            title="Exercise progression"
            icon="trending-up"
            sub={
              chosen
                ? `${progression.length} sessions with recorded sets${change ? ` · ${change.delta > 0 ? '+' : ''}${change.delta}${units} (${change.pct ?? 0}%)` : ''}`
                : 'Pick an exercise'
            }
            actions={
              candidates.length > 0 ? (
                <select className="input input--sm" value={exerciseId} aria-label="Choose an exercise to chart" onChange={(e) => setExerciseId(e.target.value)}>
                  {candidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.sessions})
                    </option>
                  ))}
                </select>
              ) : null
            }
          >
            {candidates.length === 0 ? (
              <Empty icon="trending-up" title="Nothing to plot yet" text="You need to log the same exercise twice before a progression chart means anything." />
            ) : chosen ? (
              <div className="stack-4">
                <LineChart
                  series={[{ name: 'Top set weight', points: progression.map((p) => ({ label: p.label, value: p.value, meta: p.secondary ? String(p.secondary) : undefined })) }]}
                  height={200}
                  area
                  smooth
                  zeroBased={false}
                  ariaLabel={`Top set weight for ${chosen.name} over time`}
                />
                <div className="row-2">
                  <Chip icon="dumbbell">{chosen.muscles.slice(0, 2).join(' · ')}</Chip>
                  <Link to={`/exercises/${chosen.id}`} className="btn btn--quiet btn--sm">
                    Full history for {chosen.name}
                  </Link>
                </div>
              </div>
            ) : null}
          </Card>

          {chosen ? <ExerciseHistory exercise={chosen} sessions={data.sessions} units={units} showE1rm={progress.unlockedIds.includes('feature:e1rm')} /> : null}

          <section className="stack-3" aria-labelledby="records">
            <SectionHead
              id="records"
              icon="trophy"
              title="Personal records"
              sub={
                summary.count > 0
                  ? `${summary.count} exercises with a record · strongest ${summary.strongest?.name ?? '—'}${summary.strongest ? ` (${summary.strongest.detail})` : ''}`
                  : 'No records yet'
              }
              actions={<Link to="/achievements" className="btn btn--quiet btn--sm">Achievements</Link>}
            />
            {records.length === 0 ? (
              <Card>
                <Empty icon="trophy" title="No records yet" text="A record is logged the first time you beat a previous best on an exercise — never on your very first session with it." />
              </Card>
            ) : (
              <div className="auto-grid" style={{ '--min': '250px' } as React.CSSProperties}>
                {records.map((r) => (
                  <RecordCard key={r.exerciseId} record={r} units={units} />
                ))}
              </div>
            )}
          </section>

          <Card title="Records by measurement" icon="info" sub="Only exercises you have actually trained appear here">
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th className="num">Exercises</th>
                    <th>Example</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.byUnit).map(([unit, count]) => (
                    <tr key={unit}>
                      <td>{unit}</td>
                      <td className="num">{count}</td>
                      <td className="tiny faint">
                        {EXERCISE_MAP[records[0]?.exerciseId ?? '']?.name ?? '—'}
                      </td>
                    </tr>
                  ))}
                  {Object.keys(summary.byUnit).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="faint">
                        Nothing recorded yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Sparkline summary" icon="bar-chart" sub="One line per metric, so you can see direction at a glance">
            <div className="stack-4">
              {[
                { label: 'Volume', points: volume.slice(-14) },
                { label: 'XP', points: xpSeries.slice(-14) },
                { label: 'Sessions per week', points: weekly.map((w) => ({ label: w.label, value: w.workouts })) },
              ].map((row) => (
                <div key={row.label} className="row-between" style={{ gap: 'var(--sp-3)' }}>
                  <span className="small">{row.label}</span>
                  {row.points.length > 1 ? (
                    <Sparkline values={row.points.map((p) => p.value)} height={36} fill ariaLabel={`${row.label} trend sparkline`} />
                  ) : (
                    <span className="tiny faint">not enough data</span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <p className="tiny faint center">
            Window: {window_ === 'all' ? 'everything you have logged' : `the last ${window_} days`} · {sessions.length} of {data.sessions.length}{' '}
            {pluralize(data.sessions.length, 'session')} · {candidates.length} exercises with enough history to chart
          </p>
        </>
      )}
    </div>
  )
}

export default Analytics
