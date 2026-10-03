import type { AppData, Goal, ImportResult, ValidationIssue, WorkoutSession } from '../types'
import { SCHEMA_VERSION, defaultAppData } from './storage'
import { looksLikeExport, sanitizeString, validateAppData, validateGoal, validateSession } from './validation'

/**
 * Backup: export and import.
 *
 * The export format is plain JSON with an explicit `app` marker and a schema
 * version, so a file is self-describing and can be validated before anything is
 * written. Import never throws: a malformed file produces a structured
 * `ImportResult` explaining what was wrong and what was salvaged.
 */

export const EXPORT_APP = 'forge-workout'
export const EXPORT_VERSION = 1

export interface ExportPayload {
  app: typeof EXPORT_APP
  version: number
  schemaVersion: number
  exportedAt: string
  counts: { sessions: number; goals: number }
  sessions: WorkoutSession[]
  goals: Goal[]
  profile: AppData['profile']
  preferences: AppData['preferences']
}

export function buildExport(data: AppData): ExportPayload {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    counts: { sessions: data.sessions.length, goals: data.goals.length },
    sessions: data.sessions,
    goals: data.goals,
    profile: data.profile,
    preferences: data.preferences,
  }
}

export function serializeExport(data: AppData, pretty = true): string {
  return pretty ? JSON.stringify(buildExport(data), null, 2) : JSON.stringify(buildExport(data))
}

export function exportFilename(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `forge-workout-backup-${y}-${m}-${d}.json`
}

/** Triggers a browser download. Returns false in non-browser environments. */
export function downloadExport(data: AppData, filename = exportFilename()): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return false
  try {
    const blob = new Blob([serializeExport(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Revoke on the next tick so the download has definitely started.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    return true
  } catch {
    return false
  }
}

export interface ParseResult {
  ok: boolean
  payload?: ExportPayload
  issues: ValidationIssue[]
}

/**
 * Parse and validate an imported file. Accepts a Forge export, a bare
 * `{sessions, goals}` object, or a bare array of sessions — the last two make
 * hand-built or third-party files importable rather than rejecting them.
 */
export function parseImport(text: string): ParseResult {
  const issues: ValidationIssue[] = []

  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, issues: [{ field: 'file', message: 'The file is empty.' }] }
  }

  // A file over 25 MB is almost certainly not a workout log.
  if (text.length > 25 * 1024 * 1024) {
    return { ok: false, issues: [{ field: 'file', message: 'The file is larger than 25 MB and was rejected.' }] }
  }

  // Strip a BOM and surrounding whitespace — editors add both, and JSON.parse
  // refuses a leading BOM.
  const cleaned = text.replace(/^\uFEFF/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    return {
      ok: false,
      issues: [
        {
          field: 'file',
          message: `This is not valid JSON: ${sanitizeString((err as Error).message, 160) || 'parse error'}.`,
        },
      ],
    }
  }

  if (parsed == null || typeof parsed !== 'object') {
    return { ok: false, issues: [{ field: 'file', message: 'The file does not contain a JSON object or array.' }] }
  }

  // Normalise the accepted shapes into one object.
  let candidate: Record<string, unknown>
  if (Array.isArray(parsed)) {
    candidate = { sessions: parsed, goals: [] }
    issues.push({ field: 'file', message: 'The file was a bare array — imported as a list of workout sessions.' })
  } else {
    candidate = parsed as Record<string, unknown>
    // Older builds (and hand-written files) used "workouts" for the session list.
    if (!Array.isArray(candidate.sessions) && Array.isArray(candidate.workouts)) {
      candidate = { ...candidate, sessions: candidate.workouts }
      issues.push({ field: 'file', message: 'The file used the older "workouts" field — read as sessions.' })
    }
  }

  const isForgeExport = looksLikeExport(candidate)
  if (!isForgeExport) {
    const hasSessions = Array.isArray(candidate.sessions)
    const hasGoals = Array.isArray(candidate.goals)
    if (!hasSessions && !hasGoals) {
      return {
        ok: false,
        issues: [
          {
            field: 'file',
            message: 'No "sessions" or "goals" array was found. This does not look like a Forge backup.',
          },
        ],
      }
    }
    issues.push({ field: 'file', message: 'Not a Forge export file — the records were validated individually.' })
  }

  if (!Array.isArray(candidate.sessions)) candidate.sessions = []
  if (!Array.isArray(candidate.goals)) candidate.goals = []

  const validated = validateAppData(candidate)

  // A hand-edited or double-merged file can list the same id twice. Keep the
  // most recent copy of each rather than whichever happened to come first.
  const sessionStamp = (x: WorkoutSession) => new Date(x.completedAt || x.startedAt || x.date).getTime() || 0
  const sessionsById = new Map<string, WorkoutSession>()
  let duplicateSessions = 0
  for (const s of validated.sessions) {
    const existing = sessionsById.get(s.id)
    if (!existing) {
      sessionsById.set(s.id, s)
      continue
    }
    duplicateSessions++
    if (sessionStamp(s) >= sessionStamp(existing)) sessionsById.set(s.id, s)
  }
  if (duplicateSessions > 0) {
    issues.push({ field: 'sessions', message: `${duplicateSessions} duplicate session id(s) — kept the most recent copy of each.` })
  }

  const goalStamp = (x: Goal) => new Date(x.completedAt ?? x.createdAt).getTime() || 0
  const goalsById = new Map<string, Goal>()
  let duplicateGoals = 0
  for (const g of validated.goals) {
    const existing = goalsById.get(g.id)
    if (!existing) {
      goalsById.set(g.id, g)
      continue
    }
    duplicateGoals++
    if (goalStamp(g) >= goalStamp(existing)) goalsById.set(g.id, g)
  }
  if (duplicateGoals > 0) {
    issues.push({ field: 'goals', message: `${duplicateGoals} duplicate goal id(s) — kept the most recent copy of each.` })
  }

  const sessions = [...sessionsById.values()]
  const goals = [...goalsById.values()]

  issues.push(...validated.issues.slice(0, 40))
  if (validated.rejectedSessions > 0) {
    issues.push({ field: 'sessions', message: `${validated.rejectedSessions} session record(s) were invalid and skipped.` })
  }
  if (validated.rejectedGoals > 0) {
    issues.push({ field: 'goals', message: `${validated.rejectedGoals} goal record(s) were invalid and skipped.` })
  }

  // An empty but genuine Forge backup is still a valid file — it just has
  // nothing in it. Anything else with no usable records is not a backup at all.
  if (sessions.length === 0 && goals.length === 0 && !isForgeExport) {
    return {
      ok: false,
      issues: issues.length
        ? issues
        : [{ field: 'file', message: 'The file contained no usable workout or goal records.' }],
    }
  }

  const base = defaultAppData()
  if (sessions.length === 0 && goals.length === 0) {
    issues.push({ field: 'file', message: 'This backup contains no workouts or goals — importing it in "replace" mode will clear your history.' })
  }

  return {
    ok: true,
    payload: {
      app: EXPORT_APP,
      version: typeof candidate.version === 'number' ? candidate.version : EXPORT_VERSION,
      schemaVersion: typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : SCHEMA_VERSION,
      exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : new Date().toISOString(),
      counts: { sessions: sessions.length, goals: goals.length },
      sessions,
      goals,
      profile: validated.profile ?? base.profile,
      preferences: validated.preferences ?? base.preferences,
    },
    issues,
  }
}

/**
 * Apply a validated payload.
 *
 * `replace` discards current data. `merge` keeps both, de-duplicating sessions
 * and goals by id and preferring whichever record was written most recently —
 * so merging an older backup into a newer profile never resurrects deleted work.
 */
export function applyImport(
  payload: ExportPayload,
  current: AppData,
  mode: 'replace' | 'merge',
): { data: AppData; result: ImportResult } {
  if (mode === 'replace') {
    const base = defaultAppData()
    const data: AppData = {
      ...base,
      sessions: payload.sessions,
      goals: payload.goals,
      // A backup with no profile section should not wipe the one on this device.
      profile: payload.profile ?? current.profile ?? base.profile,
      preferences: { ...base.preferences, ...(current.preferences ?? {}), ...(payload.preferences ?? {}) },
      acknowledged: [],
      createdAt: base.createdAt,
      updatedAt: new Date().toISOString(),
    }
    return {
      data,
      result: {
        ok: true,
        mode,
        imported: {
          sessions: payload.sessions.length,
          goals: payload.goals.length,
          profile: Boolean(payload.profile),
          preferences: Boolean(payload.preferences),
        },
        skipped: 0,
        issues: [],
      },
    }
  }

  // ---- merge ----
  const sessionById = new Map<string, WorkoutSession>()
  for (const s of current.sessions) sessionById.set(s.id, s)
  let skipped = 0
  let added = 0
  let updated = 0
  for (const incoming of payload.sessions) {
    const existing = sessionById.get(incoming.id)
    if (!existing) {
      sessionById.set(incoming.id, incoming)
      added++
      continue
    }
    const existingAt = new Date(existing.completedAt || existing.startedAt).getTime() || 0
    const incomingAt = new Date(incoming.completedAt || incoming.startedAt).getTime() || 0
    if (incomingAt >= existingAt) {
      sessionById.set(incoming.id, incoming)
      updated++
    } else {
      skipped++
    }
  }

  const goalById = new Map<string, Goal>()
  for (const g of current.goals) goalById.set(g.id, g)
  for (const incoming of payload.goals) {
    const existing = goalById.get(incoming.id)
    if (!existing) {
      goalById.set(incoming.id, incoming)
      added++
    } else {
      const existingAt = new Date(existing.completedAt ?? existing.createdAt).getTime() || 0
      const incomingAt = new Date(incoming.completedAt ?? incoming.createdAt).getTime() || 0
      if (incomingAt >= existingAt) goalById.set(incoming.id, incoming)
      else skipped++
    }
  }

  const data: AppData = {
    ...current,
    sessions: [...sessionById.values()],
    goals: [...goalById.values()],
    // Profile and preferences are intentionally NOT overwritten by a merge:
    // they describe the current device and user, not the backup.
    profile: current.profile,
    preferences: current.preferences,
    acknowledged: current.acknowledged,
    updatedAt: new Date().toISOString(),
  }

  return {
    data,
    result: {
      ok: true,
      mode,
      imported: {
        sessions: added + updated,
        goals: payload.goals.length,
        profile: false,
        preferences: false,
      },
      skipped,
      issues: updated > 0
        ? [{ field: 'sessions', message: `${updated} existing session(s) were refreshed from the backup.` }]
        : [],
    },
  }
}

/** Convenience: parse + apply in one call, for tests and the settings UI. */
export function importFromText(
  text: string,
  current: AppData,
  mode: 'replace' | 'merge',
): { data: AppData; result: ImportResult } {
  const parsed = parseImport(text)
  if (!parsed.ok || !parsed.payload) {
    return {
      data: current,
      result: {
        ok: false,
        mode,
        imported: { sessions: 0, goals: 0, profile: false, preferences: false },
        skipped: 0,
        issues: parsed.issues.length
          ? parsed.issues
          : [{ field: 'file', message: 'The file could not be read.' }],
      },
    }
  }
  const { data, result } = applyImport(parsed.payload, current, mode)
  return { data, result: { ...result, issues: [...parsed.issues, ...result.issues] } }
}

/** Re-validate a single record — used by inline editors before they commit. */
export function revalidateSession(raw: unknown): WorkoutSession | null {
  const res = validateSession(raw)
  return res.ok && res.value ? res.value : null
}

export function revalidateGoal(raw: unknown): Goal | null {
  const res = validateGoal(raw)
  return res.ok && res.value ? res.value : null
}
