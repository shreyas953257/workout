import type { ThemeId } from '../types'

/**
 * Visual themes. Each maps to a `[data-theme="…"]` block in
 * `src/styles/themes.css`; the values here drive the in-app swatches and the
 * unlock copy, so the picker never shows a colour the CSS does not implement.
 */

export interface ThemeDef {
  id: ThemeId
  name: string
  tagline: string
  /** Swatch colours, in the order the CSS declares them. */
  accent: string
  accent2: string
  accent3: string
  bg: string
  /** Set when the theme is gated behind an unlock. */
  unlockId?: string
  /** Shown while locked. */
  requirement?: string
}

export const THEMES: readonly ThemeDef[] = Object.freeze([
  {
    id: 'ember',
    name: 'Ember',
    tagline: 'The default. Warm iron, low light, everything else out of the way.',
    accent: '#ff8a3d',
    accent2: '#ff4d6d',
    accent3: '#a855f7',
    bg: '#08090c',
  },
  {
    id: 'frost',
    name: 'Frost',
    tagline: 'Cold steel and early-morning gym light.',
    accent: '#5ad1ff',
    accent2: '#4f7cff',
    accent3: '#8b5cf6',
    bg: '#060a10',
    unlockId: 'theme-frost',
    requirement: 'Reach level 3',
  },
  {
    id: 'voltage',
    name: 'Voltage',
    tagline: 'High-contrast acid green. For the days you need it loud.',
    accent: '#b6ff3d',
    accent2: '#00e5a0',
    accent3: '#5ad1ff',
    bg: '#070b07',
    unlockId: 'theme-voltage',
    requirement: 'Reach level 6',
  },
  {
    id: 'verdant',
    name: 'Verdant',
    tagline: 'Deep forest. Calm, steady, unshowy.',
    accent: '#5fd08a',
    accent2: '#a3d94a',
    accent3: '#2fb3a0',
    bg: '#060b08',
    unlockId: 'theme-verdant',
    requirement: 'Complete 15 workouts',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    tagline: 'Near-monochrome. One accent, everything else black glass.',
    accent: '#e6e9f2',
    accent2: '#9aa3b8',
    accent3: '#ff6b4a',
    bg: '#050506',
    unlockId: 'theme-obsidian',
    requirement: 'Hold a 14-day streak',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    tagline: 'The endgame palette. Earned, not bought.',
    accent: '#c084fc',
    accent2: '#22d3ee',
    accent3: '#f472b6',
    bg: '#07060f',
    unlockId: 'theme-aurora',
    requirement: 'Reach level 10',
  },
])

export const THEME_MAP: Readonly<Record<ThemeId, ThemeDef>> = Object.fromEntries(
  THEMES.map((t) => [t.id, t]),
) as Readonly<Record<ThemeId, ThemeDef>>

export const DEFAULT_THEME: ThemeId = 'ember'

export function getTheme(id: ThemeId | string | undefined): ThemeDef {
  return THEME_MAP[(id ?? DEFAULT_THEME) as ThemeId] ?? THEME_MAP[DEFAULT_THEME]
}

/** Rank tiers reuse the same metallic ramp as achievements. */
export const TIER_COLORS: Record<string, { from: string; to: string; glow: string }> = {
  bronze: { from: '#c98b52', to: '#8a5a2b', glow: 'rgba(201,139,82,.35)' },
  silver: { from: '#d7dce8', to: '#8d96ab', glow: 'rgba(215,220,232,.30)' },
  gold: { from: '#ffd166', to: '#e0a020', glow: 'rgba(255,209,102,.38)' },
  platinum: { from: '#9be8ff', to: '#5b9fd6', glow: 'rgba(155,232,255,.38)' },
  mythic: { from: '#e0aaff', to: '#9d4edd', glow: 'rgba(224,170,255,.45)' },
}
