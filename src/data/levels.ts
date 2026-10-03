import type { LevelInfo } from '../types'

/**
 * Level curve.
 *
 * Cumulative XP required to *reach* level n:  `50 · (n−1) · n`
 *
 *   L1     0        L5  1 000     L9  3 600    L13  7 800
 *   L2   100        L6  1 500    L10  4 500    L14  9 100
 *   L3   300        L7  2 100    L11  5 500    L15 10 500
 *   L4   600        L8  2 800    L12  6 600    L16 12 000
 *
 * The per-level requirement grows linearly (100, 200, 300, …), so early levels
 * come quickly — a single session reaches level 2 — and later levels demand real
 * consistency. There is no cap; past the last named title the level keeps
 * climbing and the title repeats with a numeral.
 */

export const xpToReachLevel = (level: number): number => {
  if (!Number.isFinite(level) || level <= 1) return 0
  return 50 * (level - 1) * level
}

/** Highest level whose threshold is <= xp. */
export function levelForXp(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 1
  // Invert 50(n-1)n <= xp  →  n <= (1 + sqrt(1 + 4·xp/50)) / 2
  const n = Math.floor((1 + Math.sqrt(1 + (4 * xp) / 50)) / 2)
  // Guard against floating-point drift at exact boundaries.
  let level = Math.max(1, n)
  while (xpToReachLevel(level + 1) <= xp) level++
  while (level > 1 && xpToReachLevel(level) > xp) level--
  return level
}

export type RankTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'mythic'

export interface LevelTitle {
  level: number
  title: string
  tier: RankTier
  /** One line shown on the level-up toast and the profile page. */
  blurb: string
}

export const TITLES: readonly LevelTitle[] = Object.freeze([
  { level: 1, title: 'Novice', tier: 'bronze', blurb: 'Everyone starts here. The bar is empty and the log is open.' },
  { level: 2, title: 'Apprentice', tier: 'bronze', blurb: 'You came back. That is the part most people never do.' },
  { level: 3, title: 'Regular', tier: 'bronze', blurb: 'The movements are familiar now. The weights are about to move.' },
  { level: 4, title: 'Dedicated', tier: 'silver', blurb: 'Consistency has stopped being effort and started being habit.' },
  { level: 5, title: 'Athlete', tier: 'silver', blurb: 'You train. There is a difference and everyone can see it.' },
  { level: 6, title: 'Contender', tier: 'silver', blurb: 'Progress is compounding. Do not interrupt it.' },
  { level: 7, title: 'Challenger', tier: 'gold', blurb: 'Heavy is normal now.' },
  { level: 8, title: 'Warrior', tier: 'gold', blurb: 'You show up on the days you did not want to.' },
  { level: 9, title: 'Champion', tier: 'gold', blurb: 'The log reads like a training diary, not a wish list.' },
  { level: 10, title: 'Elite', tier: 'gold', blurb: 'Ten levels. Most people quit somewhere around two.' },
  { level: 11, title: 'Ascendant', tier: 'platinum', blurb: 'Beyond the point where motivation matters.' },
  { level: 12, title: 'Titan', tier: 'platinum', blurb: 'Your starting weights are now your warm-up.' },
  { level: 13, title: 'Legend', tier: 'mythic', blurb: 'Nothing left to prove. Everything left to build.' },
])

const ROMAN = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

/**
 * Titles run to level 13 ("Legend"). Past that the title holds and gains a
 * numeral — Legend II at 14, Legend III at 15 — so progression never reads as a
 * demotion.
 */
export function titleForLevel(level: number): { title: string; tier: RankTier; blurb: string } {
  const hit = TITLES.find((t) => t.level === level)
  if (hit) return { title: hit.title, tier: hit.tier, blurb: hit.blurb }

  const first = TITLES[0]
  if (level < first.level) return { title: first.title, tier: first.tier, blurb: first.blurb }

  const last = TITLES[TITLES.length - 1]
  const extra = level - last.level
  const numeral = extra === 0 ? '' : (ROMAN[extra] ?? `+${extra}`)
  return {
    title: numeral ? `${last.title} ${numeral}` : last.title,
    tier: 'mythic',
    blurb: `Level ${level}. Still climbing.`,
  }
}

/** Full level state for a given XP total. `needed` is XP to the next level. */
export function levelInfo(xp: number): LevelInfo {
  const safeXp = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0
  const level = levelForXp(safeXp)
  const floor = xpToReachLevel(level)
  const ceiling = xpToReachLevel(level + 1)
  const span = Math.max(1, ceiling - floor)
  const into = Math.max(0, Math.min(span, safeXp - floor))
  const { title } = titleForLevel(level)
  return {
    level,
    title,
    xp: safeXp,
    floor,
    ceiling,
    into,
    needed: Math.max(0, ceiling - safeXp),
    pct: Math.round((into / span) * 1000) / 10,
  }
}

/** XP required for every level up to and including `max` — for the level chart. */
export function levelTable(max = 20): { level: number; xp: number; title: string; tier: RankTier }[] {
  return Array.from({ length: Math.max(1, max) }, (_, i) => {
    const level = i + 1
    const t = titleForLevel(level)
    return { level, xp: xpToReachLevel(level), title: t.title, tier: t.tier }
  })
}

/** Rough guide, using a realistic 45-minute intermediate session (~180 XP). */
export const XP_BENCHMARKS = {
  typicalSessionXp: 180,
  lightSessionXp: 110,
  hardSessionXp: 260,
} as const
