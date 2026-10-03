import { describe, expect, it } from 'vitest'
import {
  COOLDOWN,
  EXERCISES,
  EXERCISE_MAP,
  PAIN_TRIAGE,
  WARMUP_MENUS,
  getExercise,
  rampUpSets,
  substitutionsFor,
} from '../src/data/exercises'
import { LADDERS, MAIN_LIFT_ROTATIONS, PROGRAMS, PROGRAM_MAP, PROGRESSION_LEVERS, getDay, getProgram, px } from '../src/data/programs'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, TOTAL_ACHIEVEMENT_XP } from '../src/data/achievements'
import { ALWAYS_UNLOCKED, UNLOCKS, UNLOCK_MAP, UNLOCK_KINDS, isAlwaysFree } from '../src/data/unlocks'
import { DEFAULT_THEME, THEMES, THEME_MAP, TIER_COLORS, getTheme } from '../src/data/themes'
import { DOC_GROUPS, DOC_MAP, DOCS, getDoc, readingTime } from '../src/data/docs'
import { SET_XP, STREAK_BONUS, STREAK_MILESTONES, PR_XP } from '../src/data/xp'
import { DELOAD_RULES, DELOAD_SIGNS, RPE_OPTIONS, RPE_SCALE, RPE_ANCHORS, STALLING_STEPS, estimatedOneRepMax } from '../src/data/rpe'
import { TITLES, levelForXp, levelTable, titleForLevel, xpToReachLevel } from '../src/data/levels'
import type { AchievementCondition, UnlockCondition } from '../src/types'

const DOC_PATHS = new Set(DOCS.map((d) => d.path))

const ACHIEVEMENT_CONDITIONS = new Set<string>([
  'workouts', 'sets', 'streak', 'longestStreak', 'prs', 'level', 'volume', 'duration',
  'distinctExercises', 'goalsCompleted', 'sessionsWithNotes', 'deloadSessions', 'programmeBlocks',
  'weekendSessions', 'earlySessions', 'lateSessions', 'longSessions', 'bodyweightMultiple',
  'perfectWeeks', 'xp',
])

const UNLOCK_CONDITIONS = new Set<string>(['level', 'workouts', 'streak', 'xp', 'achievements', 'volume', 'any'])

const ids = (items: readonly { id: string }[]) => items.map((i) => i.id)
const unique = (list: string[]) => new Set(list).size === list.length

describe('exercise library integrity', () => {
  it('has a substantial library with unique ids', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60)
    expect(unique(ids(EXERCISES))).toBe(true)
    expect(EXERCISES.length).toBe(Object.keys(EXERCISE_MAP).length)
  })

  it('gives every exercise the fields the UI renders', () => {
    for (const e of EXERCISES) {
      expect(e.name.length, e.id).toBeGreaterThan(1)
      expect(e.pattern, e.id).toBeTruthy()
      expect(e.tier, e.id).toBeTruthy()
      expect(e.unit, e.id).toBeTruthy()
      expect(e.muscles.length, e.id).toBeGreaterThan(0)
      expect(e.equipment.length, e.id).toBeGreaterThan(0)
      expect(e.cues.length, `${e.id} cues`).toBeGreaterThan(0)
      expect(e.commonErrors.length, `${e.id} errors`).toBeGreaterThan(0)
      expect(e.source, e.id).toBeTruthy()
      expect(e.xpPerSet, e.id).toBeGreaterThan(0)
      expect(Number.isFinite(e.xpPerSet), e.id).toBe(true)
    }
  })

  it('matches each exercise XP to its tier', () => {
    for (const e of EXERCISES) {
      expect(e.xpPerSet, `${e.id} xpPerSet`).toBe(SET_XP[e.tier])
    }
    expect(Object.keys(SET_XP).length).toBe(5)
  })

  it('points every substitution at a real exercise', () => {
    for (const e of EXERCISES) {
      for (const sub of e.substitutions) {
        expect(getExercise(sub), `${e.id} -> ${sub}`).toBeDefined()
        expect(sub, `${e.id} substitutes itself`).not.toBe(e.id)
      }
      expect(new Set(e.substitutions).size, `${e.id} duplicate subs`).toBe(e.substitutions.length)
    }
  })

  it('returns substitutions symmetrically enough to be useful', () => {
    const subs = substitutionsFor('back-squat')
    expect(subs.length).toBeGreaterThan(0)
    expect(subs.every((s) => s.id !== 'back-squat')).toBe(true)
    expect(substitutionsFor('not-a-real-exercise')).toEqual([])
  })

  it('records a plausible per-set duration for session estimates', () => {
    for (const e of EXERCISES) {
      if (e.estSetSeconds !== undefined) {
        expect(e.estSetSeconds, e.id).toBeGreaterThan(0)
        expect(e.estSetSeconds, e.id).toBeLessThanOrEqual(600)
      }
    }
  })

  it('gates advanced variations behind a real, matching unlock', () => {
    const gated = EXERCISES.filter((e) => e.advanced)
    expect(gated.length).toBeGreaterThan(0)
    for (const e of gated) {
      expect(e.unlockId, `${e.id} missing unlockId`).toBeTruthy()
      const unlock = UNLOCK_MAP[e.unlockId!]
      expect(unlock, `${e.id} unlock not found`).toBeDefined()
      expect(unlock.kind).toBe('exercise')
      expect(unlock.grants, `${e.id} grant mismatch`).toBe(e.id)
      expect(ALWAYS_UNLOCKED, `${e.id} should not be free`).not.toContain(e.unlockId)
    }
    // And nothing ungated should claim an unlock.
    for (const e of EXERCISES.filter((x) => !x.advanced)) {
      expect(e.unlockId, `${e.id} claims an unlock but is not gated`).toBeUndefined()
    }
  })

  it('never gates the essentials', () => {
    for (const essential of ['back-squat', 'bench-press', 'conventional-deadlift', 'overhead-press', 'barbell-row', 'push-up', 'pull-up', 'plank']) {
      expect(getExercise(essential), essential).toBeDefined()
      expect(getExercise(essential)!.advanced, `${essential} must stay free`).toBeFalsy()
    }
  })

  it('was transcribed from files that still exist in the repo', () => {
    for (const e of EXERCISES) {
      expect(DOC_PATHS.has(e.source), `${e.id} source ${e.source}`).toBe(true)
    }
  })

  it('ships warm-up, cool-down and pain guidance for every menu key', () => {
    for (const key of ['lower', 'upper', 'hinge', 'pull']) {
      expect(WARMUP_MENUS[key], `warmup ${key}`).toBeTruthy()
      expect(WARMUP_MENUS[key].length, `warmup ${key}`).toBeGreaterThan(0)
      for (const stage of WARMUP_MENUS[key]) {
        expect(stage.stage.length).toBeGreaterThan(3)
        expect(stage.drills.length).toBeGreaterThan(0)
        for (const d of stage.drills) {
          expect(d.name.length).toBeGreaterThan(3)
          expect(d.dose.length).toBeGreaterThan(0)
        }
      }
      expect(COOLDOWN[key], `cooldown ${key}`).toBeTruthy()
      expect(COOLDOWN[key].length).toBeGreaterThan(0)
    }
    expect(PAIN_TRIAGE.length).toBeGreaterThan(3)
    expect(PAIN_TRIAGE.every((p) => ['ok', 'caution', 'stop'].includes(p.verdict))).toBe(true)
  })

  it('produces a sane ramp-up ladder', () => {
    const ramp = rampUpSets(100, false)
    expect(ramp.length).toBeGreaterThan(1)
    const loads = ramp.map((r) => r.load)
    expect(loads).toEqual([...loads].sort((a, b) => a - b))
    expect(loads[loads.length - 1]).toBeLessThanOrEqual(100)
    expect(ramp.every((r) => r.load >= 0 && r.reps > 0)).toBe(true)
    expect(rampUpSets(0, true)).toEqual([])
  })
})

describe('programme integrity', () => {
  it('has three programmes with unique ids', () => {
    expect(PROGRAMS).toHaveLength(3)
    expect(unique(ids(PROGRAMS))).toBe(true)
    expect(Object.keys(PROGRAM_MAP)).toHaveLength(3)
    expect(getProgram('beginner-full-body')).toBeDefined()
    expect(getProgram('nope')).toBeUndefined()
    expect(getProgram()).toBeUndefined()
  })

  it('gives every programme the copy the detail page renders', () => {
    for (const p of PROGRAMS) {
      expect(p.name.length, p.id).toBeGreaterThan(2)
      expect(p.tagline.length, p.id).toBeGreaterThan(5)
      expect(p.overview.length, p.id).toBeGreaterThan(20)
      expect(p.whyItWorks.length, p.id).toBeGreaterThan(20)
      expect(p.equipment.length, p.id).toBeGreaterThan(0)
      expect(p.progressionRules.length, p.id).toBeGreaterThan(0)
      expect(p.notes.length, p.id).toBeGreaterThan(0)
      expect(p.daysPerWeek, p.id).toBeGreaterThan(0)
      expect(p.totalWeeks, p.id).toBeGreaterThan(0)
      expect(DOC_PATHS.has(p.sourceFile), `${p.id} sourceFile ${p.sourceFile}`).toBe(true)
    }
  })

  it('points every prescribed exercise at the library', () => {
    for (const p of PROGRAMS) {
      for (const day of p.days) {
        expect(day.exercises.length, `${p.id}/${day.id}`).toBeGreaterThan(0)
        for (const ex of day.exercises) {
          expect(getExercise(ex.exerciseId), `${p.id}/${day.id}/${ex.exerciseId}`).toBeDefined()
          expect(ex.sets, `${p.id}/${day.id}/${ex.exerciseId} sets`).toBeGreaterThan(0)
          expect(ex.target.length, `${p.id}/${day.id} target`).toBeGreaterThan(0)
          expect(ex.repsMin, `${p.id}/${day.id}`).toBeLessThanOrEqual(ex.repsMax)
          expect(ex.restSec, `${p.id}/${day.id}`).toBeGreaterThan(0)
          expect(ex.rpe.length, `${p.id}/${day.id}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('has unique days per programme and resolves them', () => {
    for (const p of PROGRAMS) {
      expect(unique(p.days.map((d) => d.id)), p.id).toBe(true)
      expect(p.days.length, p.id).toBeGreaterThan(0)
      for (const day of p.days) {
        expect(getDay(p.id, day.id)?.id).toBe(day.id)
        expect(day.name.length).toBeGreaterThan(2)
        expect(day.badge.length).toBeGreaterThan(0)
        expect(day.summary.length).toBeGreaterThan(5)
        expect(day.estimatedMin).toBeGreaterThan(0)
      }
      expect(getDay(p.id, 'nope')).toBeUndefined()
    }
  })

  it('schedules every day of the week at most once and names real days', () => {
    for (const p of PROGRAMS) {
      expect(p.schedule.length, p.id).toBeGreaterThan(0)
      const indexes = p.schedule.map((s) => s.dayIndex)
      expect(new Set(indexes).size, `${p.id} duplicate weekday`).toBe(indexes.length)
      for (const s of p.schedule) {
        expect(s.dayIndex, p.id).toBeGreaterThanOrEqual(0)
        expect(s.dayIndex, p.id).toBeLessThanOrEqual(6)
        expect(s.day.length, p.id).toBeGreaterThan(1)
        if (s.dayId) {
          expect(getDay(p.id, s.dayId), `${p.id} schedule -> ${s.dayId}`).toBeDefined()
        }
      }
    }
  })

  it('covers every week in exactly one block', () => {
    for (const p of PROGRAMS) {
      const weeks = p.blocks.flatMap((b) => b.weeks)
      const expected = Array.from({ length: p.totalWeeks }, (_, i) => i + 1)
      expect([...weeks].sort((a, b) => a - b), p.id).toEqual(expected)
      expect(unique(p.blocks.map((b) => b.id)), p.id).toBe(true)
      for (const b of p.blocks) {
        expect(b.label.length, `${p.id}/${b.id}`).toBeGreaterThan(1)
        expect(b.headline.length, `${p.id}/${b.id}`).toBeGreaterThan(3)
        expect(b.detail.length, `${p.id}/${b.id}`).toBeGreaterThan(10)
        for (const o of b.overrides ?? []) {
          if (o.loadFactor !== undefined) {
            expect(o.loadFactor, `${p.id}/${b.id}`).toBeGreaterThan(0)
            expect(o.loadFactor, `${p.id}/${b.id}`).toBeLessThanOrEqual(1)
          }
          if (o.positions) {
            expect(o.positions.length).toBeGreaterThan(0)
          }
          if (o.setDelta !== undefined) {
            expect(Number.isFinite(o.setDelta)).toBe(true)
          }
        }
      }
    }
  })

  it('flags deload weeks so the session screen can warn', () => {
    const deloadWeeks = PROGRAMS.flatMap((p) => p.blocks.filter((b) => b.deload).flatMap((b) => b.weeks))
    expect(deloadWeeks.length).toBeGreaterThan(0)
  })

  it('gates at most one programme, behind a real unlock', () => {
    const gated = PROGRAMS.filter((p) => p.unlockId)
    expect(gated.length).toBeLessThanOrEqual(1)
    for (const p of gated) {
      const unlock = UNLOCK_MAP[p.unlockId!]
      expect(unlock, `${p.id} unlock`).toBeDefined()
      expect(unlock.kind).toBe('program')
      expect(unlock.grants).toBe(p.id)
    }
    // The beginner and home programmes must always be reachable.
    expect(getProgram('beginner-full-body')!.unlockId).toBeUndefined()
    expect(getProgram('home-minimal-equipment')!.unlockId).toBeUndefined()
  })

  it('ships ladders whose rungs resolve', () => {
    expect(LADDERS.length).toBeGreaterThanOrEqual(4)
    for (const l of LADDERS) {
      expect(l.rungs.length, l.id).toBeGreaterThan(2)
      expect(l.typicalStart, l.id).toBeGreaterThanOrEqual(0)
      expect(l.typicalStart, l.id).toBeLessThan(l.rungs.length)
      for (const r of l.rungs) {
        expect(r.label.length, l.id).toBeGreaterThan(2)
        if (r.exerciseId) expect(getExercise(r.exerciseId), `${l.id} -> ${r.exerciseId}`).toBeDefined()
      }
      // At least one rung must be actionable from the library.
      expect(l.rungs.some((r) => r.exerciseId), l.id).toBe(true)
    }
  })

  it('ships rotation and progression tables pointing at real lifts', () => {
    expect(MAIN_LIFT_ROTATIONS.length).toBeGreaterThanOrEqual(4)
    for (const r of MAIN_LIFT_ROTATIONS) {
      expect(getExercise(r.exerciseId), r.lift).toBeDefined()
      expect(r.rotations.length).toBeGreaterThan(1)
    }
    expect(PROGRESSION_LEVERS.length).toBeGreaterThanOrEqual(5)
    for (const l of PROGRESSION_LEVERS) {
      expect(l.lever.length).toBeGreaterThan(1)
      expect(l.effect.length).toBeGreaterThan(5)
      expect(l.example.length).toBeGreaterThan(3)
    }
  })

  it('parses target strings into rep ranges and units', () => {
    const single = px('back-squat', 4, '5', '8', 180)
    expect(single.repsMin).toBe(5)
    expect(single.repsMax).toBe(5)
    expect(single.unit).toBe('reps')

    const range = px('bench-press', 3, '8–12', '7-8', 120)
    expect(range.repsMin).toBe(8)
    expect(range.repsMax).toBe(12)

    const timed = px('plank', 3, '45 s', '—', 60)
    expect(timed.unit).toBe('seconds')

    const distance = px('farmers-carry', 3, '40 m', '—', 90)
    expect(distance.unit).toBe('metres')
  })
})

describe('achievement catalogue integrity', () => {
  it('has unique ids and a full copy set', () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(40)
    expect(unique(ids(ACHIEVEMENTS))).toBe(true)
    expect(Object.keys(ACHIEVEMENT_MAP)).toHaveLength(ACHIEVEMENTS.length)
    for (const a of ACHIEVEMENTS) {
      expect(a.name.length, a.id).toBeGreaterThan(2)
      expect(a.description.length, a.id).toBeGreaterThan(10)
      expect(a.requirement.length, a.id).toBeGreaterThan(5)
      expect(a.icon.length, a.id).toBeGreaterThan(1)
      expect(a.xp, a.id).toBeGreaterThan(0)
      expect(Number.isFinite(a.xp), a.id).toBe(true)
    }
  })

  it('declares a positive XP total', () => {
    expect(TOTAL_ACHIEVEMENT_XP).toBe(ACHIEVEMENTS.reduce((n, a) => n + a.xp, 0))
  })

  it('uses only condition types this build can evaluate', () => {
    for (const a of ACHIEVEMENTS) {
      const c = a.condition as AchievementCondition
      expect(ACHIEVEMENT_CONDITIONS.has(c.type), `${a.id}: ${c.type}`).toBe(true)
      const numeric = Object.entries(c).filter(([k]) => k !== 'type' && k !== 'exerciseId')
      for (const [k, v] of numeric) {
        expect(typeof v, `${a.id}.${k}`).toBe('number')
        expect(Number.isFinite(v), `${a.id}.${k}`).toBe(true)
        if (k !== 'multiple') expect(v as number, `${a.id}.${k}`).toBeGreaterThan(0)
      }
    }
  })

  it('points bodyweight-multiple achievements at a real exercise', () => {
    const bodyweight = ACHIEVEMENTS.filter((a) => a.condition.type === 'bodyweightMultiple')
    expect(bodyweight.length).toBeGreaterThan(0)
    for (const a of bodyweight) {
      const c = a.condition as Extract<AchievementCondition, { type: 'bodyweightMultiple' }>
      expect(getExercise(c.exerciseId), a.id).toBeDefined()
      expect(c.multiple, a.id).toBeGreaterThan(0)
    }
  })

  it('does not award the same thing twice', () => {
    const signatures = ACHIEVEMENTS.map((a) => JSON.stringify(a.condition))
    expect(unique(signatures), 'duplicate condition').toBe(true)
  })

  it('covers every category and tier', () => {
    const categories = new Set(ACHIEVEMENTS.map((a) => a.category))
    const tiers = new Set(ACHIEVEMENTS.map((a) => a.tier))
    for (const c of ['volume', 'consistency', 'strength', 'milestone', 'exploration', 'discipline']) {
      expect(categories.has(c as never), c).toBe(true)
      expect(TIER_COLORS[c] ?? TIER_COLORS.bronze, c).toBeTruthy()
    }
    for (const t of ['bronze', 'silver', 'gold', 'platinum']) {
      expect(tiers.has(t as never), t).toBe(true)
    }
    expect(TIER_COLORS.mythic).toBeTruthy()
  })

  it('has a gentle opening that a first session can actually reach', () => {
    const easiest = [...ACHIEVEMENTS].sort((a, b) => a.xp - b.xp)[0]
    expect(easiest.xp).toBeLessThanOrEqual(25)
    expect(ACHIEVEMENTS.some((a) => a.condition.type === 'workouts' && (a.condition as { count: number }).count === 1)).toBe(true)
  })
})

describe('unlock catalogue integrity', () => {
  it('has unique ids and full copy', () => {
    expect(UNLOCKS.length).toBeGreaterThanOrEqual(10)
    expect(unique(ids(UNLOCKS))).toBe(true)
    expect(Object.keys(UNLOCK_MAP)).toHaveLength(UNLOCKS.length)
    for (const u of UNLOCKS) {
      expect(u.name.length, u.id).toBeGreaterThan(2)
      expect(u.description.length, u.id).toBeGreaterThan(10)
      expect(u.requirement.length, u.id).toBeGreaterThan(3)
      expect(u.icon.length, u.id).toBeGreaterThan(1)
      expect(UNLOCK_KINDS.some((k) => k.id === u.kind), `${u.id} kind`).toBe(true)
    }
  })

  it('uses only condition types this build can evaluate', () => {
    const walk = (c: UnlockCondition, path: string) => {
      expect(UNLOCK_CONDITIONS.has(c.type), path).toBe(true)
      if (c.type === 'any') {
        expect(c.of).toHaveLength(2)
        c.of.forEach((branch, i) => walk(branch, `${path}.of[${i}]`))
        return
      }
      const numeric = Object.entries(c).filter(([k]) => k !== 'type')
      for (const [k, v] of numeric) {
        expect(typeof v, `${path}.${k}`).toBe('number')
        expect(v as number, `${path}.${k}`).toBeGreaterThan(0)
      }
    }
    for (const u of UNLOCKS) walk(u.condition, u.id)
  })

  it('grants things that exist', () => {
    for (const u of UNLOCKS) {
      switch (u.kind) {
        case 'program':
          expect(getProgram(u.grants), u.id).toBeDefined()
          break
        case 'exercise':
          expect(getExercise(u.grants), u.id).toBeDefined()
          break
        case 'theme':
          expect(THEME_MAP[u.grants as never], u.id).toBeDefined()
          break
        default:
          expect(u.grants.length, u.id).toBeGreaterThan(0)
      }
    }
  })

  it('links every gated asset back to its unlock', () => {
    const grantingPrograms = UNLOCKS.filter((u) => u.kind === 'program').map((u) => u.grants)
    for (const p of PROGRAMS.filter((x) => x.unlockId)) {
      expect(grantingPrograms, p.id).toContain(p.id)
    }
    const grantingExercises = UNLOCKS.filter((u) => u.kind === 'exercise').map((u) => u.grants)
    for (const e of EXERCISES.filter((x) => x.advanced)) {
      expect(grantingExercises, e.id).toContain(e.id)
    }
    const grantingThemes = UNLOCKS.filter((u) => u.kind === 'theme').map((u) => u.grants)
    for (const t of THEMES.filter((x) => x.unlockId)) {
      expect(grantingThemes, t.id).toContain(t.id)
    }
  })

  it('never locks the default theme or the always-available set', () => {
    expect(THEME_MAP[DEFAULT_THEME].unlockId).toBeUndefined()
    expect(unique([...ALWAYS_UNLOCKED])).toBe(true)

    const granted = new Set(UNLOCKS.map((u) => u.grants))
    for (const entry of ALWAYS_UNLOCKED) {
      const [kind, assetId] = entry.split(':')
      expect(['program', 'theme', 'exercise'], entry).toContain(kind)
      if (kind === 'program') expect(getProgram(assetId), entry).toBeDefined()
      if (kind === 'theme') expect(THEME_MAP[assetId as never], entry).toBeDefined()
      if (kind === 'exercise') expect(getExercise(assetId), entry).toBeDefined()
      // Free and gated are mutually exclusive.
      expect(granted.has(assetId), `${entry} is also gated by an unlock`).toBe(false)
      expect(isAlwaysFree(kind, assetId), entry).toBe(true)
    }
    expect(isAlwaysFree('theme', 'aurora')).toBe(false)
  })

  it('is reachable — no unlock demands more than the whole catalogue can give', () => {
    const maxWorkouts = Math.max(...ACHIEVEMENTS.filter((a) => a.condition.type === 'workouts').map((a) => (a.condition as { count: number }).count))
    for (const u of UNLOCKS) {
      if (u.condition.type === 'workouts') {
        expect(u.condition.count).toBeLessThanOrEqual(Math.max(maxWorkouts, 100))
      }
      if (u.condition.type === 'achievements') {
        expect(u.condition.count).toBeLessThanOrEqual(ACHIEVEMENTS.length)
      }
    }
  })
})

describe('theme catalogue integrity', () => {
  it('has six themes with unique ids, including the default', () => {
    expect(THEMES).toHaveLength(6)
    expect(unique(ids(THEMES))).toBe(true)
    expect(THEMES.map((t) => t.id)).toContain(DEFAULT_THEME)
    expect(getTheme(DEFAULT_THEME).id).toBe(DEFAULT_THEME)
    expect(getTheme('not-a-theme').id).toBe(DEFAULT_THEME)
    expect(getTheme(undefined).id).toBe(DEFAULT_THEME)
  })

  it('ships swatches for every theme', () => {
    for (const t of THEMES) {
      expect(t.name.length, t.id).toBeGreaterThan(1)
      expect(t.tagline.length, t.id).toBeGreaterThan(3)
      for (const colour of [t.accent, t.accent2, t.accent3, t.bg]) {
        expect(colour, t.id).toMatch(/^#[0-9a-fA-F]{3,8}$/)
      }
      expect(t.accent, `${t.id} must differ from background`).not.toBe(t.bg)
      if (t.unlockId) {
        expect(UNLOCK_MAP[t.unlockId], t.id).toBeDefined()
        expect(t.requirement?.length, t.id).toBeGreaterThan(3)
      }
    }
  })

  it('leaves the default theme free and makes the next one reachable early', () => {
    expect(THEMES.filter((t) => !t.unlockId).length).toBeGreaterThanOrEqual(1)
    const themeUnlocks = UNLOCKS.filter((u) => u.kind === 'theme')
    expect(themeUnlocks.length).toBe(THEMES.length - 1)
    // The cheapest theme must be a couple of sessions away, not a grind.
    const cheapest = themeUnlocks
      .map((u) => (u.condition.type === 'level' ? u.condition.level : 99))
      .sort((a, b) => a - b)[0]
    expect(cheapest).toBeLessThanOrEqual(3)
    for (const t of THEMES.filter((x) => x.unlockId)) {
      expect(isAlwaysFree('theme', t.id)).toBe(false)
    }
  })
})

describe('documented Markdown integrity', () => {
  it('inlines all fourteen pages with unique ids', () => {
    expect(DOCS).toHaveLength(14)
    expect(unique(ids(DOCS))).toBe(true)
    expect(Object.keys(DOC_MAP)).toHaveLength(DOCS.length)
    expect(DOC_GROUPS.length).toBeGreaterThan(3)
    expect(unique(DOC_GROUPS.map((g) => g.id))).toBe(true)
  })

  it('carries real Markdown for every page', () => {
    for (const d of DOCS) {
      expect(d.content.length, `${d.id} content`).toBeGreaterThan(200)
      // Every page is real Markdown: a heading, a table, a list or (for the log
      // template) an HTML comment block that the reader is meant to copy.
      expect(d.content, `${d.id} has no Markdown structure`).toMatch(/^#\s|^<!--|^[ \t]*[-*|]/m)
      expect(d.title.length, d.id).toBeGreaterThan(2)
      expect(d.summary.length, d.id).toBeGreaterThan(10)
      expect(d.path, d.id).toMatch(/^[A-Za-z0-9_./-]+\.md$/)
      expect(DOC_GROUPS.some((g) => g.id === d.group), `${d.id} group`).toBe(true)
      expect(getDoc(d.id)?.id).toBe(d.id)
      expect(readingTime(d.content)).toBeGreaterThan(0)
    }
    expect(getDoc('nope')).toBeUndefined()
  })

  it('keeps the repo paths stable so "view source" works', () => {
    const expected = [
      'README.md', 'getting-started.md', 'goals.md',
      'logs/README.md', 'logs/_template.md', 'logs/2026-10.md',
      'programs/beginner-full-body-3day.md', 'programs/intermediate-upper-lower-4day.md', 'programs/home-minimal-equipment.md',
      'reference/exercise-library.md', 'reference/progression-rpe-deload.md', 'reference/warmup-and-cooldown.md',
      'tracking/body-measurements.md', 'tracking/personal-records.md',
    ]
    expect(ids(DOCS)).toHaveLength(expected.length)
    for (const path of expected) {
      expect(DOC_PATHS.has(path), path).toBe(true)
    }
  })

  it('links every programme doc group entry to a real route', () => {
    const programDocs = DOCS.filter((d) => d.group === 'programs')
    expect(programDocs.length).toBe(3)
    for (const d of programDocs) {
      const route = (d as unknown as { relatedRoute?: string }).relatedRoute
      if (route) {
        const programId = route.split('/').pop()
        expect(PROGRAM_MAP[programId!], `${d.id} -> ${route}`).toBeDefined()
      }
    }
  })
})

describe('level and reward table integrity', () => {
  it('has thirteen titles with unique levels', () => {
    expect(TITLES).toHaveLength(13)
    expect(unique(TITLES.map((t) => String(t.level)))).toBe(true)
    expect(TITLES.map((t) => t.level)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1))
    for (const t of TITLES) {
      expect(t.title.length).toBeGreaterThan(1)
      expect(t.blurb.length).toBeGreaterThan(3)
      expect(['bronze', 'silver', 'gold', 'platinum', 'mythic']).toContain(t.tier)
    }
  })

  it('has a strictly increasing curve that levelForXp inverts', () => {
    let previous = -1
    for (let level = 1; level <= 30; level++) {
      const xp = xpToReachLevel(level)
      expect(xp, `level ${level}`).toBeGreaterThan(previous)
      previous = xp
      expect(levelForXp(xp), `level ${level}`).toBe(level)
      if (level > 1) expect(levelForXp(xp - 1), `just under level ${level}`).toBe(level - 1)
    }
  })

  it('never demotes a past-13 athlete', () => {
    expect(titleForLevel(13).title).toContain('Legend')
    expect(titleForLevel(14).title).toContain('Legend')
    expect(titleForLevel(14).tier).toBe('mythic')
    expect(titleForLevel(999).title.length).toBeGreaterThan(0)
    expect(titleForLevel(0).title).toBe(titleForLevel(1).title)
    expect(titleForLevel(-5).title).toBe(titleForLevel(1).title)
  })

  it('builds a level table for the settings page', () => {
    const table = levelTable(20)
    expect(table).toHaveLength(20)
    expect(table[0].level).toBe(1)
    expect(table[19].xp).toBeGreaterThan(table[0].xp)
  })

  it('has ascending streak milestones with ascending rewards', () => {
    const milestones = STREAK_MILESTONES.map(Number)
    expect(milestones).toEqual([...milestones].sort((a, b) => a - b))
    expect(milestones[0]).toBe(3)
    const rewards = milestones.map((m) => STREAK_BONUS[m])
    expect(rewards).toEqual([...rewards].sort((a, b) => a - b))
    expect(rewards.every((r) => r > 0 && Number.isFinite(r))).toBe(true)
  })

  it('caps PR rewards sensibly', () => {
    expect(PR_XP.e1rm).toBeGreaterThan(PR_XP.weight)
    expect(PR_XP.weight).toBeGreaterThan(PR_XP.reps)
    expect(PR_XP.reps).toBeGreaterThan(PR_XP.volume)
    // One exercise can never earn more than the session cap on its own, so the
    // cap only binds when several records fall in the same session.
    expect(Math.max(...Object.values(PR_XP))).toBeLessThanOrEqual(150)
    expect(Object.values(PR_XP).every((v) => v > 0)).toBe(true)
  })

  it('ships the RPE and deload guidance the docs promise', () => {
    expect(RPE_SCALE.length).toBeGreaterThan(5)
    for (const step of RPE_SCALE) {
      expect(step.rpe).toBeGreaterThanOrEqual(5)
      expect(step.rpe).toBeLessThanOrEqual(10)
      expect(step.description.length).toBeGreaterThan(1)
      expect(step.rir.length).toBeGreaterThan(0)
      expect(step.intensity).toBeGreaterThanOrEqual(0)
      expect(step.intensity).toBeLessThanOrEqual(1)
    }
    for (const option of RPE_OPTIONS) {
      expect(RPE_SCALE.some((s) => s.rpe === option), `RPE ${option}`).toBe(true)
    }
    expect(RPE_ANCHORS.length).toBeGreaterThan(2)
    expect(STALLING_STEPS.length).toBeGreaterThan(4)
    expect(STALLING_STEPS.map((s) => s.step)).toEqual(STALLING_STEPS.map((s) => s.step).sort((a, b) => a - b))
    expect(DELOAD_RULES.length).toBeGreaterThan(4)
    expect(DELOAD_SIGNS.length).toBeGreaterThan(4)
  })

  it('computes an Epley one-rep max that degrades past ten reps', () => {
    expect(estimatedOneRepMax(100, 1)).toBe(100)
    expect(estimatedOneRepMax(100, 10)).toBeGreaterThan(100)
    expect(estimatedOneRepMax(100, 5)).toBeLessThan(estimatedOneRepMax(100, 10))
    expect(estimatedOneRepMax(100, 25)).toBe(estimatedOneRepMax(100, 10))
    expect(estimatedOneRepMax(0, 5)).toBe(0)
    expect(estimatedOneRepMax(100, 0)).toBe(0)
    expect(estimatedOneRepMax(100, -5)).toBe(0)
    expect(() => estimatedOneRepMax(Number.NaN, 5)).not.toThrow()
  })
})
