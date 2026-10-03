import type { MuscleGroup, MovementPattern, PersonalRecord, WorkoutSession } from '../types'
import { EXERCISE_MAP, MUSCLE_LABELS, PATTERN_LABELS, exerciseName, getExercise } from '../data/exercises'
import { estimatedOneRepMax } from '../data/rpe'
import { countingSets, sessionVolumeKg } from './xp'
import { addDays, formatDate, startOfWeek, toDateKey, todayKey } from './dates'

/**
 * Analytics.
 *
 * Every figure here is computed from logged sessions. Nothing is projected,
 * smoothed or back-filled: an empty week is a zero, a missing metric is `null`,
 * and a chart with one data point says so rather than drawing a trend line.
 */

export interface SeriesPoint {
  label: string
  date: string
  value: number
  /** Optional second series plotted alongside, e.g. reps next to weight. */
  secondary?: number
}

export type ProgressionMetric = 'weight' | 'reps' | 'e1rm' | 'volume'

/* ------------------------------------------------------------------ *
 * Frequency and consistency
 * ------------------------------------------------------------------ */

export interface FrequencyStats {
  total: number
  /** Sessions per week, averaged over weeks that actually contain activity. */
  perActiveWeek: number
  /** Sessions per calendar week over the whole logged span, gaps included. */
  perCalendarWeek: number
  weeksCovered: number
  activeWeeks: number
  bestWeek: { weekStart: string; count: number } | null
  currentWeekCount: number
  /** Fraction of the last 8 weeks that contained at least one session. */
  recentConsistency: number
}

export function frequencyStats(sessions: readonly WorkoutSession[], weekStartsOn: 0 | 1 = 1, today = todayKey()): FrequencyStats {
  const empty: FrequencyStats = {
    total: 0, perActiveWeek: 0, perCalendarWeek: 0, weeksCovered: 0, activeWeeks: 0,
    bestWeek: null, currentWeekCount: 0, recentConsistency: 0,
  }
  if (sessions.length === 0) return empty

  const byWeek = new Map<string, number>()
  for (const s of sessions) {
    const date = s.date || toDateKey(s.completedAt)
    if (!date) continue
    const key = startOfWeek(date, weekStartsOn)
    byWeek.set(key, (byWeek.get(key) ?? 0) + 1)
  }

  const weekKeys = [...byWeek.keys()].sort()
  const first = weekKeys[0]
  const last = startOfWeek(today, weekStartsOn)
  const weeksCovered = Math.max(1, Math.round((new Date(`${last}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / (7 * 86_400_000)) + 1)

  let bestWeek: FrequencyStats['bestWeek'] = null
  for (const [key, count] of byWeek) {
    if (!bestWeek || count > bestWeek.count) bestWeek = { weekStart: key, count }
  }

  const recentWeeks: string[] = []
  for (let i = 7; i >= 0; i--) recentWeeks.push(addDays(last, -i * 7))
  const recentActive = recentWeeks.filter((w) => (byWeek.get(w) ?? 0) > 0).length

  return {
    total: sessions.length,
    perActiveWeek: byWeek.size > 0 ? sessions.length / byWeek.size : 0,
    perCalendarWeek: sessions.length / weeksCovered,
    weeksCovered,
    activeWeeks: byWeek.size,
    bestWeek,
    currentWeekCount: byWeek.get(last) ?? 0,
    recentConsistency: recentActive / recentWeeks.length,
  }
}

/* ------------------------------------------------------------------ *
 * Progression per exercise
 * ------------------------------------------------------------------ */

/**
 * Best set per session for one exercise, as a time series.
 *
 * `weight` and `e1rm` take the heaviest / highest-estimated set; `reps` takes
 * the most reps; `volume` sums the exercise's volume across the session.
 * Warm-up and incomplete sets are excluded throughout.
 */
export function exerciseProgression(
  sessions: readonly WorkoutSession[],
  exerciseId: string,
  metric: ProgressionMetric = 'weight',
): SeriesPoint[] {
  const ordered = [...sessions].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const points: SeriesPoint[] = []

  for (const session of ordered) {
    const date = session.date || toDateKey(session.completedAt)
    for (const log of session.exercises) {
      if (log.exerciseId !== exerciseId || log.skipped) continue
      const sets = countingSets(log).filter((s) => s.reps > 0)
      if (sets.length === 0) continue

      if (metric === 'volume') {
        const value = log.unit === 'reps' ? sets.reduce((t, s) => t + s.weight * s.reps, 0) : sets.reduce((t, s) => t + s.reps, 0)
        points.push({ label: formatDate(date, 'short'), date, value: Math.round(value * 10) / 10 })
        break
      }

      const best = sets.reduce((a, b) => {
        if (metric === 'reps') return b.reps > a.reps ? b : a
        if (metric === 'e1rm') {
          const ea = estimatedOneRepMax(a.weight, a.reps)
          const eb = estimatedOneRepMax(b.weight, b.reps)
          return eb > ea ? b : a
        }
        if (b.weight !== a.weight) return b.weight > a.weight ? b : a
        return b.reps > a.reps ? b : a
      })

      const value =
        metric === 'reps' ? best.reps
        : metric === 'e1rm' ? estimatedOneRepMax(best.weight, best.reps)
        : best.weight

      points.push({
        label: formatDate(date, 'short'),
        date,
        value: Math.round(value * 10) / 10,
        secondary: best.reps,
      })
      break
    }
  }
  return points
}

/** Percentage change between the first and last point of a series. */
export function seriesChange(points: readonly SeriesPoint[]): { delta: number; pct: number | null } | null {
  if (points.length < 2) return null
  const first = points[0].value
  const last = points[points.length - 1].value
  const delta = last - first
  return { delta: Math.round(delta * 10) / 10, pct: first === 0 ? null : Math.round((delta / first) * 1000) / 10 }
}

/** Exercises worth charting, ranked by how much history exists for them. */
export function progressionCandidates(sessions: readonly WorkoutSession[], limit = 12): { id: string; name: string; sessions: number }[] {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    for (const log of s.exercises) {
      if (log.skipped || countingSets(log).length === 0) continue
      counts.set(log.exerciseId, (counts.get(log.exerciseId) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || exerciseName(a[0]).localeCompare(exerciseName(b[0])))
    .slice(0, limit)
    .map(([id, n]) => ({ id, name: exerciseName(id), sessions: n }))
}

/* ------------------------------------------------------------------ *
 * XP and volume over time
 * ------------------------------------------------------------------ */

export function xpProgression(events: readonly { date: string; amount: number; cumulative: number }[]): SeriesPoint[] {
  return events.map((e) => ({ label: formatDate(e.date, 'short'), date: e.date, value: e.cumulative }))
}

/** De-duplicated daily XP totals, cumulative — one point per day trained. */
export function dailyCumulativeXp(byDay: Record<string, number>): SeriesPoint[] {
  const dates = Object.keys(byDay).sort()
  let total = 0
  return dates.map((date) => {
    total += byDay[date]
    return { label: formatDate(date, 'short'), date, value: total }
  })
}

export function volumeProgression(sessions: readonly WorkoutSession[]): SeriesPoint[] {
  return [...sessions]
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map((s) => {
      const date = s.date || toDateKey(s.completedAt)
      return { label: formatDate(date, 'short'), date, value: Math.round(sessionVolumeKg(s)) }
    })
}

/* ------------------------------------------------------------------ *
 * Streak timeline
 * ------------------------------------------------------------------ */

/** Running streak length on each day from the first session to today. */
export function streakTimeline(sessions: readonly WorkoutSession[], today = todayKey(), maxDays = 365): SeriesPoint[] {
  const dates = new Set<string>()
  for (const s of sessions) {
    const d = s.date || toDateKey(s.completedAt)
    if (d) dates.add(d)
  }
  if (dates.size === 0) return []

  const first = [...dates].sort()[0]
  const span = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${first}T12:00:00`).getTime()) / 86_400_000)
  const days = Math.max(1, Math.min(maxDays, span + 1))
  const start = span > maxDays ? addDays(today, -(maxDays - 1)) : first

  const out: SeriesPoint[] = []
  let run = 0
  for (let i = 0; i < days; i++) {
    const date = addDays(start, i)
    run = dates.has(date) ? run + 1 : 0
    out.push({ label: formatDate(date, 'short'), date, value: run })
  }
  return out
}

/* ------------------------------------------------------------------ *
 * Distributions
 * ------------------------------------------------------------------ */

export interface Slice {
  id: string
  label: string
  value: number
  secondary?: number
}

/** Sets per muscle group (a set counts once per primary muscle). */
export function muscleDistribution(sessions: readonly WorkoutSession[]): Slice[] {
  const totals = new Map<MuscleGroup, number>()
  for (const s of sessions) {
    for (const log of s.exercises) {
      if (log.skipped) continue
      const n = countingSets(log).length
      if (n === 0) continue
      const muscles = getExercise(log.exerciseId)?.muscles ?? []
      for (const m of muscles) totals.set(m, (totals.get(m) ?? 0) + n)
    }
  }
  return [...totals.entries()]
    .map(([id, value]) => ({ id, label: MUSCLE_LABELS[id] ?? id, value }))
    .sort((a, b) => b.value - a.value)
}

export function patternDistribution(sessions: readonly WorkoutSession[]): Slice[] {
  const totals = new Map<MovementPattern, number>()
  for (const s of sessions) {
    for (const log of s.exercises) {
      if (log.skipped) continue
      const n = countingSets(log).length
      if (n === 0) continue
      const pattern = getExercise(log.exerciseId)?.pattern
      if (!pattern) continue
      totals.set(pattern, (totals.get(pattern) ?? 0) + n)
    }
  }
  return [...totals.entries()]
    .map(([id, value]) => ({ id, label: PATTERN_LABELS[id] ?? id, value }))
    .sort((a, b) => b.value - a.value)
}

export function weekdayDistribution(sessions: readonly WorkoutSession[], weekStartsOn: 0 | 1 = 1): Slice[] {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const counts = new Array(7).fill(0) as number[]
  for (const s of sessions) {
    const date = s.date || toDateKey(s.completedAt)
    if (!date) continue
    const dow = new Date(`${date}T12:00:00`).getDay()
    counts[dow]++
  }
  const order = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  return order.map((d) => ({ id: String(d), label: names[d], value: counts[d] }))
}

export function timeOfDayDistribution(sessions: readonly WorkoutSession[]): Slice[] {
  const buckets = [
    { id: 'dawn', label: 'Before 7am', test: (h: number) => h < 7 },
    { id: 'morning', label: '7–11am', test: (h: number) => h >= 7 && h < 12 },
    { id: 'afternoon', label: '12–5pm', test: (h: number) => h >= 12 && h < 17 },
    { id: 'evening', label: '5–9pm', test: (h: number) => h >= 17 && h < 21 },
    { id: 'night', label: 'After 9pm', test: (h: number) => h >= 21 },
  ]
  const counts: Record<string, number> = Object.fromEntries(buckets.map((b) => [b.id, 0]))
  for (const s of sessions) {
    const h = new Date(s.startedAt).getHours()
    if (!Number.isFinite(h)) continue
    const hit = buckets.find((b) => b.test(h))
    if (hit) counts[hit.id]++
  }
  return buckets.map((b) => ({ id: b.id, label: b.label, value: counts[b.id] }))
}

/* ------------------------------------------------------------------ *
 * Calendar heatmap
 * ------------------------------------------------------------------ */

export interface HeatmapDay {
  date: string
  workouts: number
  sets: number
  volumeKg: number
  xp: number
  durationMin: number
}

export function heatmapData(
  sessions: readonly WorkoutSession[],
  xpByDay: Record<string, number> = {},
): Record<string, HeatmapDay> {
  const out: Record<string, HeatmapDay> = {}
  const ensure = (date: string): HeatmapDay =>
    (out[date] ??= { date, workouts: 0, sets: 0, volumeKg: 0, xp: xpByDay[date] ?? 0, durationMin: 0 })

  for (const s of sessions) {
    const date = s.date || toDateKey(s.completedAt)
    if (!date) continue
    const cell = ensure(date)
    cell.workouts++
    cell.sets += s.completedSets || 0
    cell.volumeKg += s.volumeKg || 0
    cell.durationMin += s.durationMin || 0
  }
  for (const [date, xp] of Object.entries(xpByDay)) ensure(date).xp = xp
  return out
}

/** 0–4 intensity bucket, by set count — the scale a heatmap cell maps to. */
export function intensityBucket(day?: HeatmapDay): 0 | 1 | 2 | 3 | 4 {
  if (!day || day.workouts === 0) return 0
  const sets = day.sets
  if (sets <= 8) return 1
  if (sets <= 16) return 2
  if (sets <= 26) return 3
  return 4
}

/* ------------------------------------------------------------------ *
 * Session-level aggregates
 * ------------------------------------------------------------------ */

export interface SessionAggregate {
  durationMin: number
  volumeKg: number
  completedSets: number
  exercises: number
  skipped: number
  averageRpe: number | null
  prCount: number
}

export function aggregateSession(session: WorkoutSession): SessionAggregate {
  let completedSets = 0
  let skipped = 0
  let exercises = 0
  let rpeSum = 0
  let rpeCount = 0

  for (const log of session.exercises) {
    if (log.skipped) {
      skipped++
      continue
    }
    const sets = countingSets(log)
    if (sets.length === 0) continue
    exercises++
    completedSets += sets.length
    for (const s of sets) {
      if (typeof s.rpe === 'number' && Number.isFinite(s.rpe)) {
        rpeSum += s.rpe
        rpeCount++
      }
    }
  }

  return {
    durationMin: session.durationMin || 0,
    volumeKg: Math.round(sessionVolumeKg(session) * 10) / 10,
    completedSets,
    exercises,
    skipped,
    averageRpe: rpeCount > 0 ? Math.round((rpeSum / rpeCount) * 10) / 10 : null,
    prCount: session.prs?.length ?? 0,
  }
}

export function compareSessions(a: WorkoutSession, b: WorkoutSession): {
  exerciseId: string
  name: string
  a: { weight: number; reps: number } | null
  b: { weight: number; reps: number } | null
  delta: number | null
}[] {
  const ids = new Set<string>()
  for (const log of [...a.exercises, ...b.exercises]) if (!log.skipped) ids.add(log.exerciseId)

  const bestFor = (session: WorkoutSession, id: string) => {
    const log = session.exercises.find((l) => l.exerciseId === id && !l.skipped)
    if (!log) return null
    const sets = countingSets(log).filter((s) => s.reps > 0)
    if (sets.length === 0) return null
    const top = sets.reduce((x, y) => (y.weight > x.weight || (y.weight === x.weight && y.reps > x.reps) ? y : x))
    return { weight: top.weight, reps: top.reps }
  }

  return [...ids].map((id) => {
    const av = bestFor(a, id)
    const bv = bestFor(b, id)
    return {
      exerciseId: id,
      name: exerciseName(id),
      a: av,
      b: bv,
      delta: av && bv ? Math.round((bv.weight - av.weight) * 10) / 10 : null,
    }
  })
}

/* ------------------------------------------------------------------ *
 * Period comparison
 * ------------------------------------------------------------------ */

export interface PeriodDelta {
  workouts: { current: number; previous: number; pct: number | null }
  volume: { current: number; previous: number; pct: number | null }
  duration: { current: number; previous: number; pct: number | null }
  sets: { current: number; previous: number; pct: number | null }
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** Last `days` versus the `days` before that. */
export function periodDelta(sessions: readonly WorkoutSession[], days = 7, today = todayKey()): PeriodDelta {
  const curStart = addDays(today, -(days - 1))
  const prevStart = addDays(curStart, -days)
  const prevEnd = addDays(curStart, -1)

  const inRange = (from: string, to: string) =>
    sessions.filter((s) => {
      const d = s.date || toDateKey(s.completedAt)
      return d >= from && d <= to
    })

  const cur = inRange(curStart, today)
  const prev = inRange(prevStart, prevEnd)
  const sum = (list: WorkoutSession[], f: (s: WorkoutSession) => number) => list.reduce((t, s) => t + f(s), 0)

  return {
    workouts: { current: cur.length, previous: prev.length, pct: pctChange(cur.length, prev.length) },
    volume: {
      current: Math.round(sum(cur, sessionVolumeKg)),
      previous: Math.round(sum(prev, sessionVolumeKg)),
      pct: pctChange(sum(cur, sessionVolumeKg), sum(prev, sessionVolumeKg)),
    },
    duration: {
      current: Math.round(sum(cur, (s) => s.durationMin || 0)),
      previous: Math.round(sum(prev, (s) => s.durationMin || 0)),
      pct: pctChange(sum(cur, (s) => s.durationMin || 0), sum(prev, (s) => s.durationMin || 0)),
    },
    sets: {
      current: sum(cur, (s) => s.completedSets || 0),
      previous: sum(prev, (s) => s.completedSets || 0),
      pct: pctChange(sum(cur, (s) => s.completedSets || 0), sum(prev, (s) => s.completedSets || 0)),
    },
  }
}

/* ------------------------------------------------------------------ *
 * Records summary
 * ------------------------------------------------------------------ */

export function recordsSummary(records: Readonly<Record<string, PersonalRecord>>): {
  count: number
  byUnit: Record<string, number>
  strongest: { name: string; detail: string; date: string } | null
  mostRecent: { name: string; detail: string; date: string } | null
} {
  const list = Object.values(records).filter((r) => r.bestWeight > 0 || r.bestReps > 0)
  const byUnit: Record<string, number> = {}
  for (const r of list) byUnit[r.unit] = (byUnit[r.unit] ?? 0) + 1

  const withE1rm = list.filter((r) => r.bestE1rm > 0).sort((a, b) => b.bestE1rm - a.bestE1rm)
  const byDate = [...list].sort((a, b) => {
    const da = [a.bestWeightDate, a.bestRepsDate, a.bestE1rmDate].filter(Boolean).sort().pop() ?? ''
    const db = [b.bestWeightDate, b.bestRepsDate, b.bestE1rmDate].filter(Boolean).sort().pop() ?? ''
    return db.localeCompare(da)
  })

  const strongest = withE1rm[0]
  const recent = byDate[0]
  const recentDate = recent
    ? ([recent.bestWeightDate, recent.bestRepsDate, recent.bestE1rmDate].filter(Boolean).sort().pop() ?? '')
    : ''

  return {
    count: list.length,
    byUnit,
    strongest: strongest
      ? {
          name: strongest.exerciseName,
          detail: `est. ${strongest.bestE1rm} kg from ${strongest.bestE1rmDetail}`,
          date: strongest.bestE1rmDate,
        }
      : null,
    mostRecent: recent
      ? {
          name: recent.exerciseName,
          detail: recent.bestWeight > 0 ? `${recent.bestWeight} kg × ${recent.bestWeightReps}` : `${recent.bestReps} reps`,
          date: recentDate,
        }
      : null,
  }
}

/** Total sets logged for an exercise — used to warn before charting thin data. */
export function sessionCountFor(sessions: readonly WorkoutSession[], exerciseId: string): number {
  return sessions.filter((s) =>
    s.exercises.some((l) => l.exerciseId === exerciseId && !l.skipped && countingSets(l).length > 0),
  ).length
}

export { EXERCISE_MAP }
