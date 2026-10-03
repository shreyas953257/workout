import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Field, KeyValue, NumberInput, SectionHead, Segmented, Stat, Toggle } from '../ui/primitives'
import { ConfirmDialog } from '../ui/Modal'
import { THEMES } from '../../data/themes'
import { useAppState, store } from '../../lib/store'
import { EXPORT_APP, EXPORT_VERSION, downloadExport, exportFilename, importFromText, serializeExport } from '../../lib/importExport'
import { STORAGE_KEY, clearAppData, getStorage, storageFootprint } from '../../lib/storage'
import { ACHIEVEMENTS } from '../../data/achievements'
import { UNLOCKS } from '../../data/unlocks'
import { formatDate } from '../../lib/dates'
import { LIMITS } from '../../lib/validation'
import { toast } from '../ui/Toast'

const MOTION: { value: 'auto' | 'reduced' | 'full'; label: string }[] = [
  { value: 'auto', label: 'Follow my system' },
  { value: 'reduced', label: 'Always reduce' },
  { value: 'full', label: 'Always full' },
]

const WEEKS: { value: '1' | '0'; label: string }[] = [
  { value: '1', label: 'Monday' },
  { value: '0', label: 'Sunday' },
]

/** Theme, motion, rest defaults, export/import, reset, and an honest about box. */

export function Settings() {
  const { data, progress, persistent, saveError } = useAppState()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importText, setImportText] = useState('')
  const [mode, setMode] = useState<'merge' | 'replace'>('merge')
  const [preview, setPreview] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirmImport, setConfirmImport] = useState(false)

  const footprint = useMemo(() => storageFootprint(), [data])
  const bytes = useMemo(() => JSON.stringify(data).length, [data])
  const latest = useMemo(() => [...data.sessions].sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0], [data.sessions])

  const runImport = (text: string) => {
    setImportText(text)
    if (!text.trim()) {
      setPreview(null)
      return
    }
    const res = importFromText(text, data, mode)
    if (!res.result.ok) {
      setPreview(null)
      toast.error('That file could not be imported', res.result.issues.slice(0, 2).map((i) => i.message).join(' · '))
      return
    }
    setPreview(
      `${res.result.imported.sessions} sessions · ${res.result.imported.goals} goals${res.result.imported.profile ? ' · profile' : ''}${
        res.result.skipped > 0 ? ` · ${res.result.skipped} skipped` : ''
      }`,
    )
  }

  const apply = () => {
    const res = importFromText(importText, data, mode)
    if (!res.result.ok) {
      toast.error('Import failed', res.result.issues.slice(0, 2).map((i) => i.message).join(' · '))
      return
    }
    store.replaceData(res.data)
    setConfirmImport(false)
    setImportText('')
    setPreview(null)
    toast.success(
      `${mode === 'replace' ? 'Replaced' : 'Merged'} your data`,
      `${res.result.imported.sessions} sessions and ${res.result.imported.goals} goals imported${res.result.skipped ? `, ${res.result.skipped} skipped as invalid` : ''}.`,
    )
  }

  return (
    <div className="page">
      <SectionHead
        icon="settings"
        title="Settings"
        sub="Everything here is stored in this browser only. There is no account and no server — export a backup if you care about the data."
      />

      {saveError ? (
        <div className="banner banner--bad">
          <Icon name="alert-triangle" size={16} />
          <span>
            <strong>Saving failed.</strong> {saveError} Your changes are still in memory — export a backup before closing the tab.
          </span>
        </div>
      ) : null}

      {!persistent ? (
        <div className="banner banner--warn">
          <Icon name="alert-triangle" size={16} />
          <span>
            <strong>Local storage is unavailable.</strong> This session works, but nothing will be saved when you close the tab. Private browsing
            and blocked site data both cause this.
          </span>
        </div>
      ) : null}

      <Card title="Appearance" icon="palette" sub="Six themes. The default one is free; the rest are unlocked by training.">
        <div className="row-2">
          {THEMES.map((theme) => {
            const locked = Boolean(theme.unlockId && !progress.unlockedIds.includes(theme.unlockId))
            const active = data.preferences.theme === theme.id
            return (
              <button
                key={theme.id}
                type="button"
                className={`themechip ${active ? 'is-on' : ''}`}
                aria-pressed={active}
                onClick={() => {
                  if (locked) {
                    toast.warn(`${theme.name} is still locked`, theme.requirement ?? 'Keep training to unlock it.')
                    return
                  }
                  store.updatePreferences({ theme: theme.id })
                  toast.success(`${theme.name} applied`)
                }}
              >
                <span className="themechip__swatches" aria-hidden="true">
                  {[theme.accent, theme.accent2, theme.accent3, theme.bg].map((c) => (
                    <span key={c} style={{ background: c }} />
                  ))}
                </span>
                <span className="stack-2" style={{ alignItems: 'flex-start' }}>
                  <span className="row-tight tiny strong">
                    {locked ? <Icon name="lock" size={11} /> : null}
                    {theme.name}
                  </span>
                  <span className="tiny faint">{locked ? 'Locked' : theme.tagline}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="stack-4" style={{ marginTop: 'var(--sp-4)' }}>
          <Field label="Motion" hint="“Follow my system” respects your operating system's reduce-motion setting">
            <Segmented
              ariaLabel="Motion preference"
              options={MOTION}
              value={data.preferences.motion}
              onChange={(v) => store.updatePreferences({ motion: v as 'auto' | 'reduced' | 'full' })}
            />
          </Field>
          <Toggle
            label="Compact tables"
            hint="Tighter rows in the session and history tables"
            checked={data.preferences.compactTables}
            onChange={(next) => store.updatePreferences({ compactTables: next })}
          />
          <Toggle
            label="Show source documents"
            hint="Link back to the Markdown file each page was built from"
            checked={data.preferences.showDocSources}
            onChange={(next) => store.updatePreferences({ showDocSources: next })}
          />
        </div>
      </Card>

      <Card title="Training defaults" icon="dumbbell" sub="Used when a programme prescribes no rest, and for the week boundary in charts">
        <div className="stack-4">
          <Field label="Default rest between sets" hint="Seconds. You can still change it per exercise while training.">
            <NumberInput
              value={data.preferences.defaultRestSec}
              onChange={(next) => store.updatePreferences({ defaultRestSec: Math.max(15, Math.min(600, next)) })}
              min={15}
              max={600}
              step={15}
              suffix="s"
              ariaLabel="Default rest in seconds"
            />
          </Field>
          <Toggle
            label="Start the rest timer automatically"
            hint="When you tick a set complete, the timer starts without a tap"
            checked={data.preferences.autoStartRest}
            onChange={(next) => store.updatePreferences({ autoStartRest: next })}
          />
          <Toggle
            label="Timer sound"
            hint="A single short tone when rest ends. Silent by default."
            checked={data.preferences.sound}
            onChange={(next) => store.updatePreferences({ sound: next })}
          />
          <Field label="Week starts on">
            <Segmented
              ariaLabel="First day of the week"
              options={WEEKS}
              value={data.preferences.weekStartsOn === 0 ? '0' : '1'}
              onChange={(v) => store.updatePreferences({ weekStartsOn: v === '0' ? 0 : 1 })}
            />
          </Field>
        </div>
      </Card>

      <Card title="Your data" icon="database" sub={`Stored under the key ${STORAGE_KEY} in this browser`}>
        <div className="grid-4">
          <Stat label="Sessions" value={data.sessions.length} size="sm" icon="dumbbell" />
          <Stat label="Goals" value={data.goals.length} size="sm" icon="target" />
          <Stat label="Approx. size" value={`${(bytes / 1024).toFixed(1)} KB`} size="sm" icon="database" hint={`Storage reports ${footprint.label}`} />
          <Stat label="Last export" value={data.lastExportAt ? formatDate(data.lastExportAt.slice(0, 10), 'short') : 'never'} size="sm" icon="log-out" />
        </div>

        <div className="row-2" style={{ marginTop: 'var(--sp-4)' }}>
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => {
              const ok = downloadExport(data)
              if (ok) {
                store.updatePreferences({})
                toast.success('Backup downloaded', exportFilename())
              } else {
                toast.error('Could not start the download', 'Copy the JSON instead from the box below.')
              }
            }}
          >
            <Icon name="log-out" size={13} />
            Export backup
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={async () => {
              const text = serializeExport(data)
              try {
                await navigator.clipboard.writeText(text)
                toast.success('Copied the full export to your clipboard')
              } catch {
                setImportText(text)
                toast.info('Clipboard blocked — the JSON is in the box below so you can copy it manually')
              }
            }}
          >
            <Icon name="note" size={13} />
            Copy JSON
          </button>
          <button type="button" className="btn btn--quiet btn--sm" onClick={() => { setImportText(serializeExport(data, false)); setPreview(null) }}>
            Show export in the box
          </button>
        </div>
      </Card>

      <Card title="Import a backup" icon="arrow-down" sub="Forge exports, plain {sessions, goals} objects and bare session arrays are all accepted">
        <div className="stack-4">
          <Field label="Import mode" hint="Merge keeps the newest version of any record with the same id. Replace wipes everything first.">
            <Segmented ariaLabel="Import mode" options={[{ value: 'merge', label: 'Merge' }, { value: 'replace', label: 'Replace' }]} value={mode} onChange={(v) => { setMode(v as 'merge' | 'replace'); setPreview(null) }} />
          </Field>
          <div className="row-2">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              <Icon name="arrow-up" size={13} />
              Choose a file…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.txt,application/json"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 25 * 1024 * 1024) {
                  toast.error('That file is too large', 'Imports are capped at 25 MB.')
                  return
                }
                const text = await file.text()
                runImport(text)
              }}
            />
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => { setImportText(''); setPreview(null) }}>
              Clear
            </button>
          </div>
          <Field label="Or paste JSON" hint="Nothing is written until you press Import.">
            <textarea
              className="input"
              rows={6}
              spellCheck={false}
              placeholder='{"app":"forge-workout","version":1,"sessions":[…] }'
              value={importText}
              onChange={(e) => runImport(e.target.value)}
            />
          </Field>
          {preview ? (
            <div className="banner banner--info">
              <Icon name="check-circle" size={15} />
              <span>
                Ready to import: <strong>{preview}</strong> in {mode} mode.
              </span>
            </div>
          ) : null}
          <div className="row-2">
            <button type="button" className="btn btn--primary btn--sm" disabled={!preview} onClick={() => setConfirmImport(true)}>
              <Icon name="check" size={13} />
              Import {mode === 'replace' ? 'and replace everything' : 'into my log'}
            </button>
            <Link to="/docs/logs-template" className="btn btn--quiet btn--sm">
              <Icon name="note" size={13} />
              Markdown log format
            </Link>
          </div>
        </div>
      </Card>

      <div className="grid-2">
        <Card title="Storage health" icon="shield-check">
          <KeyValue
            rows={[
              { k: 'Persistent', v: persistent ? 'yes — data survives a reload' : 'no — memory only' },
              { k: 'Storage key', v: STORAGE_KEY },
              { k: 'Backup of corrupt data', v: `${STORAGE_KEY}.corrupt` },
              { k: 'Scheme version', v: String(data.version) },
              { k: 'Export format', v: `${EXPORT_APP} v${EXPORT_VERSION}` },
              { k: 'Sessions', v: String(data.sessions.length) },
              { k: 'Latest session', v: latest ? `${formatDate(latest.date, 'medium')} — ${latest.title}` : 'none' },
              { k: 'Corrupt records repaired', v: 'dropped and reported, never silently kept' },
            ]}
          />
          <div className="row-2" style={{ marginTop: 'var(--sp-4)' }}>
            <Link to="/docs" className="btn btn--quiet btn--sm">
              <Icon name="book-open" size={13} />
              Handbook
            </Link>
            <Link to="/profile" className="btn btn--quiet btn--sm">
              <Icon name="user" size={13} />
              Profile
            </Link>
          </div>
        </Card>

        <Card title="About" icon="info">
          <div className="stack-3">
            <p className="small">
              <strong>Forge</strong> is an offline-first training log built around the Markdown handbook in this repository. Programmes, the
              exercise library, warm-up menus, goals, the RPE chart and the deload rules are all transcribed from those files — the app does not
              invent training advice.
            </p>
            <ul className="stack-2">
              {[
                'No network calls, no analytics, no accounts.',
                'XP, levels, streaks, records, achievements and unlocks are all computed from logged sessions.',
                'Deleting a session recalculates everything it had earned — nothing is decorative.',
                `Catalogue: ${ACHIEVEMENTS.length} achievements, ${UNLOCKS.length} unlocks, ${THEMES.length} themes.`,
                `Validation limits: max ${LIMITS.maxWeight} weight, ${LIMITS.maxReps} reps, ${LIMITS.maxSets} sets per exercise.`,
              ].map((line) => (
                <li key={line} className="small row-tight" style={{ alignItems: 'flex-start' }}>
                  <Icon name="check" size={13} className="good" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="row-2">
              <Chip tone="good" icon="wifi-off">
                Works offline
              </Chip>
              <Chip tone="info" icon="shield-check">
                Local only
              </Chip>
            </div>
            <p className="tiny faint">
              Saved automatically after every change. Last save {data.updatedAt ? formatDate(data.updatedAt.slice(0, 10), 'medium') : '—'}.
            </p>
          </div>
        </Card>
      </div>

      <Card title="Reset" icon="alert-triangle" sub="This is the one destructive action in the app, so it asks twice">
        <div className="stack-3">
          <p className="small muted">
            Clearing removes every session, goal, record, achievement and unlock held in this browser and returns the app to its first-run state.
            Export first if there is anything here you want to keep.
          </p>
          <div className="row-2">
            <button type="button" className="btn btn--quiet btn--sm" onClick={() => downloadExport(data)}>
              <Icon name="log-out" size={13} />
              Export first
            </button>
            <button type="button" className="btn btn--danger btn--sm" onClick={() => setConfirmReset(true)}>
              <Icon name="alert-triangle" size={13} />
              Reset everything
            </button>
            <button
              type="button"
              className="btn btn--quiet btn--sm"
              onClick={() => {
                clearAppData(getStorage())
                store.refresh()
                toast.info('Storage cleared', 'In-memory data is untouched. Export or reload if that was not what you wanted.')
              }}
            >
              Clear stored copy only
            </button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={confirmImport}
        onCancel={() => setConfirmImport(false)}
        onConfirm={apply}
        title={mode === 'replace' ? 'Replace all your data?' : 'Import into your log?'}
        message={
          mode === 'replace'
            ? 'Everything currently stored in this browser is discarded and replaced by the file. Your acknowledged toasts and any unlocked-state are recalculated from the imported sessions.'
            : 'Imported sessions are merged into your log. Where both sides have a record with the same id, the newest one wins — nothing is duplicated.'
        }
        confirmLabel={mode === 'replace' ? 'Replace everything' : 'Merge import'}
      />

      <ConfirmDialog
        open={confirmReset}
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          store.resetAll()
          setConfirmReset(false)
          toast.success('Reset complete', 'The app is back to a clean slate — your Markdown files in the repository are untouched.')
        }}
        title="Reset everything?"
        message="Every session, goal, record, achievement and unlock in this browser will be deleted. This cannot be undone unless you exported a backup first."
        confirmLabel="Yes, reset everything"
      />

      <p className="tiny faint center">
        Forge · offline-first · your data lives in this browser and nowhere else
      </p>
    </div>
  )
}

export default Settings
