import { describe, expect, it } from 'vitest'
import {
  EXPORT_APP,
  applyImport,
  buildExport,
  exportFilename,
  importFromText,
  parseImport,
  serializeExport,
} from '../src/lib/importExport'
import { defaultAppData } from '../src/lib/storage'
import type { AppData } from '../src/types'
import { TODAY, daysBefore, makeGoal, makeLog, makeSession } from './fixtures'

const msgs = (issues: { message: string }[]) => issues.map((i) => i.message).join(' ')

const data = (over: Partial<AppData> = {}): AppData => ({ ...defaultAppData(), ...over })
const text = (over: Partial<AppData> = {}) => serializeExport(data(over))

describe('buildExport', () => {
  it('stamps the app identity and schema version', () => {
    const payload = buildExport(data({ sessions: [makeSession({ date: TODAY })] }))
    expect(payload.app).toBe('forge-workout')
    expect(payload.version).toBe(1)
    expect(payload.schemaVersion).toBe(1)
    expect(Number.isNaN(new Date(payload.exportedAt).getTime())).toBe(false)
    expect(payload.counts.sessions).toBe(1)
  })

  it('does not leak an acknowledged-notification list', () => {
    const payload = buildExport(data({ acknowledged: ['achievement:first-workout'] })) as unknown as Record<string, unknown>
    expect(payload.acknowledged).toBeUndefined()
  })

  it('produces valid, non-pretty JSON on demand', () => {
    const compact = serializeExport(data(), false)
    expect(compact).not.toContain('\n')
    expect(() => JSON.parse(compact)).not.toThrow()
  })

  it('names the file with a date stamp and .json extension', () => {
    expect(EXPORT_APP).toBe('forge-workout')
    expect(exportFilename(new Date('2026-10-03T10:00:00'))).toBe('forge-workout-backup-2026-10-03.json')
    expect(exportFilename()).toMatch(/^forge-workout-backup-\d{4}-\d{2}-\d{2}\.json$/)
  })
})

describe('parseImport — valid input', () => {
  it('round-trips a Forge export', () => {
    const res = parseImport(text({ sessions: [makeSession({ date: TODAY })], goals: [makeGoal()] }))
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions).toHaveLength(1)
    expect(res.payload?.goals).toHaveLength(1)
    expect(res.issues).toEqual([])
  })

  it('accepts a bare { sessions, goals } object', () => {
    const res = parseImport(JSON.stringify({ sessions: [makeSession({ date: TODAY })], goals: [] }))
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions).toHaveLength(1)
    expect(res.payload?.app).toBe(EXPORT_APP)
  })

  it('accepts a bare array of sessions', () => {
    const res = parseImport(JSON.stringify([makeSession({ date: TODAY }), makeSession({ date: daysBefore(1) })]))
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions).toHaveLength(2)
    expect(res.issues.some((i) => /array|sessions/i.test(i.message))).toBe(true)
  })

  it('accepts the legacy field names', () => {
    const legacy = { workouts: [makeSession({ date: TODAY, title: 'Renamed' })], goals: [] }
    const res = parseImport(JSON.stringify(legacy))
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions[0].title).toBe('Renamed')
  })

  it('tolerates leading/trailing whitespace and a BOM', () => {
    const withSession = text({ sessions: [makeSession({ date: TODAY })] })
    const res = parseImport(`\ufeff\n  ${withSession}  \n`)
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions).toHaveLength(1)
  })

  it('accepts a genuine but empty Forge backup, with a warning', () => {
    const res = parseImport(text())
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions).toEqual([])
    expect(msgs(res.issues)).toMatch(/no workouts or goals/)
  })

  it('still rejects an unmarked empty bundle', () => {
    // Without the Forge marker an empty payload is indistinguishable from junk,
    // and accepting it would let a stray file wipe the history in replace mode.
    expect(parseImport('{}').ok).toBe(false)
    expect(parseImport('{"sessions": [], "goals": []}').ok).toBe(false)
  })
})

describe('parseImport — invalid input never throws', () => {
  const bad: Array<[string, string]> = [
    ['', 'empty'],
    ['   ', 'whitespace'],
    ['not json at all', 'plain text'],
    ['{oops', 'truncated'],
    ['null', 'null'],
    ['42', 'number'],
    ['"just a string"', 'string'],
    ['[]', 'empty array'],
    ['{}', 'empty object'],
    ['{"foo": "bar"}', 'unrelated object'],
    ['<html><body>hi</body></html>', 'html'],
  ]

  for (const [raw, label] of bad) {
    it(`rejects ${label}`, () => {
      let res: ReturnType<typeof parseImport>
      expect(() => {
        res = parseImport(raw)
      }).not.toThrow()
      expect(res!.ok).toBe(false)
      expect(res!.issues.length).toBeGreaterThan(0)
      expect(res!.issues[0].message.length).toBeGreaterThan(0)
    })
  }

  it('rejects a file over the size limit', () => {
    const huge = `{"sessions": [${'"x",'.repeat(1)}`.padEnd(26 * 1024 * 1024, ' ')
    const res = parseImport(huge)
    expect(res.ok).toBe(false)
    expect(msgs(res.issues)).toMatch(/25 MB/)
  })

  it('reports individual bad records without failing the whole file', () => {
    const payload = JSON.stringify({
      app: EXPORT_APP,
      version: 1,
      sessions: [
        makeSession({ date: TODAY, title: 'Valid' }),
        { id: 'nope' },
        null,
        'a string',
        makeSession({ date: TODAY, title: 'Also valid' }),
      ],
      goals: [],
    })
    const res = parseImport(payload)
    expect(res.ok).toBe(true)
    expect(res.payload?.sessions).toHaveLength(2)
    expect(res.issues.some((i) => /skipped|ignored|invalid/i.test(i.message))).toBe(true)
  })

  it('de-duplicates sessions sharing an id, keeping the later one', () => {
    const a = makeSession({ id: 'dup', date: daysBefore(3), hour: 8, title: 'Early' })
    const b = makeSession({ id: 'dup', date: daysBefore(1), hour: 8, title: 'Late' })
    const res = parseImport(JSON.stringify({ app: EXPORT_APP, version: 1, sessions: [a, b], goals: [] }))
    expect(res.payload?.sessions).toHaveLength(1)
    expect(res.payload?.sessions[0].title).toBe('Late')
  })

  it('de-duplicates goals sharing an id', () => {
    const res = parseImport(
      JSON.stringify({ app: EXPORT_APP, version: 1, sessions: [], goals: [makeGoal({ id: 'g', title: 'A' }), makeGoal({ id: 'g', title: 'B' })] }),
    )
    expect(res.payload?.goals).toHaveLength(1)
  })

  it('rejects impossible set values', () => {
    const res = parseImport(
      JSON.stringify({
        app: EXPORT_APP,
        version: 1,
        sessions: [
          makeSession({
            date: TODAY,
            exercises: [{ ...makeLog('back-squat', []), sets: [{ id: 's', reps: -5, weight: -90, rpe: 12, completed: true }] }],
          }),
        ],
        goals: [],
      }),
    )
    const logged = res.payload?.sessions ?? []
    const sets = logged.flatMap((s) => s.exercises.flatMap((e) => e.sets))
    expect(sets.every((s) => s.reps >= 0 && s.weight >= 0 && (s.rpe === undefined || (s.rpe >= 1 && s.rpe <= 10)))).toBe(true)
  })

  it('drops sessions dated in the future', () => {
    const future = { ...makeSession({ date: TODAY }), date: '2999-01-01', startedAt: '2999-01-01T10:00:00.000Z', completedAt: '2999-01-01T11:00:00.000Z' }
    const res = parseImport(JSON.stringify({ app: EXPORT_APP, version: 1, sessions: [future, makeSession({ date: TODAY })], goals: [] }))
    expect(res.payload?.sessions.map((s) => s.date)).toEqual([TODAY])
  })
})

describe('applyImport — replace mode', () => {
  it('swaps the current data for the backup', () => {
    const current = data({ sessions: [makeSession({ date: daysBefore(9) })], goals: [makeGoal({ title: 'Old' })] })
    const payload = buildExport(data({ sessions: [makeSession({ date: TODAY })], goals: [makeGoal({ title: 'New' })] }))
    const { data: next, result } = applyImport(payload, current, 'replace')

    expect(result.ok).toBe(true)
    expect(result.mode).toBe('replace')
    expect(next.sessions).toHaveLength(1)
    expect(next.sessions[0].date).toBe(TODAY)
    expect(next.goals.map((g) => g.title)).toEqual(['New'])
    expect(next.acknowledged).toEqual([]) // fresh data should re-notify
  })

  it('keeps the current profile when the backup has none', () => {
    const current = data()
    current.profile.displayName = 'Keep me'
    const payload = buildExport(data({ sessions: [makeSession({ date: TODAY })] }))
    delete (payload as { profile?: unknown }).profile
    const { data: next } = applyImport(payload, current, 'replace')
    expect(next.profile.displayName).toBe('Keep me')
  })
})

describe('applyImport — merge mode', () => {
  it('adds sessions that are not already present', () => {
    const current = data({ sessions: [makeSession({ id: 'a', date: daysBefore(3) })] })
    const payload = buildExport(data({ sessions: [makeSession({ id: 'b', date: TODAY })] }))
    const { data: next, result } = applyImport(payload, current, 'merge')

    expect(next.sessions.map((s) => s.id).sort()).toEqual(['a', 'b'])
    expect(result.imported.sessions).toBe(1)
  })

  it('refreshes an existing session from a newer backup copy', () => {
    const older = makeSession({ id: 'a', date: TODAY, title: 'Before' })
    const newer = makeSession({ id: 'a', date: TODAY, title: 'After', hour: 20 })
    const current = data({ sessions: [older] })
    const { data: next, result } = applyImport(buildExport(data({ sessions: [newer] })), current, 'merge')

    expect(next.sessions).toHaveLength(1)
    expect(next.sessions[0].title).toBe('After')
    expect(result.skipped).toBe(0)
    expect(msgs(result.issues)).toMatch(/refreshed/i)
  })

  it('does not let an older backup copy overwrite newer local work', () => {
    const newer = makeSession({ id: 'a', date: TODAY, title: 'Newer local', hour: 20 })
    const older = makeSession({ id: 'a', date: TODAY, title: 'Stale backup', hour: 6 })
    const current = data({ sessions: [newer] })
    const { data: next, result } = applyImport(buildExport(data({ sessions: [older] })), current, 'merge')

    expect(next.sessions).toHaveLength(1)
    expect(next.sessions[0].title).toBe('Newer local')
    expect(result.skipped).toBe(1)
  })

  it('never overwrites profile or preferences from a backup', () => {
    const current = data()
    current.profile.displayName = 'Local user'
    current.preferences.theme = 'obsidian'
    const payload = buildExport(data())
    payload.profile = { ...payload.profile, displayName: 'Backup user' }
    payload.preferences = { ...payload.preferences, theme: 'aurora' }

    const { data: next, result } = applyImport(payload, current, 'merge')
    expect(next.profile.displayName).toBe('Local user')
    expect(next.preferences.theme).toBe('obsidian')
    expect(result.imported.profile).toBe(false)
    expect(result.imported.preferences).toBe(false)
  })

  it('preserves the acknowledged list so nothing re-notifies', () => {
    const current = data({ acknowledged: ['achievement:first-workout'] })
    const { data: next } = applyImport(buildExport(data()), current, 'merge')
    expect(next.acknowledged).toEqual(['achievement:first-workout'])
  })

  it('keeps goals on both sides', () => {
    const current = data({ goals: [makeGoal({ id: 'g1', title: 'Local' })] })
    const payload = buildExport(data({ goals: [makeGoal({ id: 'g2', title: 'Backup' })] }))
    const { data: next } = applyImport(payload, current, 'merge')
    expect(next.goals.map((g) => g.title).sort()).toEqual(['Backup', 'Local'])
  })
})

describe('importFromText', () => {
  it('leaves the data untouched when the file is unreadable', () => {
    const current = data({ sessions: [makeSession({ date: TODAY })] })
    const { data: next, result } = importFromText('{{{', current, 'merge')
    expect(next).toBe(current)
    expect(result.ok).toBe(false)
    expect(result.imported.sessions).toBe(0)
    expect(result.issues.length).toBeGreaterThan(0)
  })

  it('end-to-end: export then merge back is idempotent', () => {
    const source = data({
      sessions: [makeSession({ date: daysBefore(2) }), makeSession({ date: TODAY })],
      goals: [makeGoal({ title: 'Bench 80 kg' })],
    })
    const { data: next, result } = importFromText(serializeExport(source), source, 'merge')
    expect(result.ok).toBe(true)
    expect(next.sessions).toHaveLength(2)
    expect(next.goals).toHaveLength(1)
    expect(result.skipped).toBe(0)
  })

  it('end-to-end: export then replace restores the same records', () => {
    const source = data({ sessions: [makeSession({ date: TODAY, title: 'Only' })] })
    const { data: next } = importFromText(serializeExport(source), data(), 'replace')
    expect(next.sessions).toHaveLength(1)
    expect(next.sessions[0].title).toBe('Only')
  })

  it('merges into an empty app', () => {
    const { data: next, result } = importFromText(text({ sessions: [makeSession({ date: TODAY })] }), data(), 'merge')
    expect(result.ok).toBe(true)
    expect(next.sessions).toHaveLength(1)
  })
})
