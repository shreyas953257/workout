import { useEffect, useMemo } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../ui/Icon'
import { Badge } from '../ui/primitives'
import { ToastHost, pushToast } from '../ui/Toast'
import { useAppState, store } from '../../lib/store'
import { ACHIEVEMENT_MAP } from '../../data/achievements'
import { UNLOCK_MAP } from '../../data/unlocks'

/**
 * The application frame: side navigation on desktop, a top bar plus a bottom
 * tab bar on mobile, and the notification queue that turns newly earned
 * achievements and unlocks into toasts.
 *
 * Every route renders through <Outlet/>, so the shell owns navigation chrome
 * only — no page logic leaks in here.
 */

export interface NavItem {
  to: string
  label: string
  icon: IconName
  /** Badge count shown next to the label. */
  badge?: number
  end?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    label: 'Train',
    items: [
      { to: '/', label: 'Dashboard', icon: 'home', end: true },
      { to: '/workouts', label: 'Workouts', icon: 'dumbbell' },
      { to: '/programs', label: 'Programmes', icon: 'layers' },
      { to: '/exercises', label: 'Exercises', icon: 'book' },
    ],
  },
  {
    label: 'Progress',
    items: [
      { to: '/history', label: 'History', icon: 'history' },
      { to: '/calendar', label: 'Calendar', icon: 'calendar' },
      { to: '/analytics', label: 'Analytics', icon: 'chart' },
      { to: '/goals', label: 'Goals', icon: 'target' },
    ],
  },
  {
    label: 'Rewards',
    items: [
      { to: '/achievements', label: 'Achievements', icon: 'trophy' },
      { to: '/unlocks', label: 'Unlocks', icon: 'unlock' },
    ],
  },
  {
    label: 'You',
    items: [
      { to: '/profile', label: 'Profile', icon: 'user' },
      { to: '/docs', label: 'Handbook', icon: 'note' },
      { to: '/settings', label: 'Settings', icon: 'settings' },
    ],
  },
]

/** The five most-used destinations, for the mobile tab bar. */
const TABS: NavItem[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/programs', label: 'Programmes', icon: 'layers' },
  { to: '/workouts', label: 'Train', icon: 'dumbbell' },
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/profile', label: 'You', icon: 'user' },
]

const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Dashboard'],
  [/^\/workouts/, 'Workouts'],
  [/^\/programs\/[^/]+/, 'Programme'],
  [/^\/programs/, 'Programmes'],
  [/^\/session/, 'Session'],
  [/^\/exercises\/[^/]+/, 'Exercise'],
  [/^\/exercises/, 'Exercise library'],
  [/^\/history\/[^/]+/, 'Session'],
  [/^\/history/, 'History'],
  [/^\/calendar/, 'Calendar'],
  [/^\/analytics/, 'Analytics'],
  [/^\/achievements/, 'Achievements'],
  [/^\/unlocks/, 'Unlocks'],
  [/^\/goals/, 'Goals'],
  [/^\/profile/, 'Profile'],
  [/^\/docs/, 'Handbook'],
  [/^\/settings/, 'Settings'],
]

function titleFor(pathname: string): string {
  for (const [pattern, title] of TITLES) {
    if (pattern.test(pathname)) return title
  }
  return 'Forge'
}

/* -------------------------------------------------------------------------- */

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { progress, draft, pendingNotifications, saveError, persistent } = useAppState()

  const counts = useMemo(
    () => ({
      achievements: progress.achievements.filter((a) => a.unlocked).length,
      unlocks: progress.unlockedIds.length,
      goals: progress.totals.goalsCompleted,
    }),
    [progress],
  )

  // Scroll to the top on navigation, unless the user is mid-session.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  // Announce everything the replay engine has newly credited. Each id is
  // acknowledged once, so reloading or re-earning cannot spam the queue.
  useEffect(() => {
    if (pendingNotifications.length === 0) return
    const shown: string[] = []
    for (const id of pendingNotifications) {
      const [kind, key] = id.split(':')
      if (kind === 'achievement') {
        const a = ACHIEVEMENT_MAP[key]
        if (!a) continue
        pushToast({
          title: `Achievement unlocked · ${a.name}`,
          text: `${a.description} +${a.xp} XP`,
          tone: 'accent',
          icon: 'trophy',
          href: '/achievements',
          duration: 9000,
        })
        shown.push(id)
      } else if (kind === 'unlock') {
        const u = UNLOCK_MAP[key]
        if (!u) continue
        pushToast({
          title: `Unlocked · ${u.name}`,
          text: `${u.description}`,
          tone: 'accent',
          icon: u.kind === 'theme' ? 'palette' : u.kind === 'program' ? 'layers' : 'unlock',
          href: '/unlocks',
          duration: 9000,
        })
        shown.push(id)
      }
    }
    if (shown.length > 0) store.acknowledge(shown)
  }, [pendingNotifications])

  // A failed save is the one thing the user must never miss.
  useEffect(() => {
    if (!saveError) return
    pushToast({ title: 'Could not save your data', text: saveError, tone: 'bad', icon: 'alert-triangle', duration: 0 })
  }, [saveError])

  useEffect(() => {
    if (persistent) return
    pushToast({
      title: 'Storage is unavailable',
      text: 'This browser is blocking local storage, so nothing will be kept after you close the tab. Export a backup before you leave.',
      tone: 'warn',
      icon: 'database',
      duration: 0,
    })
  }, [persistent])

  const badgeFor = (to: string): number | undefined => {
    if (to === '/achievements') return counts.achievements || undefined
    if (to === '/unlocks') return counts.unlocks || undefined
    if (to === '/goals') return counts.goals || undefined
    return undefined
  }

  const inSession = Boolean(draft)

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <nav className="sidenav" aria-label="Main">
        <NavLink to="/" className="brand">
          <span className="brand__mark" aria-hidden>
            <Icon name="flame" size={20} />
          </span>
          <span className="brand__text">
            <span className="brand__name">Forge</span>
            <span className="brand__tag">Level {progress.level.level} · {progress.level.title}</span>
          </span>
        </NavLink>

        {inSession ? (
          <NavLink to="/session" className="nav-link is-active" style={{ marginBottom: 'var(--sp-2)' }}>
            <span className="nav-link__icon">
              <Icon name="play" size={16} />
            </span>
            <span className="nav-link__label">Session in progress</span>
            <Badge>{draft!.exercises.length}</Badge>
          </NavLink>
        ) : null}

        {NAV.map((group) => (
          <div key={group.label}>
            <p className="nav-section">{group.label}</p>
            <div className="nav-list">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}
                >
                  <span className="nav-link__icon">
                    <Icon name={item.icon} size={17} />
                  </span>
                  <span className="nav-link__label">{item.label}</span>
                  {badgeFor(item.to) ? <span className="nav-badge num">{badgeFor(item.to)}</span> : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}

        <div className="nav-foot">
          <div className="well" style={{ padding: 'var(--sp-3)' }}>
            <div className="row-between tiny">
              <span className="eyebrow">Total XP</span>
              <span className="num strong accent">{progress.xp.toLocaleString()}</span>
            </div>
            <div className="meter meter--thin" style={{ marginTop: 8 }}>
              <div className="meter__fill" style={{ '--pct': `${progress.level.pct}%` } as React.CSSProperties} />
            </div>
            <div className="row-between tiny faint" style={{ marginTop: 6 }}>
              <span>{progress.streak.current > 0 ? `${progress.streak.current}-day streak` : 'No active streak'}</span>
              <span className="num">{progress.level.needed} to L{progress.level.level + 1}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="main">
        <header className="topbar">
          <span className="brand__mark" style={{ width: 30, height: 30, borderRadius: 9 }} aria-hidden>
            <Icon name="flame" size={16} />
          </span>
          <span className="topbar__title">{titleFor(location.pathname)}</span>
          {inSession ? (
            <NavLink to="/session" className="btn btn--primary btn--sm">
              <Icon name="play" size={13} />
              Resume
            </NavLink>
          ) : null}
        </header>

        <main id="main" tabIndex={-1} className="container">
          <Outlet />
        </main>
      </div>

      <nav className="tabbar" aria-label="Primary">
        <div className="tabbar__list">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}
            >
              <Icon name={tab.icon} size={19} />
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {inSession && location.pathname !== '/session' ? (
        <button type="button" className="fab" onClick={() => navigate('/session')}>
          <Icon name="play" size={16} />
          Back to session
        </button>
      ) : null}

      <ToastHost onNavigate={(href) => navigate(href)} />
    </div>
  )
}

export default AppShell
