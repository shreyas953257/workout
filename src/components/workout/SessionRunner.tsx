import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Modal, ConfirmDialog } from '../ui/Modal'
import { Card, Chip, Empty, Meter, NumberInput, Segmented, Toggle } from '../ui/primitives'
import { toast } from '../ui/Toast'
import { RestTimer } from './RestTimer'
import { ExercisePicker } from './ExerciseList'
import { PreviousPerformance } from './PreviousPerformance'
import { getExercise, substitutionsFor } from '../../data/exercises'
import { getProgram, getDay } from '../../data/programs'
import { RPE_OPTIONS } from '../../data/rpe'
import { store, useAppState, draftToSession, type DraftExercise } from '../../lib/store'
import { draftExerciseFor } from '../../lib/start'
import { formatDuration, formatSet, formatTimer, pluralize } from '../../lib/format'
import { relativeDay } from '../../lib/dates'
import { countingSets } from '../../lib/xp'
import type { SetEntry, SetUnit, WorkoutSession } from '../../types'

/**
 * The live workout session.
 *
 * Everything is written to the draft in the store on every change, and the draft
 * is persisted, so a reload or an accidental navigation never loses a set. XP is
 * only estimated here — the real award happens when the session is committed and
 * the replay engine runs.
 */

/* --------------------------------------------------------------------------
   Draft helpers
   -------------------------------------------------------------------------- */

/* --------------------------------------------------------------------------
   One editable set
   -------------------------------------------------------------------------- */

function SetRow({
  index,
  set,
  unit,
  previous,
  units,
  isCurrent,
  onChange,
  onRemove,
  onRest,
  restSec,
}: {
  index: number
  set: SetEntry
  unit: SetUnit
  previous?: SetEntry
  units: 'kg' | 'lb'
  isCurrent: boolean
  onChange: (patch: Partial<SetEntry>) => void
  onRemove: () => void
  onRest: () => void
  restSec: number
}) {
  const amountLabel = unit === 'seconds' ? 'sec' : unit === 'metres' ? 'm' : 'reps'
  const done = set.completed

  return (
    <div
      className="row-tight"
      data-needs-input={isCurrent && !done ? 'true' : undefined}
      style={{
        gap: 'var(--sp-2)',
        padding: '6px 8px',
        borderRadius: 'var(--r-sm)',
        background: done ? 'var(--accent-soft)' : isCurrent ? 'var(--surface-2)' : 'transparent',
        border: `1px solid ${isCurrent && !done ? 'var(--accent-line)' : 'transparent'}`,
        opacity: set.warmup ? 0.72 : 1,
      }}
    >
      <span className="tiny faint num" style={{ width: 22, flex: 'none', textAlign: 'center' }}>
        {set.warmup ? 'W' : index + 1}
      </span>

      <span className="tiny faint num" style={{ width: 74, flex: 'none' }} title="Last time">
        {previous ? formatSet(previous.weight, previous.reps, unit, units) : '—'}
      </span>

      <div style={{ flex: '1 1 74px', minWidth: 62 }}>
        <input
          className="input input--num"
          style={{ minHeight: 32, padding: '3px 8px' }}
          type="number"
          inputMode="decimal"
          step={unit === 'reps' ? 2.5 : 5}
          min={0}
          value={set.weight || ''}
          placeholder={units}
          aria-label={`Set ${index + 1} weight in ${units}`}
          disabled={unit !== 'reps'}
          onChange={(e) => onChange({ weight: Number(e.target.value) || 0 })}
        />
      </div>

      <div style={{ flex: '1 1 62px', minWidth: 56 }}>
        <input
          className="input input--num"
          style={{ minHeight: 32, padding: '3px 8px' }}
          type="number"
          inputMode="numeric"
          step={1}
          min={0}
          value={set.reps || ''}
          placeholder={amountLabel}
          aria-label={`Set ${index + 1} ${amountLabel}`}
          onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
        />
      </div>

      {unit === 'reps' ? (
        <div style={{ flex: '0 0 68px' }}>
          <select
            className="select"
            style={{ minHeight: 32, padding: '3px 24px 3px 6px', fontSize: 'var(--fs-xs)' }}
            value={set.rpe ?? ''}
            aria-label={`Set ${index + 1} RPE`}
            onChange={(e) => onChange({ rpe: e.target.value === '' ? undefined : Number(e.target.value) })}
          >
            <option value="">RPE</option>
            {RPE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button
        type="button"
        className={`iconbtn ${done ? 'is-on' : ''}`}
        aria-pressed={done}
        aria-label={done ? `Mark set ${index + 1} as not done` : `Complete set ${index + 1}`}
        title={done ? `Rest ${formatTimer(restSec)} starts when you un-complete` : `Complete set — starts a ${formatTimer(restSec)} rest`}
        onClick={() => {
          const next = !done
          onChange({ completed: next })
          if (next) onRest()
        }}
      >
        <Icon name={done ? 'check-circle' : 'circle-check'} size={19} />
      </button>

      <button type="button" className="iconbtn" aria-label={`Remove set ${index + 1}`} onClick={onRemove}>
        <Icon name="x" size={15} />
      </button>
    </div>
  )
}

/* --------------------------------------------------------------------------
   One exercise block
   -------------------------------------------------------------------------- */

function ExerciseBlock({
  index,
  draftExercise,
  sessions,
  units,
  defaultRestSec,
  autoStartRest,
}: {
  index: number
  draftExercise: DraftExercise
  sessions: readonly WorkoutSession[]
  units: 'kg' | 'lb'
  defaultRestSec: number
  autoStartRest: boolean
}) {
  const exercise = getExercise(draftExercise.exerciseId)
  const completed = draftExercise.sets.filter((s) => s.completed).length
  const total = draftExercise.sets.length
  const firstIncomplete = draftExercise.sets.findIndex((s) => !s.completed)
  const [showSubs, setShowSubs] = useState(false)
  const subs = useMemo(() => (exercise ? substitutionsFor(exercise.id).slice(0, 6) : []), [exercise])

  const markRest = useCallback(() => {
    if (!autoStartRest) return
    store.startRest(draftExercise.restSec || defaultRestSec, {
      exerciseId: draftExercise.exerciseId,
      setIndex: firstIncomplete >= 0 ? firstIncomplete : total - 1,
    })
  }, [autoStartRest, defaultRestSec, draftExercise.exerciseId, draftExercise.restSec, firstIncomplete, total])

  const addSet = () => {
    const last = draftExercise.sets[draftExercise.sets.length - 1]
    store.addSet(index, {
      reps: last?.reps ?? 0,
      weight: last?.weight ?? 0,
      rpe: undefined,
      completed: false,
    })
  }

  return (
    <Card
      pad={false}
      className={draftExercise.skipped ? '' : undefined}
      style={draftExercise.skipped ? { opacity: 0.6 } : undefined}
    >
      <div className="card__head" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        <div className="row-tight" style={{ minWidth: 0 }}>
          <span className="badge badge--muted num" style={{ flex: 'none' }}>
            {index + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <Link to={`/exercises/${draftExercise.exerciseId}`} className="strong truncate" style={{ display: 'block', color: 'var(--text)' }}>
              {draftExercise.name}
            </Link>
            <p className="tiny faint truncate">
              {draftExercise.target ? `${draftExercise.target}` : `${total} ${pluralize(total, 'set')}`}
              {draftExercise.rpeTarget ? ` @ RPE ${draftExercise.rpeTarget}` : ''}
              {draftExercise.perSide ? ' · per side' : ''}
              {exercise ? ` · rest ${formatTimer(draftExercise.restSec || defaultRestSec)}` : ''}
            </p>
          </div>
        </div>
        <div className="row-2" style={{ flex: 'none' }}>
          <span className={`chip tiny ${completed === total && total > 0 ? 'chip--good' : ''} num`}>
            {completed}/{total}
          </span>
          <button
            type="button"
            className={`iconbtn ${draftExercise.skipped ? 'is-on' : ''}`}
            aria-pressed={draftExercise.skipped}
            aria-label={draftExercise.skipped ? `Unskip ${draftExercise.name}` : `Skip ${draftExercise.name}`}
            title={draftExercise.skipped ? 'Put this exercise back' : 'Skip this exercise — it earns no XP'}
            onClick={() => store.toggleSkip(index)}
          >
            <Icon name="skip-forward" size={16} />
          </button>
        </div>
      </div>

      <div className="card__body" style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        <div className="stack-3">
          {!draftExercise.skipped ? (
            <PreviousPerformance sessions={sessions} exerciseId={draftExercise.exerciseId} units={units} compact />
          ) : (
            <p className="tiny warn row-tight">
              <Icon name="skip-forward" size={12} />
              Skipped — this exercise contributes no sets, volume or XP.
            </p>
          )}

          {!draftExercise.skipped ? (
            <>
              <div className="row-tight tiny faint" style={{ gap: 'var(--sp-2)', padding: '0 8px' }}>
                <span style={{ width: 22 }} />
                <span style={{ width: 74 }}>Last</span>
                <span style={{ flex: '1 1 74px' }}>{units}</span>
                <span style={{ flex: '1 1 62px' }}>{draftExercise.unit === 'reps' ? 'reps' : draftExercise.unit === 'seconds' ? 'sec' : 'm'}</span>
                {draftExercise.unit === 'reps' ? <span style={{ flex: '0 0 68px' }}>RPE</span> : null}
                <span style={{ width: 34 }} />
                <span style={{ width: 34 }} />
              </div>

              <div className="stack-2">
                {draftExercise.sets.map((set, setIndex) => (
                  <SetRow
                    key={set.id || setIndex}
                    index={setIndex}
                    set={set}
                    unit={draftExercise.unit}
                    previous={previousSet(sessions, draftExercise.exerciseId, setIndex)}
                    units={units}
                    isCurrent={setIndex === firstIncomplete}
                    restSec={draftExercise.restSec || defaultRestSec}
                    onRest={markRest}
                    onChange={(patch) => store.updateSet(index, setIndex, patch)}
                    onRemove={() => store.removeSet(index, setIndex)}
                  />
                ))}
              </div>

              <div className="row-2">
                <button type="button" className="btn btn--sm btn--ghost" onClick={addSet}>
                  <Icon name="plus" size={13} />
                  Add set
                </button>
                <button
                  type="button"
                  className="btn btn--sm btn--quiet"
                  onClick={() => store.startRest(draftExercise.restSec || defaultRestSec, { exerciseId: draftExercise.exerciseId })}
                >
                  <Icon name="timer" size={13} />
                  Rest {formatTimer(draftExercise.restSec || defaultRestSec)}
                </button>
                {subs.length > 0 ? (
                  <button type="button" className="btn btn--sm btn--quiet" onClick={() => setShowSubs((v) => !v)} aria-expanded={showSubs}>
                    <Icon name="repeat" size={13} />
                    Swap
                  </button>
                ) : null}
                {exercise?.advanced ? <Chip tone="warn" icon="lock">Advanced</Chip> : null}
              </div>

              {showSubs ? (
                <div className="well stack-2 anim-up" style={{ padding: 'var(--sp-3)' }}>
                  <p className="eyebrow">Pain-free or equipment-free swaps</p>
                  <div className="row-2">
                    {subs.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className="chip"
                        onClick={() => {
                          // Swap in place so the logged sets and their order survive.
                          const next: DraftExercise = {
                            ...draftExercise,
                            exerciseId: sub.id,
                            name: sub.name,
                            unit: sub.unit,
                            perSide: sub.perSide,
                          }
                          store.updateDraft({ exercises: currentExercises().map((e, i) => (i === index ? next : e)) })
                          setShowSubs(false)
                          toast.info(`Swapped to ${sub.name}`, 'Your logged sets were kept.')
                        }}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <textarea
            className="textarea"
            style={{ minHeight: 46 }}
            placeholder="Notes for this exercise — grip, tempo, how it felt…"
            value={draftExercise.note}
            maxLength={2000}
            aria-label={`Notes for ${draftExercise.name}`}
            onChange={(e) => {
              const note = e.target.value
              const exercises = currentExercises().map((ex, i) => (i === index ? { ...ex, note } : ex))
              store.updateDraft({ exercises })
            }}
          />
        </div>
      </div>
    </Card>
  )
}

/** Reads the current draft exercises straight from the store, for array patches. */
function currentExercises(): DraftExercise[] {
  return store.getSnapshot().draft?.exercises ?? []
}

/** The set at the same position last time — what a lifter actually compares against. */
function previousSet(sessions: readonly WorkoutSession[], exerciseId: string, setIndex: number): SetEntry | undefined {
  const ordered = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  for (let i = ordered.length - 1; i >= 0; i--) {
    const log = ordered[i].exercises.find((e) => e.exerciseId === exerciseId && !e.skipped)
    if (!log) continue
    const sets = countingSets(log)
    if (sets.length === 0) continue
    return sets[setIndex] ?? sets[sets.length - 1]
  }
  return undefined
}

/* --------------------------------------------------------------------------
   Finish dialog
   -------------------------------------------------------------------------- */

const MOODS = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Flat' },
  { value: 3, label: 'Fine' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
] as const

function FinishDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { draft } = useAppState()
  const navigate = useNavigate()
  const [notes, setNotes] = useState(draft?.notes ?? '')
  const [mood, setMood] = useState<number>(draft?.mood ?? 3)
  const [energy, setEnergy] = useState<number>(draft?.energy ?? 3)
  const [sleep, setSleep] = useState<number>(draft?.sleepHours ?? 7)
  const [deload, setDeload] = useState(draft?.deload ?? false)
  const [duration, setDuration] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open || !draft) return
    setNotes(draft.notes ?? '')
    setMood(draft.mood ?? 3)
    setEnergy(draft.energy ?? 3)
    setSleep(draft.sleepHours ?? 7)
    setDeload(draft.deload ?? false)
    const elapsed = Math.max(1, Math.round((Date.now() - new Date(draft.startedAt).getTime()) / 60000))
    setDuration(Number.isFinite(elapsed) ? Math.min(720, elapsed) : 60)
  }, [open, draft])

  if (!draft) return null

  const doneSets = draft.exercises.reduce((n, e) => n + (e.skipped ? 0 : e.sets.filter((s) => s.completed).length), 0)
  const preview = draftToSession({ ...draft, notes, mood: mood as 1 | 2 | 3 | 4 | 5, energy: energy as 1 | 2 | 3 | 4 | 5, sleepHours: sleep, deload }, { durationMin: duration })
  const estimate = store.estimateDraftXp({ ...draft, notes, deload })

  const commit = () => {
    if (busy) return
    setBusy(true)
    const session: WorkoutSession = draftToSession(
      { ...draft, notes, mood: mood as 1 | 2 | 3 | 4 | 5, energy: energy as 1 | 2 | 3 | 4 | 5, sleepHours: sleep, deload },
      { durationMin: duration },
    )
    const result = store.addSession(session)
    if (!result.ok || !result.session) {
      setBusy(false)
      toast.error('Could not save the workout', result.issues?.join(' ') ?? 'Check the values and try again.')
      return
    }
    store.clearDraft()
    setBusy(false)
    onClose()
    const earned = result.session.xp
    toast.xp(
      earned > 0 ? `Workout saved · +${earned} XP` : 'Workout saved',
      earned > 0
        ? `${result.session.completedSets} sets · ${Math.round(result.session.volumeKg).toLocaleString()} kg`
        : 'No completed sets, so no XP was awarded.',
    )
    navigate(`/history/${result.session.id}`)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Finish workout"
      sub={`${doneSets} ${pluralize(doneSets, 'set')} completed · about ${estimate} XP`}
      icon="check-circle"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Keep training
          </button>
          <button type="button" className="btn btn--primary" onClick={commit} disabled={busy}>
            <Icon name="save" size={15} />
            {busy ? 'Saving…' : 'Save workout'}
          </button>
        </>
      }
    >
      {doneSets === 0 ? (
        <div className="banner banner--warn">
          <Icon name="alert-triangle" size={16} />
          <span>
            No sets are marked complete. The session will be saved to your history, but it earns no XP, does not extend your streak and
            unlocks nothing — that is deliberate, so an empty log cannot be farmed.
          </span>
        </div>
      ) : null}

      <div className="auto-grid" style={{ '--min': '150px' } as React.CSSProperties}>
        <div className="field">
          <span className="label" id="finish-duration">Duration</span>
          <div className="row-tight" style={{ gap: 6 }}>
            <input
              className="input input--num"
              type="number"
              min={1}
              max={720}
              value={duration}
              aria-labelledby="finish-duration"
              onChange={(e) => setDuration(Math.max(1, Math.min(720, Number(e.target.value) || 1)))}
            />
            <span className="tiny faint">min</span>
          </div>
          <span className="hint">{formatDuration(duration)}</span>
        </div>

        <div className="field">
          <span className="label">Volume</span>
          <span className="h5 num">{Math.round(preview.volumeKg).toLocaleString()} kg</span>
          <span className="hint">{preview.completedSets} counting sets</span>
        </div>
      </div>

      <div className="field">
        <span className="label">How did it go?</span>
        <Segmented
          ariaLabel="Session mood"
          value={String(mood)}
          onChange={(v) => setMood(Number(v))}
          options={MOODS.map((m) => ({ value: String(m.value), label: m.label }))}
        />
      </div>

      <div className="field">
        <span className="label">Energy</span>
        <Segmented
          ariaLabel="Energy level"
          value={String(energy)}
          onChange={(v) => setEnergy(Number(v))}
          options={MOODS.map((m) => ({ value: String(m.value), label: m.label }))}
        />
      </div>

      <div className="field">
        <span className="label" id="finish-sleep">
          Sleep last night
        </span>
        <div className="row-tight" style={{ gap: 8 }}>
          <input
            className="range"
            type="range"
            min={0}
            max={12}
            step={0.5}
            value={sleep}
            aria-labelledby="finish-sleep"
            onChange={(e) => setSleep(Number(e.target.value))}
          />
          <span className="num small" style={{ minWidth: 48 }}>
            {sleep} h
          </span>
        </div>
      </div>

      <div className="field">
        <span className="label" id="finish-notes">
          Session notes
        </span>
        <textarea
          className="textarea"
          id="finish-notes"
          value={notes}
          maxLength={4000}
          placeholder="What worked, what hurt, what to change next time…"
          onChange={(e) => setNotes(e.target.value)}
        />
        <span className="hint">{notes.length}/4000</span>
      </div>

      <Toggle checked={deload} onChange={setDeload} label="This was a deload" hint="Deload sessions earn 60% of the usual XP — honest credit for an easier week." />
    </Modal>
  )
}

/* --------------------------------------------------------------------------
   The screen
   -------------------------------------------------------------------------- */

export function SessionRunner() {
  const { draft, data, progress } = useAppState()
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  const scrollRef = useRef<HTMLDivElement>(null)

  // Elapsed clock: 15 s is plenty for a minute-granularity display.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15000)
    return () => window.clearInterval(id)
  }, [])

  const focusNextSet = useCallback(() => {
    const el = scrollRef.current?.querySelector<HTMLElement>('[data-needs-input="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  if (!draft) {
    return (
      <div className="page">
        <Empty
          icon="dumbbell"
          title="No workout in progress"
          text="Start from a programme day, or open a free session and pick your own exercises."
          action={
            <>
              <Link to="/programs" className="btn btn--primary">
                <Icon name="layers" size={15} />
                Browse programmes
              </Link>
              <Link to="/workouts" className="btn btn--ghost">
                Today's workouts
              </Link>
            </>
          }
        />
      </div>
    )
  }

  const totalSets = draft.exercises.reduce((n, e) => n + (e.skipped ? 0 : e.sets.length), 0)
  const doneSets = draft.exercises.reduce((n, e) => n + (e.skipped ? 0 : e.sets.filter((s) => s.completed).length), 0)
  const pct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0
  const elapsedMin = Math.max(0, Math.round((now - new Date(draft.startedAt).getTime()) / 60000))
  const estimate = store.estimateDraftXp(draft)
  const program = draft.programId ? getProgram(draft.programId) : undefined
  const day = program && draft.dayId ? getDay(program.id, draft.dayId) : undefined

  return (
    <div className="page" ref={scrollRef}>
      <div className="card card--glow stack-4" style={{ padding: 'var(--sp-5)' }}>
        <div className="row-between" style={{ gap: 'var(--sp-3)' }}>
          <div className="stack-2 grow" style={{ minWidth: 0 }}>
            <span className="eyebrow row-tight">
              <Icon name="play" size={12} />
              Session in progress
              {draft.deload ? <Chip tone="warn">Deload</Chip> : null}
            </span>
            <input
              className="input"
              style={{ background: 'transparent', border: '1px solid transparent', fontSize: 'var(--fs-xl)', fontWeight: 600, padding: '2px 6px', marginLeft: -6 }}
              value={draft.title}
              maxLength={120}
              aria-label="Workout title"
              onChange={(e) => store.updateDraft({ title: e.target.value })}
            />
            <p className="tiny faint truncate">
              {program ? `${program.name}${day ? ` · ${day.name}` : ''}${draft.week ? ` · week ${draft.week}` : ''}` : 'Free session'}
              {' · started '}
              {relativeDay(new Date(draft.startedAt).toISOString().slice(0, 10))}
            </p>
          </div>
          <div className="col items-end" style={{ flex: 'none', textAlign: 'right' }}>
            <span className="h3 num">{formatTimer(elapsedMin * 60)}</span>
            <span className="tiny faint num">≈ {estimate} XP so far</span>
          </div>
        </div>

        <Meter pct={pct} label="Session progress" showText valueLabel={`${doneSets} / ${totalSets} sets`} />

        <div className="row-2">
          <button type="button" className="btn btn--primary" onClick={() => setFinishOpen(true)}>
            <Icon name="check" size={15} />
            Finish workout
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => setPickerOpen(true)}>
            <Icon name="plus" size={15} />
            Add exercise
          </button>
          <button type="button" className="btn btn--quiet" onClick={() => setDiscardOpen(true)}>
            <Icon name="trash" size={15} />
            Discard
          </button>
        </div>
      </div>

      <RestTimer onComplete={focusNextSet} />

      <div className="stack-4">
        {draft.exercises.map((exercise, index) => (
          <ExerciseBlock
            key={`${exercise.exerciseId}-${index}`}
            index={index}
            draftExercise={exercise}
            sessions={data.sessions}
            units={data.profile.units}
            defaultRestSec={data.preferences.defaultRestSec}
            autoStartRest={data.preferences.autoStartRest}
          />
        ))}

        {draft.exercises.length === 0 ? (
          <Card>
            <Empty
              icon="dumbbell"
              title="No exercises yet"
              text="Add the movements you plan to train. You can add, swap or skip at any point."
              action={
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setPickerOpen(true)}>
                  <Icon name="plus" size={14} />
                  Add your first exercise
                </button>
              }
            />
          </Card>
        ) : null}
      </div>

      <Card title="Session notes" icon="note" sub="Anything worth remembering next time">
        <textarea
          className="textarea"
          value={draft.notes}
          maxLength={4000}
          placeholder="Sleep, stress, niggles, what to change next week…"
          aria-label="Session notes"
          onChange={(e) => store.updateDraft({ notes: e.target.value })}
        />
        <div className="row-between tiny faint" style={{ marginTop: 8 }}>
          <span>{draft.notes.length}/4000</span>
          <span>
            {progress.streak.current > 0 ? `Streak ${progress.streak.current} · ` : ''}Level {progress.level.level} ·{' '}
            {progress.level.xp.toLocaleString()} XP
          </span>
        </div>
      </Card>

      <Card pad={false}>
        <div className="card__body row-between" style={{ gap: 'var(--sp-4)' }}>
          <div className="stack-2" style={{ minWidth: 0 }}>
            <span className="label">Default rest</span>
            <span className="hint">Used when you complete a set and for the "Rest" button on exercises with no prescription.</span>
          </div>
          <NumberInput
            ariaLabel="Default rest seconds"
            value={data.preferences.defaultRestSec}
            min={15}
            max={600}
            step={15}
            suffix="s"
            onChange={(n) => store.updatePreferences({ defaultRestSec: n })}
          />
        </div>
      </Card>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        unlockedIds={progress.unlockedIds}
        excludeIds={draft.exercises.map((e) => e.exerciseId)}
        onPick={(exerciseId) => {
          const next = draftExerciseFor(exerciseId, data.preferences.defaultRestSec)
          store.updateDraft({ exercises: [...currentExercises(), next] })
          toast.success(`${next.name} added`, 'Three empty sets are ready — fill in your last numbers.')
        }}
      />

      <FinishDialog open={finishOpen} onClose={() => setFinishOpen(false)} />

      <ConfirmDialog
        open={discardOpen}
        onCancel={() => setDiscardOpen(false)}
        onConfirm={() => {
          store.clearDraft()
          setDiscardOpen(false)
          toast.warn('Session discarded', 'Nothing was saved to your history.')
          navigate('/workouts')
        }}
        title="Discard this session?"
        message="Every set you logged in this session will be thrown away. This cannot be undone."
        confirmLabel="Discard session"
        icon="trash"
      />
    </div>
  )
}

export default SessionRunner
