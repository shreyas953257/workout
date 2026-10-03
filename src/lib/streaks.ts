import type { StreakInfo } from '../types'
import { addDays, diffDays, isValidDateKey, startOfWeek, todayKey } from './dates'
import { STREAK_BONUS, STREAK_MILESTONES } from '../data/xp'

/**
 * Streaks are computed from real, logged workout dates. No freezes, no
 * purchases, no "grace" that silently invents a day you did not train.
 *
 * One deliberate leniency: a streak trained *yesterday* but not yet today is
 * still reported as current, because the day is not over. `currentIncludingToday`
 * distinguishes the two so the UI can say "train today to keep it" instead of
 * implying the streak is already safe.
 */

export function uniqueSortedDates(dates: Iterable<string>): string[] {
  const set = new Set<string>()
  for (const d of dates) if (isValidDateKey(d)) set.add(d)
  return [...set].sort()
}

/** Length of the consecutive-day run ending on `last` (inclusive). */
function runEndingOn(dates: Set<string>, last: string): number {
  let count = 0
  let cursor = last
  while (dates.has(cursor)) {
    count++
    cursor = addDays(cursor, -1)
  }
  return count
}

export function computeStreak(dates: Iterable<string>, today = todayKey()): StreakInfo {
  const sorted = uniqueSortedDates(dates)
  const set = new Set(sorted)

  if (sorted.length === 0) {
    return {
      current: 0,
      longest: 0,
      currentIncludingToday: false,
      totalDays: 0,
    }
  }

  // Longest run anywhere in history.
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    if (diffDays(sorted[i - 1], sorted[i]) === 1) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // Current run: from today, or from yesterday if today has no session yet.
  const trainedToday = set.has(today)
  const anchor = trainedToday ? today : addDays(today, -1)
  const current = set.has(anchor) ? runEndingOn(set, anchor) : 0

  return {
    current,
    longest: Math.max(longest, current),
    currentIncludingToday: trainedToday,
    lastWorkoutDate: sorted[sorted.length - 1],
    totalDays: sorted.length,
  }
}

/** Streak day-counts that have been reached, ascending. */
export function milestonesReached(streakLength: number): number[] {
  return STREAK_MILESTONES.filter((m) => streakLength >= m)
}

/** The next streak milestone and how many days away it is. */
export function nextStreakMilestone(streakLength: number): { days: number; bonus: number } | null {
  const next = STREAK_MILESTONES.find((m) => m > streakLength)
  if (next == null) return null
  return { days: next - streakLength, bonus: STREAK_BONUS[next] ?? 0 }
}

export function streakBonusFor(dayCount: number): number {
  return STREAK_BONUS[dayCount] ?? 0
}

/**
 * Weeks in which the user completed every session their programme scheduled.
 *
 * A week counts only when the user was actually following a programme that week
 * (at least one session carries a `programId`) and the number of distinct days
 * trained meets or exceeds that programme's `daysPerWeek`. Weeks with no
 * programme attached are ignored rather than counted as failures — otherwise a
 * single ad-hoc session would register as a broken week.
 */
export function perfectWeeks(
  sessions: { date: string; programId?: string }[],
  daysPerWeek: (programId: string) => number,
  weekStartsOn: 0 | 1 = 1,
): { weekStart: string; programId: string; scheduled: number; completed: number }[] {
  const byWeek = new Map<string, Map<string, Set<string>>>()

  for (const s of sessions) {
    if (!isValidDateKey(s.date) || !s.programId) continue
    const weekStart = startOfWeek(s.date, weekStartsOn)
    if (!byWeek.has(weekStart)) byWeek.set(weekStart, new Map())
    const programs = byWeek.get(weekStart)!
    if (!programs.has(s.programId)) programs.set(s.programId, new Set())
    programs.get(s.programId)!.add(s.date)
  }

  const out: { weekStart: string; programId: string; scheduled: number; completed: number }[] = []
  for (const [weekStart, programs] of byWeek) {
    for (const [programId, dates] of programs) {
      const scheduled = daysPerWeek(programId)
      if (scheduled <= 0) continue
      out.push({ weekStart, programId, scheduled, completed: dates.size })
    }
  }
  return out.sort((a, b) => a.weekStart.localeCompare(b.weekStart))
}

export function perfectWeekCount(
  sessions: { date: string; programId?: string }[],
  daysPerWeek: (programId: string) => number,
  weekStartsOn: 0 | 1 = 1,
): number {
  return perfectWeeks(sessions, daysPerWeek, weekStartsOn).filter((w) => w.completed >= w.scheduled).length
}

/**
 * Attendance rate per week, for the consistency chart. Only weeks with at least
 * one session are included, so empty weeks do not drag the average down — that
 * would misrepresent a user who started training three weeks ago.
 */
export function weeklyAttendance(
  sessions: { date: string; programId?: string }[],
  daysPerWeek: (programId: string) => number,
  weekStartsOn: 0 | 1 = 1,
): { weekStart: string; rate: number; completed: number; scheduled: number }[] {
  return perfectWeeks(sessions, daysPerWeek, weekStartsOn).map((w) => ({
    weekStart: w.weekStart,
    scheduled: w.scheduled,
    completed: w.completed,
    rate: w.scheduled > 0 ? Math.min(1, w.completed / w.scheduled) : 0,
  }))
}
