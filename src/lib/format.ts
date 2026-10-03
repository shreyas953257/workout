/** Display formatting. Pure, locale-stable, and unit-aware. */

import type { SetUnit } from '../types'

export const KG_PER_LB = 0.45359237
export const LB_PER_KG = 1 / KG_PER_LB

export function kgToLb(kg: number): number {
  return kg * LB_PER_KG
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

/**
 * Display a mass in the user's chosen unit. `stored` is always the unit the
 * profile says, so this never silently converts persisted data.
 */
export function formatWeight(value: number, units: 'kg' | 'lb' = 'kg', digits?: number): string {
  if (!Number.isFinite(value)) return '—'
  const d = digits ?? (Math.abs(value) >= 100 || Number.isInteger(value) ? 0 : 1)
  return `${round(value, d)} ${units}`
}

/** Just the number, for inputs and tight table cells. */
export function weightValue(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return ''
  return String(round(value, digits))
}

export function round(n: number, digits = 0): number {
  if (!Number.isFinite(n)) return 0
  const f = 10 ** digits
  return Math.round(n * f) / f
}

export function formatNumber(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—'
  return round(n, digits).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

/** 12400 → "12.4k", 1_240_000 → "1.24M". Used for volume and XP totals. */
export function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs < 1000) return String(round(n, abs < 10 ? 1 : 0))
  if (abs < 1_000_000) return `${round(n / 1000, abs < 10_000 ? 1 : 0)}k`
  if (abs < 1_000_000_000) return `${round(n / 1_000_000, 2)}M`
  return `${round(n / 1_000_000_000, 2)}B`
}

/** 78 → "1 h 18 min", 42 → "42 min", 0.5 → "30 s" */
export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  if (minutes < 1) return `${Math.round(minutes * 60)} s`
  const total = Math.round(minutes)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** 90 → "1:30" — for the rest timer. */
export function formatTimer(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds))
  const m = Math.floor(s / 60)
  const rem = s % 60
  return `${m}:${String(rem).padStart(2, '0')}`
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return `${round(value, digits)}%`
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return `${formatNumber(count)} ${count === 1 ? singular : (plural ?? `${singular}s`)}`
}

export function formatUnitValue(value: number, unit: SetUnit, perSide = false): string {
  const suffix = unit === 'seconds' ? 's' : unit === 'metres' ? ' m' : ''
  const side = perSide ? '/side' : ''
  return `${round(value, unit === 'reps' ? 0 : 1)}${suffix}${side}`
}

export const UNIT_LABEL: Record<SetUnit, string> = {
  reps: 'reps',
  seconds: 'seconds',
  metres: 'metres',
}

export const UNIT_SHORT: Record<SetUnit, string> = {
  reps: '',
  seconds: 's',
  metres: 'm',
}

/** "60 kg × 5" / "45 s" / "40 m" — the canonical set description. */
export function formatSet(weight: number, reps: number, unit: SetUnit, units: 'kg' | 'lb' = 'kg'): string {
  if (unit === 'seconds') return `${reps} s`
  if (unit === 'metres') return `${reps} m`
  if (weight > 0) return `${round(weight, 1)} ${units} × ${reps}`
  return `${reps} reps`
}

export function titleCase(input: string): string {
  return input
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`
}

/** Initials for the profile avatar — falls back to a neutral glyph. */
export function initials(name?: string): string {
  const clean = (name ?? '').trim()
  if (!clean) return '⌀'
  const parts = clean.split(/\s+/).slice(0, 2)
  return parts.map((p) => p.charAt(0).toUpperCase()).join('') || clean.charAt(0).toUpperCase()
}

/** Deterministic 0–359 hue from a string — used for avatar and chart accents. */
export function hueFromString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) % 360
  return h
}
