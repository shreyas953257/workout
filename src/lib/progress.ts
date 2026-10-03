import type {
  AchievementState,
  Goal,
  Preferences,
  Profile,
  ProgressSnapshot,
  StreakInfo,
  UnlockEvent,
  WeeklyBucket,
  WorkoutSession,
  XpEvent,
  XpKind,
} from '../types'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../data/achievements'
import { UNLOCKS, UNLOCK_MAP } from '../data/unlocks'
import { GOAL_MILESTONE_XP, GOAL_XP, PR_XP, PR_XP_SESSION_CAP, STREAK_BONUS, STREAK_MILESTONES } from '../data/xp'
import { levelForXp, levelInfo, titleForLevel, xpToReachLevel } from '../data/levels'
import { StatsAccumulator, emptyStats, type ProgressStats } from './stats'
import { evaluateAchievement } from './achievements'
import { evaluateUnlock } from './unlocks'
import { scanPersonalRecords, type PrScanResult } from './prs'
import { sessionBaseXp, sessionCompletedSets } from './xp'
import { addDays, eachDayBetween, startOfWeek, toDateKey, todayKey } from './dates'

/**
 * The progress engine.
 *
 * Everything the user has *earned* is derived here by replaying the log in
 * chronological order. XP, level, streaks, achievements, unlocks and personal
 * records are all pure functions of the stored sessions and goals, which means:
 *
 *   · they cannot drift out of sync with the log
 *   · they cannot be faked or granted for merely opening the app
 *   · deleting a session correctly removes everything it awarded
 *   · each achievement and unlock has a real timestamp and a real reason
 *
 * The replay is memoised by the store, so it runs once per data change.
 */

export interface ReplayInput {
  sessions: readonly WorkoutSession[]
  goals: readonly Goal[]
  profile?: Profile
  preferences?: Preferences
  /** Ids already shown to the user, so the toast queue does not repeat them. */
  acknowledged?: readonly string[]
  today?: string
}

type TimelineItem =
  | { kind: 'session'; at: string; session: WorkoutSession }
  | { kind: 'goal'; at: string; goal: Goal }
  | { kind: 'milestone'; at: string; goal: Goal; label: string }

const MAX_WEEKS = 200
const MAX_CONVERGENCE_PASSES = 24

export function sortSessions(sessions: readonly WorkoutSession[]): WorkoutSession[] {
  return [...sessions].sort((a, b) => {
    const byDate = (a.date || toDateKey(a.completedAt)).localeCompare(b.date || toDateKey(b.completedAt))
    if (byDate !== 0) return byDate
    const byEnd = (a.completedAt || '').localeCompare(b.completedAt || '')
    if (byEnd !== 0) return byEnd
    return a.id.localeCompare(b.id)
  })
}

function buildTimeline(sessions: readonly WorkoutSession[], goals: readonly Goal[]): TimelineItem[] {
  const items: TimelineItem[] = sessions.map((s) => ({ kind: 'session', at: s.completedAt || s.startedAt, session: s }))

  for (const goal of goals) {
    if (goal.completedAt) {
      items.push({ kind: 'goal', at: goal.completedAt, goal })
    }
    for (const m of goal.milestones) {
      if (m.done) items.push({ kind: 'milestone', at: m.completedAt ?? goal.createdAt, goal, label: m.label })
    }
  }

  return items.sort((a, b) => a.at.localeCompare(b.at) || orderRank(a) - orderRank(b))
}

function orderRank(item: TimelineItem): number {
  // Sessions first at an identical timestamp, so a goal completed "after a
  // workout" sees that workout's contribution.
  return item.kind === 'session' ? 0 : item.kind === 'milestone' ? 1 : 2
}

export function computeProgress(input: ReplayInput): ProgressSnapshot {
  const today = input.today ?? todayKey()
  const weekStartsOn = input.preferences?.weekStartsOn ?? 1
  const acknowledged = new Set(input.acknowledged ?? [])

  const logged = sortSessions(input.sessions)
  // A session in which nothing was actually completed stays in the history as a
  // note, but it is not a workout: it earns no XP, extends no streak, sets no
  // record and unlocks nothing. Otherwise an empty log could be spammed.
  const sorted = logged.filter((s) => sessionCompletedSets(s) > 0)
  const prScan = scanPersonalRecords(sorted)

  // Group the PR *events* — unlike the per-session snapshots these carry the
  // previous best, which is what separates a real improvement from the first
  // time an exercise was ever logged. Baselines earn no credit.
  const prEventsBySession = new Map<string, PrScanResult['events']>()
  for (const event of prScan.events) {
    const list = prEventsBySession.get(event.sessionId)
    if (list) list.push(event)
    else prEventsBySession.set(event.sessionId, [event])
  }

  const acc = new StatsAccumulator(weekStartsOn, input.profile)
  const timeline = buildTimeline(sorted, input.goals)

  let xp = 0
  const xpEvents: XpEvent[] = []
  const xpByDay: Record<string, number> = {}
  const levelHistory: { level: number; at: string }[] = [{ level: 1, at: timeline[0]?.at ?? new Date().toISOString() }]
  const achievementMeta = new Map<string, { unlockedAt: string; reason: string }>()
  const unlockEvents: UnlockEvent[] = []
  const unlockedIds = new Set<string>()
  const awardedStreakMilestones = new Set<number>()
  let currentLevel = 1

  const pushXp = (amount: number, kind: XpKind, label: string, at: string, date: string, sessionId?: string) => {
    if (!Number.isFinite(amount) || amount <= 0) return
    xp += amount
    xpEvents.push({ at, date, amount, cumulative: xp, kind, label, sessionId })
    xpByDay[date] = (xpByDay[date] ?? 0) + amount
  }

  const syncLevel = (at: string) => {
    const next = levelForXp(xp)
    if (next > currentLevel) {
      for (let l = currentLevel + 1; l <= next; l++) {
        levelHistory.push({ level: l, at })
      }
      currentLevel = next
    }
    acc.setLevel(currentLevel, xp)
  }

  // Achievements still to be won. Shrinks as the replay proceeds, which keeps
  // the per-item evaluation cost bounded.
  let pending = ACHIEVEMENTS.filter((a) => !achievementMeta.has(a.id))

  const checkAchievements = (at: string, date: string, trigger: string) => {
    if (pending.length === 0) return
    const stats = acc.toStats()
    const stillPending: typeof pending = []
    for (const achievement of pending) {
      const result = evaluateAchievement(achievement, stats)
      if (result.met) {
        achievementMeta.set(achievement.id, {
          unlockedAt: at,
          reason: `${trigger} — ${achievement.requirement}`,
        })
        pushXp(achievement.xp, 'achievement', achievement.name, at, date)
      } else {
        stillPending.push(achievement)
      }
    }
    pending = stillPending
    syncLevel(at)
  }

  const checkUnlocks = (at: string) => {
    const stats = acc.toStats()
    for (const unlock of UNLOCKS) {
      if (unlockedIds.has(unlock.id)) continue
      const result = evaluateUnlock(unlock, stats, achievementMeta.size)
      if (result.met) {
        unlockedIds.add(unlock.id)
        unlockEvents.push({
          id: unlock.id,
          name: unlock.name,
          kind: unlock.kind,
          unlockedAt: at,
          reason: result.metBy ? `Reached ${result.metBy}` : `Reached ${unlock.requirement}`,
          levelAtUnlock: currentLevel,
          xpAtUnlock: xp,
          grants: unlock.grants,
        })
      }
    }
  }

  for (const item of timeline) {
    if (item.kind === 'session') {
      const session = item.session
      const date = session.date || toDateKey(session.completedAt)
      const at = session.completedAt || session.startedAt

      acc.addSession(session)

      // 1 · The work itself.
      const base = sessionBaseXp(session)
      for (const award of base.breakdown) {
        pushXp(award.amount, award.kind, award.label, at, date, session.id)
      }

      // 2 · Records actually *beaten* in this session.
      const sessionPrs = (prEventsBySession.get(session.id) ?? []).filter((e) => e.previous > 0)
      acc.addPrEvents(sessionPrs.length)
      let prXp = 0
      for (const pr of sessionPrs) {
        const amount = PR_XP[pr.kind] ?? 0
        prXp = Math.min(prXp + amount, PR_XP_SESSION_CAP)
      }
      if (prXp > 0) {
        pushXp(
          prXp,
          'pr',
          sessionPrs.length === 1
            ? `New record · ${sessionPrs[0].exerciseName}`
            : `${sessionPrs.length} new records`,
          at,
          date,
          session.id,
        )
      }

      // 3 · Streak milestones reached on this day. Awarded once per milestone
      //     ever, so breaking and rebuilding a streak cannot be farmed.
      const stats0 = acc.toStats()
      for (const milestone of STREAK_MILESTONES) {
        if (stats0.streak >= milestone && !awardedStreakMilestones.has(milestone)) {
          awardedStreakMilestones.add(milestone)
          pushXp(STREAK_BONUS[milestone] ?? 0, 'streak', `${milestone}-day streak`, at, date, session.id)
        }
      }

      syncLevel(at)
      checkAchievements(at, date, session.title || 'Workout completed')
      checkUnlocks(at)
    } else if (item.kind === 'goal') {
      const date = toDateKey(item.at)
      acc.addGoalCompletion()
      pushXp(GOAL_XP, 'goal', `Goal completed · ${item.goal.title}`, item.at, date)
      syncLevel(item.at)
      checkAchievements(item.at, date, `Completed "${item.goal.title}"`)
      checkUnlocks(item.at)
    } else {
      const date = toDateKey(item.at)
      pushXp(GOAL_MILESTONE_XP, 'goal-milestone', `Milestone · ${item.label}`, item.at, date)
      syncLevel(item.at)
      checkAchievements(item.at, date, `Milestone "${item.label}"`)
      checkUnlocks(item.at)
    }
  }

  // Convergence: XP from achievements can raise the level, which can satisfy
  // level- and XP-gated achievements and unlocks. Repeat until stable.
  for (let pass = 0; pass < MAX_CONVERGENCE_PASSES && (pending.length > 0 || unlockedIds.size < UNLOCKS.length); pass++) {
    const beforeXp = xp
    const beforeUnlocks = unlockedIds.size
    const at = timeline[timeline.length - 1]?.at ?? new Date().toISOString()
    const date = toDateKey(at)
    checkAchievements(at, date, 'Progress milestone')
    checkUnlocks(at)
    if (xp === beforeXp && unlockedIds.size === beforeUnlocks) break
  }

  // Records are final-state only; no evaluator reads them during the replay.
  acc.setRecords(prScan.records)
  const finalStats = acc.toStats()
  const achievements: AchievementState[] = ACHIEVEMENTS.map((a) => {
    const meta = achievementMeta.get(a.id)
    const result = evaluateAchievement(a, finalStats)
    const unlocked = Boolean(meta)
    return {
      id: a.id,
      unlocked,
      unlockedAt: meta?.unlockedAt,
      reason: meta?.reason,
      progress: unlocked ? result.target : Math.min(result.progress, result.target),
      target: result.target || 1,
    }
  })

  const newlyUnlocked = [
    ...[...achievementMeta.keys()].filter((id) => !acknowledged.has(`achievement:${id}`)).map((id) => `achievement:${id}`),
    ...unlockEvents.filter((u) => !acknowledged.has(`unlock:${u.id}`)).map((u) => `unlock:${u.id}`),
  ]

  return {
    xp,
    level: levelInfo(xp),
    levelHistory,
    xpEvents,
    xpByDay,
    streak: computeFinalStreak(sorted, today),
    achievements,
    unlockedIds: [...unlockedIds],
    unlockEvents,
    prs: prScan.records,
    prCount: prScan.events.length,
    totals: {
      workouts: finalStats.workouts,
      sets: finalStats.sets,
      volumeKg: Math.round(finalStats.volumeKg * 10) / 10,
      durationMin: Math.round(finalStats.durationMin),
      distinctExercises: finalStats.distinctExercises,
      goalsCompleted: finalStats.goalsCompleted,
      firstWorkoutAt: sorted[0]?.completedAt,
      lastWorkoutAt: sorted[sorted.length - 1]?.completedAt,
    },
    weekly: buildWeeklyBuckets(sorted, xpEvents, weekStartsOn, today),
    newlyUnlocked,
  }
}

/**
 * The streak shown in the UI is always measured against *today*, not against the
 * last session — otherwise a three-week break would still display the old run.
 */
export function computeFinalStreak(sessions: readonly WorkoutSession[], today = todayKey()): StreakInfo {
  const dates = new Set<string>()
  for (const s of sessions) {
    const key = s.date || toDateKey(s.completedAt)
    if (key) dates.add(key)
  }
  if (dates.size === 0) return { current: 0, longest: 0, currentIncludingToday: false, totalDays: 0 }

  const sorted = [...dates].sort()
  let longest = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(`${sorted[i - 1]}T12:00:00`).getTime()
    const cur = new Date(`${sorted[i]}T12:00:00`).getTime()
    if (Math.round((cur - prev) / 86_400_000) === 1) {
      run++
      if (run > longest) longest = run
    } else run = 1
  }

  const trainedToday = dates.has(today)
  const anchor = trainedToday ? today : addDays(today, -1)
  let current = 0
  if (dates.has(anchor)) {
    let cursor = anchor
    while (dates.has(cursor)) {
      current++
      cursor = addDays(cursor, -1)
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    currentIncludingToday: trainedToday,
    lastWorkoutDate: sorted[sorted.length - 1],
    totalDays: sorted.length,
  }
}

/**
 * Contiguous weekly buckets from the first session to the current week.
 * Empty weeks are kept as zeros on purpose: a gap in training should be visible
 * as a gap, not silently compressed out of the chart.
 */
export function buildWeeklyBuckets(
  sessions: readonly WorkoutSession[],
  xpEvents: readonly XpEvent[],
  weekStartsOn: 0 | 1 = 1,
  today = todayKey(),
): WeeklyBucket[] {
  if (sessions.length === 0) return []

  const firstDate = sessions
    .map((s) => s.date || toDateKey(s.completedAt))
    .filter(Boolean)
    .sort()[0]
  if (!firstDate) return []

  const start = startOfWeek(firstDate, weekStartsOn)
  const end = startOfWeek(today, weekStartsOn)
  const totalWeeks = Math.min(MAX_WEEKS, Math.max(1, Math.round((new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) / (7 * 86_400_000)) + 1))

  const buckets = new Map<string, WeeklyBucket>()
  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = addDays(start, i * 7)
    buckets.set(weekStart, { weekStart, label: weekStart, workouts: 0, sets: 0, volumeKg: 0, xp: 0, durationMin: 0 })
  }

  for (const s of sessions) {
    const date = s.date || toDateKey(s.completedAt)
    const key = startOfWeek(date, weekStartsOn)
    const bucket = buckets.get(key)
    if (!bucket) continue
    bucket.workouts++
    bucket.sets += s.completedSets || 0
    bucket.volumeKg += s.volumeKg || 0
    bucket.durationMin += s.durationMin || 0
  }

  for (const e of xpEvents) {
    const bucket = buckets.get(startOfWeek(e.date, weekStartsOn))
    if (bucket) bucket.xp += e.amount
  }

  return [...buckets.values()].map((b) => ({ ...b, volumeKg: Math.round(b.volumeKg * 10) / 10 }))
}

/** XP earned between two dates, inclusive. */
export function xpBetween(events: readonly XpEvent[], from: string, to: string): number {
  return events.filter((e) => e.date >= from && e.date <= to).reduce((n, e) => n + e.amount, 0)
}

/** Total XP that exists across every source — used by the profile "breakdown" panel. */
export function xpByKind(events: readonly XpEvent[]): Record<XpKind, number> {
  const out = {
    set: 0, workout: 0, volume: 0, pr: 0, streak: 0, achievement: 0, goal: 0, 'goal-milestone': 0,
  } as Record<XpKind, number>
  for (const e of events) out[e.kind] = (out[e.kind] ?? 0) + e.amount
  return out
}

/** Sessions that contributed to a specific date range. */
export function sessionsBetween(sessions: readonly WorkoutSession[], from: string, to: string): WorkoutSession[] {
  return sessions.filter((s) => {
    const d = s.date || toDateKey(s.completedAt)
    return d >= from && d <= to
  })
}

export { emptyStats, type ProgressStats }
export { ACHIEVEMENT_MAP, UNLOCK_MAP, UNLOCKS, titleForLevel, xpToReachLevel, eachDayBetween }
