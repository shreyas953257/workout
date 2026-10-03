/**
 * Date helpers.
 *
 * Everything is in **local time**. `YYYY-MM-DD` keys are the canonical unit for
 * streaks, calendars and analytics, because a workout belongs to the day the
 * user experienced it — not to a UTC offset.
 *
 * Never use `new Date('2026-10-05')`: that parses as UTC midnight and shifts a
 * day for anyone east of Greenwich. Always go through `parseDateKey`.
 */

const MS_PER_DAY = 86_400_000

export const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateKey(key: unknown): key is string {
  if (typeof key !== 'string' || !DATE_KEY_RE.test(key)) return false
  const d = parseDateKey(key)
  return d !== null && toLocalDateKey(d) === key
}

/** `YYYY-MM-DD` for a Date, in local time. */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Accepts a Date, an ISO string, or an existing date key. Local time throughout. */
export function toDateKey(input: Date | string | number): string {
  if (input instanceof Date) return toLocalDateKey(input)
  if (typeof input === 'number') return toLocalDateKey(new Date(input))
  if (DATE_KEY_RE.test(input)) return input
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? '' : toLocalDateKey(parsed)
}

/** Local-midnight Date for a key, or null if the key is invalid. */
export function parseDateKey(key: string): Date | null {
  if (!DATE_KEY_RE.test(key)) return null
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return date
}

export function todayKey(now: Date = new Date()): string {
  return toLocalDateKey(now)
}

export function addDays(key: string, days: number): string {
  const d = parseDateKey(key)
  if (!d) return key
  d.setDate(d.getDate() + days)
  return toLocalDateKey(d)
}

/** Whole days from `a` to `b`. Negative when b precedes a. */
export function diffDays(a: string, b: string): number {
  const da = parseDateKey(a)
  const db = parseDateKey(b)
  if (!da || !db) return 0
  // Normalise to local midnight so DST changes cannot produce 23.9-hour days.
  const na = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime()
  const nb = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime()
  return Math.round((nb - na) / MS_PER_DAY)
}

export function isSameDay(a: string, b: string): boolean {
  return a === b
}

export function isBefore(a: string, b: string): boolean {
  return diffDays(a, b) > 0
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(key: string): number {
  return parseDateKey(key)?.getDay() ?? 0
}

export function isWeekend(key: string): boolean {
  const d = weekdayIndex(key)
  return d === 0 || d === 6
}

/** Monday-first index: Mon = 0 … Sun = 6. */
export function mondayIndex(key: string): number {
  return (weekdayIndex(key) + 6) % 7
}

export function startOfWeek(key: string, weekStartsOn: 0 | 1 = 1): string {
  const offset = weekStartsOn === 1 ? mondayIndex(key) : weekdayIndex(key)
  return addDays(key, -offset)
}

export function endOfWeek(key: string, weekStartsOn: 0 | 1 = 1): string {
  return addDays(startOfWeek(key, weekStartsOn), 6)
}

export function monthKey(key: string): string {
  return key.slice(0, 7)
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate()
}

/** Every date key from `from` to `to` inclusive. Returns [] for a reversed range. */
export function eachDayBetween(from: string, to: string, maxDays = 4000): string[] {
  const total = diffDays(from, to)
  if (total < 0) return []
  const count = Math.min(total + 1, maxDays)
  return Array.from({ length: count }, (_, i) => addDays(from, i))
}

export interface CalendarCell {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  weekday: number
}

/** Six-week grid covering the month, starting on `weekStartsOn`. */
export function calendarGrid(year: number, month1: number, weekStartsOn: 0 | 1 = 1, today = todayKey()): CalendarCell[][] {
  const first = `${year}-${String(month1).padStart(2, '0')}-01`
  const gridStart = startOfWeek(first, weekStartsOn)
  const weeks: CalendarCell[][] = []
  for (let w = 0; w < 6; w++) {
    const row: CalendarCell[] = []
    for (let d = 0; d < 7; d++) {
      const key = addDays(gridStart, w * 7 + d)
      const parsed = parseDateKey(key)
      if (!parsed) continue
      row.push({
        key,
        day: parsed.getDate(),
        inMonth: parsed.getMonth() === month1 - 1,
        isToday: key === today,
        weekday: parsed.getDay(),
      })
    }
    weeks.push(row)
  }
  return weeks
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const WEEKDAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

export function formatDate(key: string, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = parseDateKey(key)
  if (!d) return key
  const dow = WEEKDAY_SHORT[d.getDay()]
  const mon = MONTH_NAMES[d.getMonth()].slice(0, 3)
  if (style === 'short') return `${d.getDate()} ${mon}`
  if (style === 'long') {
    return `${WEEKDAY_SHORT[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
  }
  return `${dow} ${d.getDate()} ${mon} ${d.getFullYear()}`
}

export function formatMonthLabel(year: number, month1: number): string {
  return `${MONTH_NAMES[month1 - 1]} ${year}`
}

/** "today", "yesterday", "3 days ago", then a date. */
export function relativeDay(key: string, today = todayKey()): string {
  const delta = diffDays(key, today)
  if (delta === 0) return 'Today'
  if (delta === 1) return 'Yesterday'
  if (delta === -1) return 'Tomorrow'
  if (delta > 1 && delta < 7) return `${delta} days ago`
  if (delta < -1 && delta > -7) return `in ${-delta} days`
  return formatDate(key, 'short')
}

/** "2 h ago", "just now", "in 3 min" — for timestamps rather than dates. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diffSec = Math.round((now - t) / 1000)
  const abs = Math.abs(diffSec)
  const suffix = diffSec >= 0 ? 'ago' : ''
  const prefix = diffSec >= 0 ? '' : 'in '
  if (abs < 45) return diffSec >= 0 ? 'just now' : 'in a moment'
  if (abs < 3600) return `${prefix}${Math.round(abs / 60)} min${suffix}`
  if (abs < 86400) return `${prefix}${Math.round(abs / 3600)} h${suffix}`
  if (abs < 604800) return `${prefix}${Math.round(abs / 86400)} d${suffix}`
  return formatDate(toDateKey(new Date(t)), 'short')
}

export function formatClock(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/** ISO week number — used for weekly analytics buckets. */
export function isoWeekNumber(key: string): { year: number; week: number } {
  const d = parseDateKey(key)
  if (!d) return { year: 0, week: 0 }
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  // ISO weeks start on Monday; week 1 contains the first Thursday.
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7))
  const week1 = new Date(target.getFullYear(), 0, 4)
  week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7))
  const week = 1 + Math.round((target.getTime() - week1.getTime()) / (7 * MS_PER_DAY))
  return { year: target.getFullYear(), week }
}

/** Reject dates in the future beyond a small clock-skew allowance. */
export function isPlausibleDate(key: string, today = todayKey(), futureToleranceDays = 1): boolean {
  if (!isValidDateKey(key)) return false
  const delta = diffDays(key, today)
  return delta >= 0 || delta >= -futureToleranceDays
}
