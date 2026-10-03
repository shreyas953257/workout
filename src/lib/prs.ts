import type { PersonalRecord, PrSnapshot, SetUnit, WorkoutSession } from '../types'
import { exerciseName, getExercise } from '../data/exercises'
import { estimatedOneRepMax } from '../data/rpe'
import { countingSets } from './xp'
import { toDateKey } from './dates'

/**
 * Personal-record detection.
 *
 * Records are derived from logged sets — never asserted by the user and never
 * seeded with fake numbers. Four records are tracked per exercise:
 *
 *   bestWeight  heaviest load moved for at least one rep
 *   bestReps    most reps in a single set
 *   bestE1rm    highest Epley estimate  (weight × (1 + reps ÷ 30), capped at 10 reps)
 *   bestVolume  heaviest single set by weight × reps
 *
 * For timed or distance exercises (planks, carries) only a best-performance
 * record applies, and it is reported in the exercise's own unit.
 */

const EMPTY_HISTORY_LIMIT = 60

function newRecord(exerciseId: string, unit: SetUnit): PersonalRecord {
  return {
    exerciseId,
    exerciseName: exerciseName(exerciseId),
    unit,
    bestWeight: 0,
    bestWeightReps: 0,
    bestWeightDate: '',
    bestReps: 0,
    bestRepsWeight: 0,
    bestRepsDate: '',
    bestE1rm: 0,
    bestE1rmDetail: '',
    bestE1rmDate: '',
    bestVolume: 0,
    bestVolumeDate: '',
    totalSets: 0,
    history: [],
  }
}

/** Better-than comparison that breaks ties on the secondary attribute. */
function beatsWeight(candidateWeight: number, candidateReps: number, bestWeight: number, bestWeightReps: number): boolean {
  if (candidateWeight > bestWeight) return true
  if (candidateWeight === bestWeight && candidateReps > bestWeightReps) return true
  return false
}

export interface PrScanResult {
  records: Record<string, PersonalRecord>
  /** Every record-setter, in chronological order, for the PR feed and XP awards. */
  events: {
    sessionId: string
    date: string
    exerciseId: string
    exerciseName: string
    kind: PrSnapshot['kind']
    value: number
    previous: number
    detail: string
  }[]
  /** Records set by a specific session — computed against everything before it. */
  bySession: Record<string, PrSnapshot[]>
}

/**
 * Single chronological pass over the log, maintaining a running best per
 * exercise so that each record is attributed to the session that actually set it.
 */
export function scanPersonalRecords(sessions: readonly WorkoutSession[]): PrScanResult {
  const ordered = [...sessions].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date)
    if (byDate !== 0) return byDate
    return a.completedAt.localeCompare(b.completedAt)
  })

  const records: Record<string, PersonalRecord> = {}
  const events: PrScanResult['events'] = []
  const bySession: Record<string, PrSnapshot[]> = {}

  for (const session of ordered) {
    const sessionPrs: PrSnapshot[] = []
    const date = session.date || toDateKey(session.completedAt)

    for (const log of session.exercises) {
      if (log.skipped) continue
      const sets = countingSets(log)
      if (sets.length === 0) continue

      const unit: SetUnit = log.unit ?? getExercise(log.exerciseId)?.unit ?? 'reps'
      const rec = records[log.exerciseId] ?? newRecord(log.exerciseId, unit)
      rec.unit = unit
      rec.exerciseName = log.name || exerciseName(log.exerciseId)

      for (const set of sets) {
        if (set.reps <= 0) continue
        rec.totalSets++
        const e1rm = unit === 'reps' && set.weight > 0 ? estimatedOneRepMax(set.weight, set.reps) : 0
        const setVolume = unit === 'reps' ? set.weight * set.reps : 0

        rec.history.push({
          date,
          weight: set.weight,
          reps: set.reps,
          e1rm,
          volume: setVolume,
          sessionId: session.id,
        })

        if (unit === 'reps') {
          if (beatsWeight(set.weight, set.reps, rec.bestWeight, rec.bestWeightReps) && set.weight > 0) {
            const previous = rec.bestWeight
            rec.bestWeight = set.weight
            rec.bestWeightReps = set.reps
            rec.bestWeightDate = date
            const snap: PrSnapshot = {
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'weight',
              value: set.weight,
              detail: `${set.weight} kg × ${set.reps}${previous > 0 ? ` (was ${previous} kg)` : ' — first recorded set'}`,
            }
            sessionPrs.push(snap)
            events.push({
              sessionId: session.id,
              date,
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'weight',
              value: set.weight,
              previous,
              detail: snap.detail,
            })
          }

          if (set.reps > rec.bestReps || (set.reps === rec.bestReps && set.weight > rec.bestRepsWeight)) {
            const previous = rec.bestReps
            rec.bestReps = set.reps
            rec.bestRepsWeight = set.weight
            rec.bestRepsDate = date
            const snap: PrSnapshot = {
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'reps',
              value: set.reps,
              detail: `${set.reps} reps${set.weight > 0 ? ` @ ${set.weight} kg` : ''}${previous > 0 ? ` (was ${previous})` : ''}`,
            }
            sessionPrs.push(snap)
            events.push({
              sessionId: session.id,
              date,
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'reps',
              value: set.reps,
              previous,
              detail: snap.detail,
            })
          }

          if (e1rm > rec.bestE1rm) {
            const previous = rec.bestE1rm
            rec.bestE1rm = e1rm
            rec.bestE1rmDetail = `${set.weight} kg × ${set.reps}`
            rec.bestE1rmDate = date
            const snap: PrSnapshot = {
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'e1rm',
              value: e1rm,
              detail: `est. ${e1rm} kg from ${set.weight} kg × ${set.reps}`,
            }
            sessionPrs.push(snap)
            events.push({
              sessionId: session.id,
              date,
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'e1rm',
              value: e1rm,
              previous,
              detail: snap.detail,
            })
          }

          if (setVolume > rec.bestVolume) {
            const previous = rec.bestVolume
            rec.bestVolume = setVolume
            rec.bestVolumeDate = date
            const snap: PrSnapshot = {
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'volume',
              value: setVolume,
              detail: `${Math.round(setVolume).toLocaleString('en-US')} kg in one set`,
            }
            sessionPrs.push(snap)
            events.push({
              sessionId: session.id,
              date,
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'volume',
              value: setVolume,
              previous,
              detail: snap.detail,
            })
          }
        } else {
          // Timed / distance work: the "reps" field carries seconds or metres.
          if (set.reps > rec.bestReps) {
            const previous = rec.bestReps
            rec.bestReps = set.reps
            rec.bestRepsWeight = set.weight
            rec.bestRepsDate = date
            const suffix = unit === 'seconds' ? 's' : ' m'
            const snap: PrSnapshot = {
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'reps',
              value: set.reps,
              detail: `${set.reps}${suffix}${previous > 0 ? ` (was ${previous}${suffix})` : ''}`,
            }
            sessionPrs.push(snap)
            events.push({
              sessionId: session.id,
              date,
              exerciseId: rec.exerciseId,
              exerciseName: rec.exerciseName,
              kind: 'reps',
              value: set.reps,
              previous,
              detail: snap.detail,
            })
          }
        }
      }

      // Keep history bounded: newest entries matter, ancient ones bloat storage.
      if (rec.history.length > EMPTY_HISTORY_LIMIT) {
        rec.history = rec.history.slice(-EMPTY_HISTORY_LIMIT)
      }
      records[log.exerciseId] = rec
    }

    if (sessionPrs.length > 0) bySession[session.id] = sessionPrs
  }

  return { records, events, bySession }
}

export function prCount(records: Record<string, PersonalRecord>): number {
  return Object.values(records).filter((r) => r.bestWeight > 0 || r.bestReps > 0).length
}

/** Total distinct record-setters across history — used by the `prs` achievement. */
export function totalPrEvents(sessions: readonly WorkoutSession[]): number {
  return scanPersonalRecords(sessions).events.length
}

/** Most recent N PR events, newest first — for the dashboard and history feed. */
export function recentPrEvents(sessions: readonly WorkoutSession[], limit = 6): PrScanResult['events'] {
  return scanPersonalRecords(sessions).events.slice(-limit).reverse()
}

/** Best records worth showing on a summary card, ordered by recency. */
export function topRecords(records: Record<string, PersonalRecord>, limit = 6): PersonalRecord[] {
  return Object.values(records)
    .filter((r) => r.bestWeight > 0 || r.bestReps > 0)
    .sort((a, b) => {
      const da = [a.bestWeightDate, a.bestRepsDate, a.bestE1rmDate].filter(Boolean).sort().pop() ?? ''
      const db = [b.bestWeightDate, b.bestRepsDate, b.bestE1rmDate].filter(Boolean).sort().pop() ?? ''
      return db.localeCompare(da)
    })
    .slice(0, limit)
}

/**
 * Suggested next working weight for an exercise, from the most recent
 * completed sets. Conservative on purpose: it proposes a repeat, or the
 * smallest increment, never a jump.
 */
export function suggestedWeight(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
  increment = 2.5,
): { weight: number; reps: number; basis: 'last' | 'best' | 'none'; detail: string } | null {
  const relevant = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date) || a.completedAt.localeCompare(b.completedAt))
    .reverse()

  for (const session of relevant) {
    const log = session.exercises.find((e) => e.exerciseId === exerciseId && !e.skipped)
    if (!log) continue
    const sets = countingSets(log).filter((s) => s.weight > 0)
    if (sets.length === 0) continue
    const top = sets.reduce((a, b) => (b.weight > a.weight ? b : a))
    const topRpe = top.rpe ?? 8
    // RPE 9+ → repeat the same weight. Otherwise propose the smallest increment.
    const bump = topRpe >= 9 ? 0 : increment
    return {
      weight: Math.round((top.weight + bump) * 100) / 100,
      reps: top.reps,
      basis: 'last',
      detail:
        bump === 0
          ? `Repeat ${top.weight} kg — last top set was RPE ${topRpe}`
          : `+${increment} kg over your last top set of ${top.weight} kg × ${top.reps}`,
    }
  }
  return null
}
