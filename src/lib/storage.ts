import type { AppData, Preferences, Profile } from '../types'
import { todayKey } from './dates'
import { DEFAULT_THEME } from '../data/themes'
import { uid } from './id'
import { validateAppData, validatePreferences, validateProfile } from './validation'

/**
 * Persistence.
 *
 * One versioned key holds everything. Reads are defensive at every step: a
 * missing key, a truncated string, invalid JSON, a payload from an older
 * schema, or a single corrupt record must never prevent the app from starting —
 * the worst acceptable outcome is losing the bad record and telling the user.
 */

export const STORAGE_KEY = 'forge.workout.v1'
export const DRAFT_KEY = 'forge.session.draft.v1'
export const SCHEMA_VERSION = 1

/** In-memory fallback for private-browsing modes and sandboxed iframes. */
class MemoryStorage implements Storage {
  private map = new Map<string, string>()
  get length() {
    return this.map.size
  }
  clear() {
    this.map.clear()
  }
  getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.map.delete(key)
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value))
  }
}

let memoryFallback: MemoryStorage | null = null
let storageAvailable: boolean | null = null

/** Returns a working Storage, or the in-memory fallback if none is usable. */
export function getStorage(): Storage {
  if (memoryFallback) return memoryFallback
  try {
    const probe = '__forge_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    storageAvailable = true
    return window.localStorage
  } catch {
    storageAvailable = false
    memoryFallback = new MemoryStorage()
    return memoryFallback
  }
}

/** True when writes survive a reload. False means the app is running in-memory only. */
export function isPersistent(): boolean {
  getStorage()
  return storageAvailable === true
}

export function defaultProfile(): Profile {
  const now = new Date().toISOString()
  return {
    displayName: 'Athlete',
    units: 'kg',
    joinedAt: now,
    avatarSeed: todayKey(),
  }
}

export function defaultPreferences(): Preferences {
  return {
    theme: DEFAULT_THEME,
    motion: 'auto',
    defaultRestSec: 90,
    sound: true,
    autoStartRest: true,
    weekStartsOn: 1,
    rotationIndex: 0,
    compactTables: false,
    showDocSources: true,
  }
}

export function defaultAppData(): AppData {
  const now = new Date().toISOString()
  return {
    version: SCHEMA_VERSION,
    sessions: [],
    goals: [],
    profile: defaultProfile(),
    preferences: defaultPreferences(),
    acknowledged: [],
    createdAt: now,
    updatedAt: now,
  }
}

export interface LoadResult {
  data: AppData
  /** True when the stored payload needed repair. */
  recovered: boolean
  /** Human-readable repair notes, surfaced once in Settings → Data. */
  notices: string[]
}

/**
 * Load and repair. Never throws.
 */
export function loadAppData(storage: Storage = getStorage()): LoadResult {
  const notices: string[] = []
  let rawText: string | null = null
  try {
    rawText = storage.getItem(STORAGE_KEY)
  } catch {
    notices.push('Local storage could not be read. Starting a fresh profile.')
    return { data: defaultAppData(), recovered: true, notices }
  }

  if (rawText == null || rawText.trim() === '') {
    return { data: defaultAppData(), recovered: false, notices }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawText)
  } catch {
    // Keep the corrupt payload so the user can export it for inspection rather
    // than silently destroying it.
    try {
      storage.setItem(`${STORAGE_KEY}.corrupt`, rawText.slice(0, 200_000))
      notices.push('Saved data was not valid JSON. A copy was kept as forge.workout.v1.corrupt.')
    } catch {
      notices.push('Saved data was not valid JSON and could not be preserved.')
    }
    return { data: defaultAppData(), recovered: true, notices }
  }

  if (!parsed || typeof parsed !== 'object') {
    notices.push('Saved data was not an object. Starting a fresh profile.')
    return { data: defaultAppData(), recovered: true, notices }
  }

  const record = parsed as Record<string, unknown>
  const version = typeof record.version === 'number' ? record.version : 0
  if (version > SCHEMA_VERSION) {
    notices.push(
      `This data was written by a newer version of Forge (schema ${version}, this build understands ${SCHEMA_VERSION}). It was loaded as far as possible.`,
    )
  } else if (version > 0 && version < SCHEMA_VERSION) {
    notices.push(`Migrated saved data from schema v${version} to v${SCHEMA_VERSION}.`)
  } else if (version === 0) {
    notices.push('Saved data had no schema version; it was validated field by field.')
  }

  const validated = validateAppData(migrateLegacy(record))
  const base = defaultAppData()

  const profileResult = validateProfile(record.profile)
  const prefsResult = validatePreferences(record.preferences)

  const data: AppData = {
    ...base,
    version: SCHEMA_VERSION,
    sessions: validated.sessions,
    goals: validated.goals,
    profile: profileResult.ok && profileResult.value ? profileResult.value : base.profile,
    preferences: prefsResult.ok && prefsResult.value ? prefsResult.value : base.preferences,
    acknowledged: Array.isArray(record.acknowledged)
      ? record.acknowledged.filter((x): x is string => typeof x === 'string').slice(0, 5000)
      : [],
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : base.createdAt,
    updatedAt: new Date().toISOString(),
    lastExportAt: typeof record.lastExportAt === 'string' ? record.lastExportAt : undefined,
  }

  if (validated.rejectedSessions > 0) {
    notices.push(`${validated.rejectedSessions} workout record${validated.rejectedSessions === 1 ? '' : 's'} could not be read and ${validated.rejectedSessions === 1 ? 'was' : 'were'} dropped.`)
  }
  if (validated.rejectedGoals > 0) {
    notices.push(`${validated.rejectedGoals} goal record${validated.rejectedGoals === 1 ? '' : 's'} could not be read and ${validated.rejectedGoals === 1 ? 'was' : 'were'} dropped.`)
  }
  if (!profileResult.ok) notices.push('Some profile fields were out of range and were reset.')
  if (!prefsResult.ok) notices.push('Some preference values were out of range and were reset.')
  if (validated.issues.length > 0 && validated.rejectedSessions === 0 && validated.rejectedGoals === 0) {
    notices.push(`${validated.issues.length} field-level issue${validated.issues.length === 1 ? '' : 's'} repaired while loading.`)
  }

  return { data, recovered: notices.length > 0, notices }
}

/**
 * Forward-compatibility shim. Older or hand-edited payloads may use different
 * field names; normalising here keeps `validateAppData` honest about the rest.
 */
function migrateLegacy(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...record }

  if (!Array.isArray(out.sessions) && Array.isArray(out.workouts)) out.sessions = out.workouts
  if (!Array.isArray(out.goals)) out.goals = []

  if (Array.isArray(out.sessions)) {
    out.sessions = (out.sessions as unknown[]).map((s) => {
      if (!s || typeof s !== 'object') return s
      const session = s as Record<string, unknown>
      // `name` was used for the title in early drafts.
      if (session.title == null && typeof session.name === 'string') session.title = session.name
      // `loggedAt` → `completedAt`
      if (session.completedAt == null && typeof session.loggedAt === 'string') session.completedAt = session.loggedAt
      if (session.startedAt == null && typeof session.completedAt === 'string') session.startedAt = session.completedAt
      return session
    })
  }

  return out
}

export interface SaveResult {
  ok: boolean
  error?: string
  bytes: number
}

/**
 * Persist. Returns a structured result rather than throwing so the UI can tell
 * the user their data is not being saved (quota exceeded, private mode) instead
 * of failing silently.
 */
export function saveAppData(data: AppData, storage: Storage = getStorage()): SaveResult {
  const payload: AppData = { ...data, version: SCHEMA_VERSION, updatedAt: new Date().toISOString() }
  let text: string
  try {
    text = JSON.stringify(payload)
  } catch (err) {
    return { ok: false, bytes: 0, error: `Data could not be serialised: ${(err as Error).message}` }
  }
  try {
    storage.setItem(STORAGE_KEY, text)
    return { ok: true, bytes: text.length }
  } catch (err) {
    const message = (err as Error)?.name === 'QuotaExceededError'
      ? 'Local storage is full. Export a backup, then delete old sessions from History.'
      : `Could not write to local storage: ${(err as Error)?.message ?? 'unknown error'}`
    return { ok: false, bytes: text.length, error: message }
  }
}

export function clearAppData(storage: Storage = getStorage()): void {
  try {
    storage.removeItem(STORAGE_KEY)
    storage.removeItem(DRAFT_KEY)
    storage.removeItem(`${STORAGE_KEY}.corrupt`)
  } catch {
    /* nothing else to do — the caller falls back to defaults */
  }
}

/** Approximate size of the stored payload, for the Settings → Data panel. */
export function storageFootprint(storage: Storage = getStorage()): { bytes: number; label: string } {
  let bytes = 0
  try {
    for (const key of [STORAGE_KEY, DRAFT_KEY, `${STORAGE_KEY}.corrupt`]) {
      bytes += (storage.getItem(key) ?? '').length
    }
  } catch {
    return { bytes: 0, label: 'unavailable' }
  }
  if (bytes < 1024) return { bytes, label: `${bytes} B` }
  if (bytes < 1024 * 1024) return { bytes, label: `${(bytes / 1024).toFixed(1)} KB` }
  return { bytes, label: `${(bytes / (1024 * 1024)).toFixed(2)} MB` }
}

/** A session draft is stored separately so a mid-workout reload is survivable. */
export function loadDraft<T>(storage: Storage = getStorage()): T | null {
  try {
    const raw = storage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveDraft(draft: unknown, storage: Storage = getStorage()): boolean {
  try {
    if (draft == null) {
      storage.removeItem(DRAFT_KEY)
      return true
    }
    storage.setItem(DRAFT_KEY, JSON.stringify(draft))
    return true
  } catch {
    return false
  }
}

export function clearDraft(storage: Storage = getStorage()): void {
  try {
    storage.removeItem(DRAFT_KEY)
  } catch {
    /* ignore */
  }
}

export { uid }
