import { beforeEach, describe, expect, it } from 'vitest'
import {
  DRAFT_KEY,
  STORAGE_KEY,
  clearAppData,
  clearDraft,
  defaultAppData,
  isPersistent,
  loadAppData,
  loadDraft,
  saveAppData,
  saveDraft,
  storageFootprint,
} from '../src/lib/storage'
import type { AppData } from '../src/types'
import { makeSession, makeGoal, TODAY } from './fixtures'

const msgs = (notices: readonly string[]) => notices.join(' ')

/** A controllable in-memory Storage so failure modes can be simulated exactly. */
function fakeStorage(initial: Record<string, string> = {}, opts: { failRead?: boolean; failWrite?: boolean; quota?: boolean } = {}) {
  const map = new Map(Object.entries(initial))
  return {
    map,
    get length() {
      return map.size
    },
    clear: () => map.clear(),
    getItem: (k: string) => {
      if (opts.failRead) throw new Error('SecurityError: storage denied')
      return map.has(k) ? map.get(k)! : null
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    removeItem: (k: string) => {
      map.delete(k)
    },
    setItem: (k: string, v: string) => {
      if (opts.failWrite) throw new Error('write blocked')
      if (opts.quota) {
        const err = new Error('quota') as Error & { name: string }
        err.name = 'QuotaExceededError'
        throw err
      }
      map.set(k, String(v))
    },
  } as unknown as Storage & { map: Map<string, string> }
}

describe('defaults', () => {
  it('produces a valid empty document', () => {
    const data = defaultAppData()
    expect(data.version).toBe(1)
    expect(data.sessions).toEqual([])
    expect(data.goals).toEqual([])
    expect(data.profile.displayName).toBe('Athlete')
    expect(data.profile.units).toBe('kg')
    expect(data.preferences.theme).toBe('ember')
    expect(data.preferences.defaultRestSec).toBe(90)
    expect(data.preferences.weekStartsOn).toBe(1)
  })
})

describe('loadAppData', () => {
  it('returns defaults with no recovery flag when nothing is stored', () => {
    const res = loadAppData(fakeStorage())
    expect(res.recovered).toBe(false)
    expect(res.notices).toEqual([])
    expect(res.data.sessions).toEqual([])
  })

  it('treats an empty string as no data', () => {
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: '' }))
    expect(res.recovered).toBe(false)
    expect(res.data.sessions).toEqual([])
  })

  it('treats whitespace-only data as no data', () => {
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: '   \n ' }))
    expect(res.recovered).toBe(false)
  })

  it('round-trips saved data', () => {
    const storage = fakeStorage()
    const data: AppData = {
      ...defaultAppData(),
      sessions: [makeSession({ date: TODAY })],
      goals: [makeGoal({ title: 'Bench 80 kg' })],
    }
    data.profile.bodyweightKg = 78.5
    expect(saveAppData(data, storage).ok).toBe(true)

    const res = loadAppData(storage)
    expect(res.recovered).toBe(false)
    expect(res.data.sessions).toHaveLength(1)
    expect(res.data.sessions[0].title).toBe(data.sessions[0].title)
    expect(res.data.goals).toHaveLength(1)
    expect(res.data.goals[0].title).toBe('Bench 80 kg')
    expect(res.data.profile.bodyweightKg).toBe(78.5)
  })

  it('survives invalid JSON and preserves the corrupt payload', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{"sessions": [truncated' })
    const res = loadAppData(storage)
    expect(res.recovered).toBe(true)
    expect(res.data.sessions).toEqual([])
    expect(msgs(res.notices)).toMatch(/not valid JSON/i)
    expect(storage.getItem(`${STORAGE_KEY}.corrupt`)).toContain('truncated')
  })

  it('survives a JSON value that is not an object', () => {
    for (const raw of ['42', '"a string"', 'null', 'true', '[]']) {
      const res = loadAppData(fakeStorage({ [STORAGE_KEY]: raw }))
      expect(res.recovered, raw).toBe(true)
      expect(res.data.sessions).toEqual([])
    }
  })

  it('drops a single corrupt session but keeps the valid ones', () => {
    const good = makeSession({ date: TODAY, title: 'Good session' })
    const payload = {
      ...defaultAppData(),
      sessions: [good, { id: 'broken' }, null, 42, { ...good, id: 'no-title', title: '' }],
    }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(payload) }))
    expect(res.data.sessions).toHaveLength(1)
    expect(res.data.sessions[0].title).toBe('Good session')
    expect(msgs(res.notices)).toMatch(/could not be read/)
  })

  it('drops a corrupt goal but keeps the valid ones', () => {
    const payload = {
      ...defaultAppData(),
      goals: [makeGoal({ title: 'Real goal' }), { id: 'x' }, { ...makeGoal(), target: -50 }],
    }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(payload) }))
    expect(res.data.goals).toHaveLength(1)
    expect(res.data.goals[0].title).toBe('Real goal')
  })

  it('resets out-of-range profile values instead of crashing', () => {
    const payload = { ...defaultAppData(), profile: { displayName: 'x'.repeat(500), bodyweightKg: -40, units: 'stones' } }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(payload) }))
    expect(res.data.profile.bodyweightKg).toBeUndefined()
    expect(res.data.profile.units).toBe('kg')
    expect(res.data.profile.displayName.length).toBeLessThanOrEqual(48)
  })

  it('resets out-of-range preferences instead of crashing', () => {
    const payload = { ...defaultAppData(), preferences: { theme: 'neon-pink', defaultRestSec: -900, weekStartsOn: 3 } }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(payload) }))
    expect(res.data.preferences.theme).toBe('ember')
    expect(res.data.preferences.defaultRestSec).toBe(90)
    expect([0, 1]).toContain(res.data.preferences.weekStartsOn)
  })

  it('filters a garbage acknowledged list', () => {
    const payload = { ...defaultAppData(), acknowledged: ['achievement:first-workout', 42, null, { a: 1 }] }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(payload) }))
    expect(res.data.acknowledged).toEqual(['achievement:first-workout'])
  })

  it('normalises legacy field names', () => {
    const legacy = {
      version: 0,
      workouts: [{
        id: 's1',
        name: 'Old naming',
        date: TODAY,
        startedAt: `${TODAY}T18:00:00Z`,
        loggedAt: `${TODAY}T19:00:00Z`,
        exercises: [{ exerciseId: 'back-squat', sets: [{ reps: 5, weight: 100, completed: true }] }],
        durationMin: 60,
      }],
      goals: [],
    }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(legacy) }))
    expect(res.data.sessions).toHaveLength(1)
    expect(res.data.sessions[0].title).toBe('Old naming')
    expect(msgs(res.notices)).toMatch(/schema version/i)
  })

  it('warns when the data came from a newer schema', () => {
    const payload = { ...defaultAppData(), version: 99 }
    const res = loadAppData(fakeStorage({ [STORAGE_KEY]: JSON.stringify(payload) }))
    expect(msgs(res.notices)).toMatch(/newer version/i)
    expect(res.data.version).toBe(1) // rewritten to this build's schema
  })

  it('survives storage that throws on read', () => {
    const res = loadAppData(fakeStorage({}, { failRead: true }))
    expect(res.recovered).toBe(true)
    expect(res.data.sessions).toEqual([])
    expect(msgs(res.notices)).toMatch(/could not be read/i)
  })
})

describe('saveAppData', () => {
  it('stamps version and updatedAt', () => {
    const storage = fakeStorage()
    saveAppData(defaultAppData(), storage)
    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!) as AppData
    expect(saved.version).toBe(1)
    expect(Number.isNaN(new Date(saved.updatedAt).getTime())).toBe(false)
  })

  it('reports a quota failure instead of throwing', () => {
    const res = saveAppData(defaultAppData(), fakeStorage({}, { quota: true }))
    expect(res.ok).toBe(false)
    expect(res.error).toMatch(/full|Export/i)
  })

  it('reports a generic write failure', () => {
    const res = saveAppData(defaultAppData(), fakeStorage({}, { failWrite: true }))
    expect(res.ok).toBe(false)
    expect(typeof res.error).toBe('string')
  })

  it('reports the payload size', () => {
    const res = saveAppData(defaultAppData(), fakeStorage())
    expect(res.bytes).toBeGreaterThan(50)
  })
})

describe('clearAppData', () => {
  beforeEach(() => clearAppData())

  it('removes data, draft and the corrupt copy', () => {
    const storage = fakeStorage({
      [STORAGE_KEY]: '{}',
      [DRAFT_KEY]: '{}',
      [`${STORAGE_KEY}.corrupt`]: 'junk',
    })
    clearAppData(storage)
    expect(storage.getItem(STORAGE_KEY)).toBeNull()
    expect(storage.getItem(DRAFT_KEY)).toBeNull()
    expect(storage.getItem(`${STORAGE_KEY}.corrupt`)).toBeNull()
  })

  it('does not throw when storage is unavailable', () => {
    expect(() => clearAppData(fakeStorage({}, { failRead: true }))).not.toThrow()
  })
})

describe('draft persistence', () => {
  it('round-trips an in-flight session', () => {
    const storage = fakeStorage()
    const draft = {
      id: 'draft_1',
      title: 'Workout A',
      startedAt: new Date().toISOString(),
      exercises: [],
      notes: 'halfway',
      deload: false,
      rest: null,
    }
    expect(saveDraft(draft, storage)).toBe(true)
    expect(loadDraft<typeof draft>(storage)).toMatchObject({ title: 'Workout A', notes: 'halfway' })
  })

  it('returns null when there is no draft', () => {
    expect(loadDraft(fakeStorage())).toBeNull()
  })

  it('returns null rather than throwing on a corrupt draft', () => {
    expect(loadDraft(fakeStorage({ [DRAFT_KEY]: '{oops' }))).toBeNull()
  })

  it('clears the draft', () => {
    const storage = fakeStorage()
    saveDraft({ id: 'd' }, storage)
    clearDraft(storage)
    expect(loadDraft(storage)).toBeNull()
  })
})

describe('storageFootprint and availability', () => {
  it('reports a human-readable size', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: 'x'.repeat(2048) })
    expect(storageFootprint(storage).label).toMatch(/KB/)
  })

  it('reports bytes for a small payload', () => {
    expect(storageFootprint(fakeStorage({ [STORAGE_KEY]: 'hi' })).label).toMatch(/B$/)
  })

  it('reports unavailable when storage throws', () => {
    expect(storageFootprint(fakeStorage({}, { failRead: true })).label).toBe('unavailable')
  })

  it('exposes whether writes will survive a reload', () => {
    expect(typeof isPersistent()).toBe('boolean')
  })
})

describe('the real browser storage', () => {
  it('writes to and reads from window.localStorage', () => {
    clearAppData()
    const data: AppData = { ...defaultAppData(), sessions: [makeSession({ date: TODAY })] }
    expect(saveAppData(data).ok).toBe(true)
    const res = loadAppData()
    expect(res.data.sessions).toHaveLength(1)
    clearAppData()
    expect(loadAppData().data.sessions).toEqual([])
  })
})
