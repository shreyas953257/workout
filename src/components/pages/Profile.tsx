import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { Card, Chip, Field, KeyValue, Meter, SectionHead, Stat } from '../ui/primitives'
import { LevelCard, LevelRing, StreakCard, WeekDots, XpLedger } from '../gamification'
import { RecordCard } from '../gamification/Records'
import { THEMES } from '../../data/themes'
import { ACHIEVEMENTS } from '../../data/achievements'
import { UNLOCKS } from '../../data/unlocks'
import { levelTable } from '../../data/levels'
import { useAppState, store } from '../../lib/store'
import { topRecords } from '../../lib/prs'
import { formatDate, todayKey } from '../../lib/dates'
import { formatDuration, pluralize } from '../../lib/format'
import { toast } from '../ui/Toast'


/** Who you are, what you have done, and the numbers that back it up. */

export function Profile() {
  const { data, progress } = useAppState()
  const [name, setName] = useState(data.profile.displayName)
  const [bodyweight, setBodyweight] = useState(data.profile.bodyweightKg !== undefined ? String(data.profile.bodyweightKg) : '')
  const [height, setHeight] = useState(data.profile.heightCm !== undefined ? String(data.profile.heightCm) : '')
  const units = data.profile.units

  const records = useMemo(() => topRecords(progress.prs, 6), [progress.prs])
  const joined = data.profile.joinedAt
  const levelRows = useMemo(() => levelTable(8), [])
  const unlockedAchievements = progress.achievements.filter((a) => a.unlocked).length

  const saveProfile = () => {
    const bw = bodyweight.trim() === '' ? undefined : Number(bodyweight.replace(',', '.'))
    const hc = height.trim() === '' ? undefined : Number(height.replace(',', '.'))
    if (bw !== undefined && (!Number.isFinite(bw) || bw <= 0 || bw > 500)) {
      toast.error('Bodyweight looks wrong', 'Enter a value between 0 and 500, or leave it blank.')
      return
    }
    if (hc !== undefined && (!Number.isFinite(hc) || hc <= 0 || hc > 260)) {
      toast.error('Height looks wrong', 'Enter centimetres between 0 and 260, or leave it blank.')
      return
    }
    store.updateProfile({ displayName: name.slice(0, 120), bodyweightKg: bw, heightCm: hc })
    toast.success('Profile saved', 'Bodyweight feeds the bodyweight goals and records.')
  }

  return (
    <div className="page">
      <SectionHead
        icon="user"
        title={data.profile.displayName.trim() || 'Your profile'}
        sub={`${joined ? `Joined ${formatDate(joined.slice(0, 10), 'long')} · ` : ''}${progress.totals.workouts} sessions · level ${progress.level.level} ${progress.level.title}`}
        actions={
          <Link to="/settings" className="btn btn--quiet btn--sm">
            <Icon name="settings" size={13} />
            Settings
          </Link>
        }
      />

      <Card className="card--glow">
        <div className="row" style={{ gap: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'center' }}>
          <LevelRing level={progress.level} size={140} />
          <div className="stack-3 grow" style={{ minWidth: 240 }}>
            <div className="stack-2">
              <h2 className="h3">{progress.level.title}</h2>
              <p className="small muted">
                {progress.level.xp.toLocaleString()} XP · {progress.level.into} into level {progress.level.level} ·{' '}
                {progress.level.needed - progress.level.into} XP to level {progress.level.level + 1}
              </p>
            </div>
            <Meter pct={progress.level.pct} label={`Progress through level ${progress.level.level}`} />
            <div className="row-2">
              <Chip icon="spark">{progress.xpEvents.length} XP awards</Chip>
              <Chip icon="flame">streak {progress.streak.current}</Chip>
              <Chip icon="award">
                {unlockedAchievements}/{ACHIEVEMENTS.length} achievements
              </Chip>
              <Chip icon="unlock">
                {progress.unlockedIds.length}/{UNLOCKS.length} unlocks
              </Chip>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid-2">
        <LevelCard level={progress.level} xp={progress.xp} />
        <StreakCard streak={progress.streak} weekly={progress.weekly} />
      </div>

      <div className="grid-2">
        <Card title="Your details" icon="user" sub="Used for bodyweight goals and the units shown across the app">
          <div className="stack-4">
            <Field label="Display name" htmlFor="pf-name">
              <input id="pf-name" className="input" maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="grid-2">
              <Field label={`Bodyweight (${units})`} hint="Optional — leave blank if you would rather not track it" htmlFor="pf-bw">
                <input id="pf-bw" className="input" inputMode="decimal" value={bodyweight} onChange={(e) => setBodyweight(e.target.value)} />
              </Field>
              <Field label="Height (cm)" hint="Optional" htmlFor="pf-h">
                <input id="pf-h" className="input" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} />
              </Field>
            </div>
            <div className="row-2">
              <button type="button" className="btn btn--primary btn--sm" onClick={saveProfile}>
                <Icon name="check" size={13} />
                Save profile
              </button>
              <div className="segmented" role="group" aria-label="Units">
                {(['kg', 'lb'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    className={`segmented__item ${data.profile.units === u ? 'is-on' : ''}`}
                    aria-pressed={data.profile.units === u}
                    onClick={() => {
                      store.updateProfile({ units: u })
                      toast.info(`Showing weights in ${u}`, 'Stored values are unchanged — this only changes how they are displayed.')
                    }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <p className="tiny faint">
              Weights are stored exactly as you enter them. Switching units changes the label, never the number, so no history is distorted.
            </p>
          </div>
        </Card>

        <Card title="Lifetime totals" icon="database" sub={progress.totals.firstWorkoutAt ? `First session ${formatDate(progress.totals.firstWorkoutAt, 'medium')}` : 'Nothing logged yet'}>
          <div className="grid-2">
            <Stat label="Workouts" value={progress.totals.workouts} size="sm" icon="dumbbell" />
            <Stat label="Sets" value={progress.totals.sets.toLocaleString()} size="sm" icon="repeat" />
            <Stat label="Volume" value={Math.round(progress.totals.volumeKg).toLocaleString()} unit={units} size="sm" icon="layers" />
            <Stat label="Time" value={formatDuration(progress.totals.durationMin)} size="sm" icon="clock" />
            <Stat label="Exercises used" value={progress.totals.distinctExercises} size="sm" icon="book" />
            <Stat label="Goals completed" value={progress.totals.goalsCompleted} size="sm" icon="target" />
            <Stat label="Records" value={progress.prCount} size="sm" icon="trophy" />
            <Stat label="Unlocks" value={progress.unlockEvents.length} size="sm" icon="unlock" />
          </div>
          <div className="stack-3" style={{ marginTop: 'var(--sp-4)' }}>
            <WeekDots weekly={progress.weekly} weekStartsOn={data.preferences.weekStartsOn} />
            <p className="tiny faint">
              {progress.streak.totalDays} distinct training {pluralize(progress.streak.totalDays, 'day')} · longest run {progress.streak.longest}{' '}
              {pluralize(progress.streak.longest, 'day')}
              {progress.streak.lastWorkoutDate ? ` · last trained ${formatDate(progress.streak.lastWorkoutDate, 'medium')}` : ''}
            </p>
          </div>
        </Card>
      </div>

      <Card title="Level ladder" icon="layers" sub="The XP required for each level is fixed: 50 × (level − 1) × level">
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Title</th>
                <th className="num">XP needed</th>
                <th className="num">Status</th>
              </tr>
            </thead>
            <tbody>
              {levelRows.map((level: { level: number; xp: number; title: string; tier: string }) => {
                const reached = progress.level.level >= level.level
                return (
                  <tr key={level.level} className={progress.level.level === level.level ? 'is-current' : undefined}>
                    <td className="num">{level.level}</td>
                    <td>
                      {level.title} <span className="tiny faint">· {level.tier}</span>
                    </td>
                    <td className="num">{level.xp.toLocaleString()}</td>
                    <td className="num">
                      {reached ? <Icon name="check" size={13} className="good" /> : `${Math.max(0, level.xp - progress.xp).toLocaleString()} to go`}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <KeyValue
          rows={[
            { k: 'Current level', v: `${progress.level.level} — ${progress.level.title}` },
            { k: 'XP into level', v: `${progress.level.into} / ${progress.level.needed}` },
            { k: 'Total XP', v: progress.xp.toLocaleString() },
            { k: 'Today', v: formatDate(todayKey(), 'long') },
          ]}
        />
      </Card>

      <section className="stack-3" aria-labelledby="records">
        <SectionHead
          id="records"
          icon="trophy"
          title="Your records"
          sub={progress.prCount > 0 ? `${progress.prCount} records, most recent first` : 'No records yet'}
          actions={<Link to="/analytics" className="btn btn--quiet btn--sm">All records</Link>}
        />
        {records.length === 0 ? (
          <Card>
            <p className="small faint">
              Records appear once you beat a previous best — the first session on an exercise sets a baseline but does not count as a record.
            </p>
          </Card>
        ) : (
          <div className="auto-grid" style={{ '--min': '250px' } as React.CSSProperties}>
            {records.map((r) => (
              <RecordCard key={r.exerciseId} record={r} units={units} />
            ))}
          </div>
        )}
      </section>

      <Card title="Appearance" icon="palette" sub="Themes are unlocked with XP — the default is always free">
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
                  <span className="tiny faint">{theme.tagline}</span>
                </span>
              </button>
            )
          })}
        </div>
      </Card>

      <XpLedger events={progress.xpEvents} limit={25} />

      <Card title="Session log source" icon="note" sub="The Markdown files this app is built around are still in the repository and readable at any time">
        <div className="row-2">
          <Link to="/docs" className="btn btn--ghost btn--sm">
            <Icon name="book-open" size={13} />
            Read the handbook
          </Link>
          <Link to="/settings" className="btn btn--quiet btn--sm">
            <Icon name="log-out" size={13} />
            Export or import
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default Profile
