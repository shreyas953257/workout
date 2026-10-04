import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Empty } from '../ui/primitives'
import { LineChart } from '../charts'
import {
  COOLDOWN,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  PAIN_TRIAGE,
  PATTERN_LABELS,
  TIER_LABELS,
  WARMUP_MENUS,
  getExercise,
  substitutedBy,
  substitutionsFor,
} from '../../data/exercises'
import { UNLOCK_MAP } from '../../data/unlocks'
import { unlockRequirementText } from '../../lib/unlocks'
import { exerciseProgression, seriesChange, type ProgressionMetric, type SeriesPoint } from '../../lib/analytics'
import { formatDate } from '../../lib/dates'
import { formatWeight } from '../../lib/format'
import { getExerciseImageUrl, handleExerciseImageError } from '../../lib/exerciseImages'
import type { Exercise, MovementPattern, WorkoutSession } from '../../types'

/** Everything the exercise detail page renders: coaching, substitutions, history. */

const MENU_FOR_PATTERN: Record<MovementPattern, string> = {
  squat: 'lower',
  'unilateral-leg': 'lower',
  hinge: 'hinge',
  'push-horizontal': 'upper',
  'push-vertical': 'upper',
  'pull-vertical': 'pull',
  'pull-horizontal': 'pull',
  isolation: 'upper',
  core: 'lower',
  carry: 'lower',
  conditioning: 'general',
}

/** Programme day emphases map onto the same warm-up menus as movement patterns. */
const MENU_FOR_EMPHASIS: Record<string, string> = {
  full: 'lower',
  upper: 'upper',
  lower: 'lower',
  push: 'upper',
  pull: 'pull',
  legs: 'lower',
  conditioning: 'general',
}

/** Accepts a movement pattern or a day emphasis and returns a warm-up menu key. */
export function warmupKeyFor(input: MovementPattern | string): string {
  const direct = MENU_FOR_PATTERN[input as MovementPattern]
  if (direct) return direct
  return MENU_FOR_EMPHASIS[input] ?? 'general'
}

export function warmupMenuFor(pattern: MovementPattern | string) {
  const key = warmupKeyFor(pattern)
  return { key, stages: WARMUP_MENUS[key] ?? WARMUP_MENUS.lower ?? [] }
}

export function cooldownFor(pattern: MovementPattern | string): string[] {
  const key = warmupKeyFor(pattern)
  return COOLDOWN[key] ?? COOLDOWN.general ?? []
}

/* -------------------------------------------------------------------------- */

export function ExerciseHeader({
  exercise,
  locked,
  requirement,
  action,
}: {
  exercise: Exercise
  locked?: boolean
  requirement?: string
  action?: React.ReactNode
}) {
  return (
    <Card className={locked ? undefined : 'card--glow'}>
      <div className="exercise-header-layout">
        <div className="exercise-header-media">
          <img
            src={getExerciseImageUrl(exercise.id)}
            alt={`${exercise.name} demonstration`}
            onError={handleExerciseImageError}
            className="exercise-header-img"
          />
        </div>
        <div className="exercise-header-content stack-4">
          <div className="row-between" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
            <div className="stack-2 grow" style={{ minWidth: 0 }}>
              <span className="eyebrow row-tight">
                <Icon name={locked ? 'lock' : 'dumbbell'} size={12} />
                {PATTERN_LABELS[exercise.pattern] ?? exercise.pattern} · {TIER_LABELS[exercise.tier] ?? exercise.tier}
              </span>
              <h1 className="h3">{exercise.name}</h1>
              {exercise.notes ? <p className="small muted clamp-2">{exercise.notes}</p> : null}
            </div>
            {action}
          </div>

          <div className="row-2" style={{ flexWrap: 'wrap' }}>
            {exercise.muscles.map((m) => (
              <Chip key={m} icon="target">
                {MUSCLE_LABELS[m] ?? m}
              </Chip>
            ))}
            {exercise.secondary.slice(0, 3).map((m) => (
              <Chip key={m}>{MUSCLE_LABELS[m] ?? m}</Chip>
            ))}
            {exercise.equipment.map((e) => (
              <Chip key={e} icon="dumbbell">
                {EQUIPMENT_LABELS[e] ?? e}
              </Chip>
            ))}
            {exercise.perSide ? <Chip tone="info">Per side</Chip> : null}
            <Chip icon="zap">{exercise.xpPerSet} XP / set</Chip>
          </div>

          {locked && requirement ? (
            <div className="banner banner--warn">
              <Icon name="lock" size={15} />
              <span>
                <strong>{exercise.name} is a gated variation.</strong> {requirement} You can still read the coaching and use a substitution
                below.
              </span>
            </div>
          ) : null}

          <p className="tiny faint">Transcribed from {exercise.source}</p>
        </div>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

export function ExerciseCoaching({ exercise }: { exercise: Exercise }) {
  return (
    <>
      {exercise.setup ? (
        <Card title="Setup" icon="target">
          <p className="small">{exercise.setup}</p>
        </Card>
      ) : null}

      {exercise.depth ? (
        <Card title="Depth & range" icon="ruler">
          <p className="small">{exercise.depth}</p>
        </Card>
      ) : null}

      <Card title="Cues that fix most reps" icon="check">
        <ul className="stack-3">
          {exercise.cues.map((cue, i) => (
            <li key={i} className="row-tight small">
              <span className="badge badge--accent num" style={{ flex: 'none' }}>
                {i + 1}
              </span>
              {cue}
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Common mistakes" icon="alert-triangle" sub="Each one with the fix, not just the fault">
        <div className="stack-3">
          {exercise.commonErrors.map((err, i) => (
            <div key={i} className="panel stack-2" style={{ padding: 'var(--sp-3)' }}>
              <p className="small warn row-tight">
                <Icon name="alert-triangle" size={13} />
                {err.error}
              </p>
              <p className="tiny muted row-tight">
                <Icon name="arrow-right" size={12} />
                {err.fix}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  )
}

/* -------------------------------------------------------------------------- */

export function ExerciseSubstitutions({ exercise, unlockedIds }: { exercise: Exercise; unlockedIds: readonly string[] }) {
  const subs = substitutionsFor(exercise.id)
  const usedBy = substitutedBy(exercise.id)
  const unlocked = useMemo(() => new Set(unlockedIds), [unlockedIds])

  if (subs.length === 0 && usedBy.length === 0) return null

  const row = (other: Exercise, label: string) => {
    const locked = Boolean(other.advanced && other.unlockId && !unlocked.has(other.unlockId))
    return (
      <Link
        key={other.id}
        to={`/exercises/${other.id}`}
        className="card card--pad card--interactive"
        style={{ display: 'block', color: 'inherit', opacity: locked ? 0.72 : 1 }}
      >
        <div className="row-between" style={{ gap: 'var(--sp-3)' }}>
          <div className="stack-2" style={{ minWidth: 0 }}>
            <span className="strong truncate row-tight">
              {locked ? <Icon name="lock" size={12} className="faint" /> : null}
              {other.name}
            </span>
            <span className="tiny faint truncate">
              {PATTERN_LABELS[other.pattern] ?? other.pattern} · {other.muscles.map((m) => MUSCLE_LABELS[m] ?? m).join(', ')}
            </span>
          </div>
          <Chip tone={label === 'Swap in' ? 'info' : 'neutral'}>{label}</Chip>
        </div>
      </Link>
    )
  }

  return (
    <Card title="Substitutions" icon="repeat" sub="Pain-free, equipment-free or progression alternatives">
      <div className="stack-3">
        {subs.length > 0 ? (
          <>
            <p className="eyebrow">Instead of this movement</p>
            <div className="stack-2">{subs.map((s) => row(s, 'Swap in'))}</div>
          </>
        ) : null}
        {usedBy.length > 0 ? (
          <>
            <p className="eyebrow">Used as a substitute for</p>
            <div className="stack-2">{usedBy.map((s) => row(s, 'Easier'))}</div>
          </>
        ) : null}
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

export function ExerciseHistory({
  exercise,
  sessions,
  units = 'kg',
  showE1rm = true,
}: {
  exercise: Exercise
  sessions: readonly WorkoutSession[]
  units?: 'kg' | 'lb'
  /** The est. 1RM trend is itself a gated feature — pass false when it is not granted. */
  showE1rm?: boolean
}) {
  const options: { value: ProgressionMetric; label: string }[] = showE1rm
    ? [
        { value: 'weight', label: 'Top set' },
        { value: 'e1rm', label: 'Est. 1RM' },
        { value: 'volume', label: 'Volume' },
      ]
    : [
        { value: 'weight', label: 'Top set' },
        { value: 'volume', label: 'Volume' },
      ]
  const [metric, setMetric] = useState<ProgressionMetric>(showE1rm ? 'e1rm' : 'weight')
  const effective: ProgressionMetric = metric === 'e1rm' && !showE1rm ? 'weight' : metric

  const series: SeriesPoint[] = useMemo(() => exerciseProgression(sessions, exercise.id, effective), [sessions, exercise.id, effective])
  const change = seriesChange(series)
  const best = series.reduce((m, p) => Math.max(m, p.value), 0)
  const last = series[series.length - 1]

  if (series.length === 0) {
    return (
      <Card title="Your history" icon="trending-up">
        <Empty
          icon="clipboard"
          title="No sets logged yet"
          text="Complete a session containing this movement and your progression chart, best set and estimated 1RM build themselves from the numbers you actually enter."
        />
      </Card>
    )
  }

  const valueLabel = (n: number) => (effective === 'volume' ? `${Math.round(n).toLocaleString()} ${units}` : formatWeight(n, units))

  return (
    <Card
      title="Your history"
      icon="trending-up"
      sub={`${series.length} ${series.length === 1 ? 'session' : 'sessions'} containing this movement`}
      actions={
        <div className="segmented" role="group" aria-label="Metric">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={effective === opt.value ? 'is-on' : ''}
              aria-pressed={effective === opt.value}
              onClick={() => setMetric(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="stack-4">
        {!showE1rm ? (
          <p className="tiny faint row-tight">
            <Icon name="lock" size={11} />
            The estimated 1RM trend unlocks with the est. 1RM feature.
          </p>
        ) : null}

        <LineChart
          series={[
            {
              name: options.find((o) => o.value === effective)?.label ?? 'Value',
              points: series.map((p) => ({ label: p.label, value: p.value, meta: p.secondary ? `${p.value} × ${p.secondary}` : undefined })),
            },
          ]}
          height={180}
          area
          yFormat={(n) => (effective === 'volume' ? `${Math.round(n)}` : formatWeight(n, units))}
          ariaLabel={`${options.find((o) => o.value === effective)?.label ?? 'Value'} across your last ${series.length} sessions of ${exercise.name}`}
        />

        <div className="grid-3">
          <div className="stat">
            <span className="tiny faint">Best</span>
            <span className="stat__value num small">{valueLabel(best)}</span>
          </div>
          <div className="stat">
            <span className="tiny faint">Last</span>
            <span className="stat__value num small">{last ? valueLabel(last.value) : '—'}</span>
          </div>
          <div className="stat">
            <span className="tiny faint">Since first</span>
            <span
              className="stat__value num small"
              style={{ color: !change ? 'var(--text)' : change.delta >= 0 ? 'var(--good)' : 'var(--bad)' }}
            >
              {change ? `${change.delta >= 0 ? '+' : ''}${valueLabel(Math.abs(change.delta))}${change.pct !== null ? ` (${change.pct}%)` : ''}` : '—'}
            </span>
          </div>
        </div>

        <details className="stack-3">
          <summary className="eyebrow" style={{ cursor: 'pointer' }}>
            Every session with this exercise ({series.length})
          </summary>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Top set</th>
                  <th className="num">{options.find((o) => o.value === effective)?.label ?? 'Value'}</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map((p) => (
                  <tr key={p.date}>
                    <td>{formatDate(p.date, 'medium')}</td>
                    <td className="num">{p.secondary ? `${p.value} × ${p.secondary}` : '—'}</td>
                    <td className="num">{valueLabel(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

export function WarmupCard({ exercise }: { exercise: Exercise }) {
  const { key, stages } = warmupMenuFor(exercise.pattern)
  const cool = cooldownFor(exercise.pattern)
  return (
    <Card title="Warm-up for this pattern" icon="sunrise" sub={`From reference/warmup-and-cooldown.md — ${key} emphasis`}>
      <div className="stack-4">
        {stages.map((stage) => (
          <div key={stage.stage} className="stack-2">
            <p className="eyebrow">{stage.stage}</p>
            <ul className="stack-2">
              {stage.drills.map((d) => (
                <li key={d.name} className="row-between tiny" style={{ gap: 'var(--sp-3)' }}>
                  <span className="truncate">
                    {d.name} <span className="faint">— {d.purpose}</span>
                  </span>
                  <span className="num faint" style={{ flex: 'none' }}>
                    {d.dose}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
        {cool.length > 0 ? (
          <div className="stack-2">
            <p className="eyebrow">Cool-down</p>
            <ul className="stack-2">
              {cool.map((c) => (
                <li key={c} className="tiny row-tight">
                  <Icon name="check" size={11} className="good" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

export function PainTriageCard() {
  const icon = (verdict: string) => (verdict === 'ok' ? 'check-circle' : verdict === 'caution' ? 'alert-triangle' : 'shield-alert')
  return (
    <Card title="Pain triage" icon="shield-check" sub="When to keep going, modify, or stop — from the reference docs">
      <div className="stack-3">
        {PAIN_TRIAGE.map((row) => (
          <div key={row.sensation} className="panel stack-2" style={{ padding: 'var(--sp-3)' }}>
            <p className={`small row-tight ${row.verdict === 'ok' ? 'good' : row.verdict === 'caution' ? 'warn' : 'bad'}`}>
              <Icon name={icon(row.verdict)} size={14} />
              {row.sensation}
            </p>
            <p className="tiny muted">{row.detail}</p>
          </div>
        ))}
        <p className="tiny faint">
          This is general training guidance transcribed from the repository's reference notes, not medical advice. Persistent or sharp pain
          deserves a professional opinion.
        </p>
      </div>
    </Card>
  )
}

/* -------------------------------------------------------------------------- */

export function ExerciseLockedNote({ exercise, unlockedIds }: { exercise: Exercise; unlockedIds: readonly string[] }) {
  if (!exercise.advanced || !exercise.unlockId) return null
  if (unlockedIds.includes(exercise.unlockId)) return null
  const unlock = UNLOCK_MAP[exercise.unlockId]
  return (
    <div className="banner banner--warn">
      <Icon name="lock" size={15} />
      <span>{unlock ? unlockRequirementText(unlock) : 'This variation is locked.'}</span>
    </div>
  )
}

/** Resolves an id from the URL to an exercise, for pages that need a guard. */
export function useExercise(id: string | undefined): Exercise | undefined {
  return useMemo(() => (id ? getExercise(id) : undefined), [id])
}
