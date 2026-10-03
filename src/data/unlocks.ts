import type { UnlockDef } from '../types'

/**
 * Unlockable content.
 *
 * Every unlock is earned from real progress — level (which is itself derived
 * from logged XP), completed workouts, or streak length. Nothing is purchasable
 * and nothing unlocks by waiting.
 *
 * Gating policy: nothing *essential* is locked. The dashboard, all navigation,
 * the full exercise library, history, calendar, analytics, goals, profile,
 * import/export and settings are always available. What unlocks is extra
 * content — one advanced programme, harder exercise variations, alternate
 * visual themes, and two additive analytics panels.
 */

export const UNLOCKS: readonly UnlockDef[] = Object.freeze([
  /* ---------------- Programmes ---------------- */
  {
    id: 'program-intermediate',
    name: 'Intermediate Upper/Lower',
    description:
      'The four-day upper/lower split with top-set/back-off schemes and an eight-week cycle. Unlocked once the beginner stage has stopped being the right stimulus.',
    kind: 'program',
    grants: 'intermediate-upper-lower',
    condition: { type: 'any', of: [{ type: 'level', level: 4 }, { type: 'workouts', count: 10 }] },
    requirement: 'Reach level 4 or complete 10 workouts',
    icon: 'book',
  },

  /* ---------------- Exercise variations ---------------- */
  {
    id: 'variation-archer-push-up',
    name: 'Archer Push-Up',
    description: 'Rung 7 of the push-up ladder — a real step toward one-arm work.',
    kind: 'exercise',
    grants: 'archer-push-up',
    condition: { type: 'level', level: 5 },
    requirement: 'Reach level 5',
    icon: 'target',
  },
  {
    id: 'variation-weighted-pull-up',
    name: 'Weighted Pull-Up',
    description: 'Requires a solid set of 8–10 clean bodyweight pull-ups first.',
    kind: 'exercise',
    grants: 'weighted-pull-up',
    condition: { type: 'any', of: [{ type: 'level', level: 5 }, { type: 'workouts', count: 15 }] },
    requirement: 'Reach level 5 or complete 15 workouts',
    icon: 'weight',
  },
  {
    id: 'variation-nordic-curl',
    name: 'Nordic Curl Negative',
    description: 'Very demanding hamstring work. Build to it with band assistance and partial range.',
    kind: 'exercise',
    grants: 'nordic-curl',
    condition: { type: 'level', level: 5 },
    requirement: 'Reach level 5',
    icon: 'bolt',
  },
  {
    id: 'variation-pistol-squat',
    name: 'Pistol Squat',
    description: 'Top rung of the bodyweight squat ladder. Use a doorframe or band for assistance on the way there.',
    kind: 'exercise',
    grants: 'pistol-squat',
    condition: { type: 'any', of: [{ type: 'level', level: 6 }, { type: 'workouts', count: 20 }] },
    requirement: 'Reach level 6 or complete 20 workouts',
    icon: 'mountain',
  },
  {
    id: 'variation-handstand-push-up',
    name: 'Handstand Push-Up',
    description: 'Top rung of the overhead ladder. Use a wall for support and build the range gradually.',
    kind: 'exercise',
    grants: 'handstand-push-up',
    condition: { type: 'level', level: 8 },
    requirement: 'Reach level 8',
    icon: 'mountain',
  },

  /* ---------------- Themes ---------------- */
  {
    id: 'theme-frost',
    name: 'Frost theme',
    description: 'Cold steel and early-morning gym light.',
    kind: 'theme',
    grants: 'frost',
    condition: { type: 'level', level: 3 },
    requirement: 'Reach level 3',
    icon: 'palette',
  },
  {
    id: 'theme-verdant',
    name: 'Verdant theme',
    description: 'Deep forest. Calm, steady, unshowy.',
    kind: 'theme',
    grants: 'verdant',
    condition: { type: 'workouts', count: 15 },
    requirement: 'Complete 15 workouts',
    icon: 'palette',
  },
  {
    id: 'theme-voltage',
    name: 'Voltage theme',
    description: 'High-contrast acid green, for the days you need it loud.',
    kind: 'theme',
    grants: 'voltage',
    condition: { type: 'level', level: 6 },
    requirement: 'Reach level 6',
    icon: 'palette',
  },
  {
    id: 'theme-obsidian',
    name: 'Obsidian theme',
    description: 'Near-monochrome. One accent, everything else black glass.',
    kind: 'theme',
    grants: 'obsidian',
    condition: { type: 'streak', days: 14 },
    requirement: 'Hold a 14-day streak',
    icon: 'palette',
  },
  {
    id: 'theme-aurora',
    name: 'Aurora theme',
    description: 'The endgame palette. Earned, not bought.',
    kind: 'theme',
    grants: 'aurora',
    condition: { type: 'level', level: 10 },
    requirement: 'Reach level 10',
    icon: 'palette',
  },

  /* ---------------- Additive features ---------------- */
  {
    id: 'feature-e1rm',
    name: 'Estimated 1RM',
    description:
      'Epley projections on every personal record, plus a projected-max line on the analytics charts. Appears once you have enough logged sets for the estimate to mean anything.',
    kind: 'feature',
    grants: 'e1rm',
    condition: { type: 'workouts', count: 5 },
    requirement: 'Complete 5 workouts',
    icon: 'chart',
  },
  {
    id: 'feature-pr-trends',
    name: 'PR trend charts',
    description: 'Per-exercise progression charts and a projected-max trend line in Analytics.',
    kind: 'feature',
    grants: 'pr-trends',
    condition: { type: 'any', of: [{ type: 'workouts', count: 10 }, { type: 'level', level: 4 }] },
    requirement: 'Complete 10 workouts or reach level 4',
    icon: 'chart',
  },
])

export const UNLOCK_MAP: Readonly<Record<string, UnlockDef>> = Object.freeze(
  Object.fromEntries(UNLOCKS.map((u) => [u.id, u])),
)

export const UNLOCK_KINDS = [
  { id: 'all', label: 'All' },
  { id: 'program', label: 'Programmes' },
  { id: 'exercise', label: 'Variations' },
  { id: 'theme', label: 'Themes' },
  { id: 'feature', label: 'Features' },
] as const

export const UNLOCK_KIND_LABEL: Record<string, string> = {
  program: 'Programme',
  exercise: 'Exercise variation',
  theme: 'Visual theme',
  feature: 'Feature',
  title: 'Title',
}

/**
 * Assets that need no unlock at all, listed by the id the UI already uses for
 * them (`program:<id>` / `theme:<id>` / `exercise:<id>`). Nothing in this list
 * may appear as an unlock's `grants` value — that would mean the asset is both
 * free and gated.
 */
export const ALWAYS_UNLOCKED: readonly string[] = Object.freeze([
  'program:beginner-full-body',
  'program:home-minimal-equipment',
  'theme:ember',
])

/** True when an asset of this kind is free from the very first load. */
export function isAlwaysFree(kind: string, assetId: string): boolean {
  return ALWAYS_UNLOCKED.includes(`${kind}:${assetId}`)
}
