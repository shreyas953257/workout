import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { Empty } from '../ui/primitives'
import { useDebounced } from '../charts'
import {
  ALL_EQUIPMENT,
  ALL_PATTERNS,
  EQUIPMENT_LABELS,
  EXERCISES,
  MUSCLE_LABELS,
  PATTERN_LABELS,
  TRAINED_MUSCLES,
  TIER_LABELS,
  getExercise,
} from '../../data/exercises'
import { UNLOCK_MAP } from '../../data/unlocks'
import { unlockRequirementText } from '../../lib/unlocks'
import type { Equipment, Exercise, ExerciseTier, MovementPattern, MuscleGroup } from '../../types'

/**
 * Exercise filtering, shared by the library page and the in-session picker.
 *
 * The filter is a pure function so it can be tested on its own, and the hook
 * wraps it with debounced search so typing stays instant over 64 entries.
 */

export interface ExerciseFilterState {
  query: string
  muscles: MuscleGroup[]
  patterns: MovementPattern[]
  equipment: Equipment[]
  tiers: ExerciseTier[]
  /** Hide gated variations the user has not unlocked yet. */
  hideLocked: boolean
}

export const EMPTY_FILTER: ExerciseFilterState = {
  query: '',
  muscles: [],
  patterns: [],
  equipment: [],
  tiers: [],
  hideLocked: false,
}

export function filterExercises(
  exercises: readonly Exercise[],
  filter: ExerciseFilterState,
  unlockedIds: readonly string[] = [],
): Exercise[] {
  const q = filter.query.trim().toLowerCase()
  const unlocked = new Set(unlockedIds)

  const scored = exercises
    .filter((e) => {
      if (e.advanced && e.unlockId && !unlocked.has(e.unlockId) && filter.hideLocked) return false
      if (filter.muscles.length > 0 && !filter.muscles.some((m) => e.muscles.includes(m) || e.secondary.includes(m))) return false
      if (filter.patterns.length > 0 && !filter.patterns.includes(e.pattern)) return false
      if (filter.equipment.length > 0 && !filter.equipment.some((x) => e.equipment.includes(x))) return false
      if (filter.tiers.length > 0 && !filter.tiers.includes(e.tier)) return false
      if (!q) return true
      const haystack = [
        e.name,
        e.short ?? '',
        e.pattern,
        e.tier,
        PATTERN_LABELS[e.pattern] ?? '',
        TIER_LABELS[e.tier] ?? '',
        ...e.muscles.map((m) => MUSCLE_LABELS[m] ?? m),
        ...e.secondary.map((m) => MUSCLE_LABELS[m] ?? m),
        ...e.equipment.map((x) => EQUIPMENT_LABELS[x] ?? x),
        e.notes ?? '',
        ...e.cues,
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
    .map((e) => {
      // An exact or prefix name match outranks a match buried in the cues.
      const name = e.name.toLowerCase()
      let rank = 3
      if (!q) rank = 1
      else if (name === q) rank = 0
      else if (name.startsWith(q)) rank = 1
      else if (name.includes(q)) rank = 2
      return { e, rank }
    })

  scored.sort((a, b) => a.rank - b.rank || a.e.name.localeCompare(b.e.name))
  return scored.map((s) => s.e)
}

export function useExerciseFilters(initial: Partial<ExerciseFilterState> = {}) {
  const [filter, setFilter] = useState<ExerciseFilterState>({ ...EMPTY_FILTER, ...initial })
  const debouncedQuery = useDebounced(filter.query, 150)
  const effective = useMemo(() => ({ ...filter, query: debouncedQuery }), [filter, debouncedQuery])

  const toggle = useCallback(<K extends 'muscles' | 'patterns' | 'equipment' | 'tiers'>(key: K, value: ExerciseFilterState[K][number]) => {
    setFilter((prev) => {
      const list = prev[key] as string[]
      const next = list.includes(value as string) ? list.filter((v) => v !== value) : [...list, value as string]
      return { ...prev, [key]: next } as ExerciseFilterState
    })
  }, [])

  const reset = useCallback(() => setFilter((prev) => ({ ...EMPTY_FILTER, query: prev.query })), [])
  const activeCount = filter.muscles.length + filter.patterns.length + filter.equipment.length + filter.tiers.length + (filter.hideLocked ? 1 : 0)

  return { filter, setFilter, effective, toggle, reset, activeCount }
}

/* -------------------------------------------------------------------------- */

function FilterChips<T extends string>({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  selected: readonly T[]
  onToggle: (value: T) => void
}) {
  if (options.length === 0) return null
  return (
    <div className="stack-2">
      <p className="eyebrow">{label}</p>
      <div className="row-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`chip ${selected.includes(opt.value) ? 'is-on' : ''}`}
            aria-pressed={selected.includes(opt.value)}
            onClick={() => onToggle(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExerciseFilterBar({
  filter,
  setFilter,
  toggle,
  reset,
  activeCount,
  resultCount,
  idPrefix = 'ex',
}: {
  filter: ExerciseFilterState
  setFilter: (patch: Partial<ExerciseFilterState>) => void
  toggle: <K extends 'muscles' | 'patterns' | 'equipment' | 'tiers'>(key: K, value: ExerciseFilterState[K][number]) => void
  reset: () => void
  activeCount: number
  resultCount: number
  idPrefix?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="stack-3">
      <div className="row" style={{ gap: 'var(--sp-2)' }}>
        <div className="searchbar grow">
          <Icon name="search" size={16} />
          <input
            id={`${idPrefix}-search`}
            className="input"
            type="search"
            placeholder="Search 64 exercises — name, muscle, equipment…"
            value={filter.query}
            onChange={(e) => setFilter({ query: e.target.value } as never)}
            aria-label="Search exercises"
          />
          {filter.query ? (
            <button
              type="button"
              className="iconbtn searchbar__clear"
              aria-label="Clear search"
              onClick={() => setFilter({ query: '' } as never)}
            >
              <Icon name="x" size={14} />
            </button>
          ) : null}
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Icon name="filter" size={15} />
          Filters
          {activeCount > 0 ? <span className="badge">{activeCount}</span> : null}
        </button>
        {activeCount > 0 ? (
          <button type="button" className="btn btn--quiet" onClick={reset}>
            Reset
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="panel stack-4 anim-up">
          <FilterChips
            label="Movement pattern"
            options={ALL_PATTERNS.map((p) => ({ value: p, label: PATTERN_LABELS[p] ?? p }))}
            selected={filter.patterns}
            onToggle={(v) => toggle('patterns', v)}
          />
          <FilterChips
            label="Muscle"
            options={TRAINED_MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABELS[m] ?? m }))}
            selected={filter.muscles}
            onToggle={(v) => toggle('muscles', v)}
          />
          <FilterChips
            label="Equipment"
            options={ALL_EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] ?? e }))}
            selected={filter.equipment}
            onToggle={(v) => toggle('equipment', v)}
          />
          <FilterChips
            label="Role in the programme"
            options={(Object.keys(TIER_LABELS) as ExerciseTier[]).map((t) => ({ value: t, label: TIER_LABELS[t] }))}
            selected={filter.tiers}
            onToggle={(v) => toggle('tiers', v)}
          />
        </div>
      ) : null}

      <p className="tiny faint" aria-live="polite">
        {resultCount} {resultCount === 1 ? 'exercise' : 'exercises'}
        {activeCount > 0 ? ' matching your filters' : ''}
      </p>
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function ExerciseRow({
  exercise,
  locked,
  requirement,
  action,
  to,
}: {
  exercise: Exercise
  locked?: boolean
  requirement?: string
  action?: React.ReactNode
  to?: string
}) {
  const inner = (
    <div className="row" style={{ gap: 'var(--sp-3)', alignItems: 'flex-start' }}>
      <span
        className="empty__icon"
        style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--surface-2)', color: locked ? 'var(--text-faint)' : 'var(--accent)' }}
        aria-hidden
      >
        <Icon name={locked ? 'lock' : exercise.tier === 'conditioning' ? 'running' : 'dumbbell'} size={17} />
      </span>
      <div className="stack-2 grow" style={{ minWidth: 0 }}>
        <div className="row-between" style={{ gap: 'var(--sp-2)' }}>
          <span className="strong truncate">{exercise.name}</span>
          <span className="row-2" style={{ flex: 'none' }}>
            <span className="chip tiny">{TIER_LABELS[exercise.tier] ?? exercise.tier}</span>
            {exercise.perSide ? <span className="chip tiny">/ side</span> : null}
          </span>
        </div>
        <p className="tiny muted truncate">
          {PATTERN_LABELS[exercise.pattern] ?? exercise.pattern} · {exercise.muscles.map((m) => MUSCLE_LABELS[m] ?? m).join(', ')}
        </p>
        {locked && requirement ? <p className="tiny warn row-tight"><Icon name="lock" size={11} />{requirement}</p> : null}
      </div>
      {action ?? <Icon name="chevron-right" size={16} className="faint" />}
    </div>
  )

  const className = `card card--pad ${locked ? '' : 'card--interactive'}`
  if (to && !locked) {
    return (
      <Link to={to} className={className} style={{ display: 'block', color: 'inherit', opacity: locked ? 0.7 : 1 }}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={className} style={{ opacity: locked ? 0.72 : 1 }} aria-disabled={locked || undefined}>
      {inner}
    </div>
  )
}

/* -------------------------------------------------------------------------- */

export function ExercisePicker({
  open,
  onClose,
  onPick,
  unlockedIds,
  excludeIds = [],
  title = 'Add an exercise',
}: {
  open: boolean
  onClose: () => void
  onPick: (exerciseId: string) => void
  unlockedIds: readonly string[]
  excludeIds?: readonly string[]
  title?: string
}) {
  const { filter, setFilter, effective, toggle, reset, activeCount } = useExerciseFilters()
  const unlocked = useMemo(() => new Set(unlockedIds), [unlockedIds])

  const results = useMemo(() => {
    const exclude = new Set(excludeIds)
    return filterExercises(EXERCISES, effective, unlockedIds).filter((e) => !exclude.has(e.id))
  }, [effective, unlockedIds, excludeIds])

  const patch = useCallback((p: Partial<ExerciseFilterState>) => setFilter((prev) => ({ ...prev, ...p })), [setFilter])

  return (
    <Modal open={open} onClose={onClose} title={title} sub="Search the full library — substitutions included" icon="search" wide>
      <ExerciseFilterBar
        filter={filter}
        setFilter={patch}
        toggle={toggle}
        reset={reset}
        activeCount={activeCount}
        resultCount={results.length}
        idPrefix="picker"
      />

      <div style={{ maxHeight: '46dvh', overflowY: 'auto', paddingRight: 4 }}>
        {results.length === 0 ? (
          <Empty
            icon="search"
            title="No exercises match"
            text="Try a shorter search, or clear the filters."
            action={
              <button type="button" className="btn btn--ghost btn--sm" onClick={reset}>
                Clear filters
              </button>
            }
          />
        ) : (
          <div className="stack-2">
            {results.slice(0, 60).map((exercise) => {
              const locked = Boolean(exercise.advanced && exercise.unlockId && !unlocked.has(exercise.unlockId))
              return (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  locked={locked}
                  requirement={locked ? unlockRequirementText(UNLOCK_MAP[exercise.unlockId!]) : undefined}
                  action={
                    <button
                      type="button"
                      className="btn btn--sm btn--primary"
                      disabled={locked}
                      onClick={() => {
                        onPick(exercise.id)
                        onClose()
                      }}
                    >
                      <Icon name="plus" size={13} />
                      Add
                    </button>
                  }
                />
              )
            })}
            {results.length > 60 ? <p className="tiny faint center">Showing the first 60 of {results.length} matches.</p> : null}
          </div>
        )}
      </div>
    </Modal>
  )
}

/** Convenience for components that only have an id. */
export function exerciseOrFallback(id: string): Exercise | undefined {
  return getExercise(id)
}
