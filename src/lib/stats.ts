import type { PersonalRecord, Profile, WorkoutSession } from '../types'
import { getProgram } from '../data/programs'
import { addDays, isValidDateKey, startOfWeek } from './dates'
import { programmeWeek } from './program'
import { sessionCompletedSets, sessionVolumeKg } from './xp'

/**
 * The aggregate state every achievement, unlock and analytics panel reads from.
 *
 * `StatsAccumulator` maintains these incrementally as the replay engine walks
 * the session log chronologically, which is what lets an achievement be
 * attributed to the exact session that earned it — rather than being recomputed
 * from scratch against "now" and losing its unlock date.
 */

export interface ProgressStats {
  workouts: number
  sets: number
  volumeKg: number
  durationMin: number
  distinctExercises: number
  sessionsWithNotes: number
  deloadSessions: number
  weekendSessions: number
  /** Sessions started before 07:00 local time. */
  earlySessions: number
  /** Sessions started at or after 20:00 local time. */
  lateSessions: number
  streak: number
  longestStreak: number
  totalTrainingDays: number
  prEvents: number
  goalsCompleted: number
  programmeBlocks: number
  perfectWeeks: number
  level: number
  xp: number
  bodyweightKg?: number
  sessions: readonly WorkoutSession[]
  records: Readonly<Record<string, PersonalRecord>>
}

export function emptyStats(profile?: Profile): ProgressStats {
  return {
    workouts: 0,
    sets: 0,
    volumeKg: 0,
    durationMin: 0,
    distinctExercises: 0,
    sessionsWithNotes: 0,
    deloadSessions: 0,
    weekendSessions: 0,
    earlySessions: 0,
    lateSessions: 0,
    streak: 0,
    longestStreak: 0,
    totalTrainingDays: 0,
    prEvents: 0,
    goalsCompleted: 0,
    programmeBlocks: 0,
    perfectWeeks: 0,
    level: 1,
    xp: 0,
    bodyweightKg: profile?.bodyweightKg,
    sessions: [],
    records: {},
  }
}

const EARLY_HOUR = 7
const LATE_HOUR = 20

interface ProgramProgress {
  /** Date key of the first session on this programme — week 1 anchor. */
  startKey: string
  /** Programme-week numbers that have at least one session. */
  weeks: Set<number>
}

export class StatsAccumulator {
  private readonly exerciseIds = new Set<string>()
  private readonly trainingDates = new Set<string>()
  /** weekStart → programId → distinct dates trained */
  private readonly weekAttendance = new Map<string, Map<string, Set<string>>>()
  private readonly programProgress = new Map<string, ProgramProgress>()
  private readonly sessions: WorkoutSession[] = []

  workouts = 0
  sets = 0
  volumeKg = 0
  durationMin = 0
  sessionsWithNotes = 0
  deloadSessions = 0
  weekendSessions = 0
  earlySessions = 0
  lateSessions = 0
  streak = 0
  longestStreak = 0
  prEvents = 0
  goalsCompleted = 0
  level = 1
  xp = 0
  bodyweightKg?: number
  records: Record<string, PersonalRecord> = {}

  constructor(private readonly weekStartsOn: 0 | 1 = 1, profile?: Profile) {
    this.bodyweightKg = profile?.bodyweightKg
  }

  addSession(session: WorkoutSession): void {
    this.sessions.push(session)
    this.workouts++
    this.durationMin += session.durationMin || 0
    this.volumeKg += sessionVolumeKg(session)
    this.sets += sessionCompletedSets(session)

    if (session.notes && session.notes.trim()) this.sessionsWithNotes++
    if (session.deload) this.deloadSessions++

    const date = session.date
    if (isValidDateKey(date)) {
      const dow = new Date(`${date}T12:00:00`).getDay()
      if (dow === 0 || dow === 6) this.weekendSessions++
      this.trackAttendance(session)
    }

    const startHour = new Date(session.startedAt).getHours()
    if (Number.isFinite(startHour)) {
      if (startHour < EARLY_HOUR) this.earlySessions++
      if (startHour >= LATE_HOUR) this.lateSessions++
    }

    for (const log of session.exercises) {
      if (log.skipped) continue
      const counted = log.sets.some((s) => s.completed && !s.warmup)
      if (counted) this.exerciseIds.add(log.exerciseId)
    }
  }

  /** Called when a session is added and its date is known-valid. */
  private trackAttendance(session: WorkoutSession): void {
    const date = session.date
    if (!this.trainingDates.has(date)) {
      this.trainingDates.add(date)
      const run = this.runEndingOn(date)
      this.streak = run
      if (run > this.longestStreak) this.longestStreak = run
    } else {
      // A second session on the same day does not extend the streak, but the
      // current run is unchanged — recompute so out-of-order adds stay correct.
      this.streak = this.runEndingOn(this.latestDate() ?? date)
    }

    if (session.programId) {
      const weekStart = startOfWeek(date, this.weekStartsOn)
      let programs = this.weekAttendance.get(weekStart)
      if (!programs) {
        programs = new Map()
        this.weekAttendance.set(weekStart, programs)
      }
      let dates = programs.get(session.programId)
      if (!dates) {
        dates = new Set()
        programs.set(session.programId, dates)
      }
      dates.add(date)

      let prog = this.programProgress.get(session.programId)
      if (!prog) {
        prog = { startKey: date, weeks: new Set() }
        this.programProgress.set(session.programId, prog)
      }
      if (date < prog.startKey) prog.startKey = date
      prog.weeks.add(programmeWeek(prog.startKey, date, this.weekStartsOn))
    }
  }

  private runEndingOn(last: string): number {
    let count = 0
    let cursor = last
    while (this.trainingDates.has(cursor)) {
      count++
      cursor = addDays(cursor, -1)
    }
    return count
  }

  private latestDate(): string | undefined {
    let latest: string | undefined
    for (const d of this.trainingDates) if (!latest || d > latest) latest = d
    return latest
  }

  addPrEvents(count: number): void {
    this.prEvents += count
  }

  addGoalCompletion(): void {
    this.goalsCompleted++
  }

  setLevel(level: number, xp: number): void {
    this.level = level
    this.xp = xp
  }

  setRecords(records: Record<string, PersonalRecord>): void {
    this.records = records
  }

  /** Weeks where every session the programme scheduled was completed. */
  countPerfectWeeks(): number {
    let n = 0
    for (const programs of this.weekAttendance.values()) {
      for (const [programId, dates] of programs) {
        const scheduled = getProgram(programId)?.daysPerWeek ?? 0
        if (scheduled > 0 && dates.size >= scheduled) n++
      }
    }
    return n
  }

  /**
   * Programme blocks where every week in the block has at least one logged
   * session on that programme. Weeks are counted from the user's first session
   * on the programme, so the number reflects what they actually did.
   */
  countProgrammeBlocks(): number {
    let n = 0
    for (const [programId, prog] of this.programProgress) {
      const program = getProgram(programId)
      if (!program) continue
      for (const block of program.blocks) {
        if (block.weeks.every((w) => prog.weeks.has(w))) n++
      }
    }
    return n
  }

  /** Which programme block the user is currently inside, for display. */
  currentBlockInfo(): { programId: string; week: number; blocksDone: number } | null {
    let best: { programId: string; week: number; blocksDone: number } | null = null
    for (const [programId, prog] of this.programProgress) {
      const week = Math.max(...prog.weeks)
      const program = getProgram(programId)
      if (!program) continue
      const blocksDone = program.blocks.filter((b) => b.weeks.every((w) => prog.weeks.has(w))).length
      if (!best || week > best.week) best = { programId, week, blocksDone }
    }
    return best
  }

  toStats(): ProgressStats {
    return {
      workouts: this.workouts,
      sets: this.sets,
      volumeKg: this.volumeKg,
      durationMin: this.durationMin,
      distinctExercises: this.exerciseIds.size,
      sessionsWithNotes: this.sessionsWithNotes,
      deloadSessions: this.deloadSessions,
      weekendSessions: this.weekendSessions,
      earlySessions: this.earlySessions,
      lateSessions: this.lateSessions,
      streak: this.streak,
      longestStreak: this.longestStreak,
      totalTrainingDays: this.trainingDates.size,
      prEvents: this.prEvents,
      goalsCompleted: this.goalsCompleted,
      programmeBlocks: this.countProgrammeBlocks(),
      perfectWeeks: this.countPerfectWeeks(),
      level: this.level,
      xp: this.xp,
      bodyweightKg: this.bodyweightKg,
      sessions: [...this.sessions],
      records: this.records,
    }
  }
}
