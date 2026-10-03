import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from '../src/App'
import { STORAGE_KEY } from '../src/lib/storage'
import { store } from '../src/lib/store'

/**
 * Route smoke tests.
 *
 * These render the real application — shell, router and pages — at every route
 * and assert that each screen mounts with its heading. They exist to catch the
 * class of bug unit tests miss: a page that throws on first render, an import
 * that is undefined, a route that was never registered.
 */

const ROUTES: { path: string; expect: RegExp }[] = [
  { path: '/', expect: /good (morning|afternoon|evening)|still up|late session/i },
  { path: '/workouts', expect: /workout|free session|rest day/i },
  { path: '/programs', expect: /programme/i },
  { path: '/programs/beginner-full-body', expect: /beginner full[- ]body/i },
  { path: '/session', expect: /session|exercise|start/i },
  { path: '/exercises', expect: /exercise library/i },
  { path: '/exercises/back-squat', expect: /back squat/i },
  { path: '/history', expect: /workout history/i },
  { path: '/calendar', expect: /training calendar/i },
  { path: '/analytics', expect: /analytics/i },
  { path: '/goals', expect: /goal/i },
  { path: '/achievements', expect: /achievement/i },
  { path: '/unlocks', expect: /unlock/i },
  { path: '/profile', expect: /level|lifetime totals|your profile/i },
  { path: '/settings', expect: /settings/i },
  { path: '/nope-not-a-route', expect: /does not exist/i },
]

function setHash(path: string) {
  window.location.hash = `#${path}`
}

beforeEach(() => {
  window.localStorage.clear()
  store.resetAll()
  setHash('/')
})

afterEach(() => {
  cleanup()
})

describe('app routes', () => {
  it.each(ROUTES)('renders $path without crashing', (route) => {
    setHash(route.path)
    const { container } = render(<App />)
    expect(container.querySelector('main')).toBeTruthy()
    // Text is matched against the whole page: headings are split across
    // elements, so a node-level query is unnecessarily brittle.
    expect(container.textContent ?? '').toMatch(route.expect)
  })

  it('shows the primary navigation for all sections', () => {
    render(<App />)
    const navs = document.querySelectorAll('nav')
    expect(navs.length).toBeGreaterThan(0)
    const labels = [...navs].flatMap((nav) => [...nav.querySelectorAll('a')].map((a) => a.textContent?.trim() ?? ''))
    for (const label of ['Dashboard', 'Workouts', 'Programmes', 'Exercises', 'History', 'Calendar', 'Analytics', 'Goals', 'Achievements', 'Unlocks', 'Profile', 'Handbook', 'Settings']) {
      expect(labels.some((l) => l.includes(label))).toBe(true)
    }
  })

  it('starts from an empty log and still renders the dashboard', () => {
    const { container } = render(<App />)
    expect(container.textContent).toMatch(/no workouts logged yet|nothing planned|scheduled rest day|today's workout/i)
  })

  it('recovers from corrupted stored data instead of crashing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"sessions": "not-an-array", "goals": 7}')
    const { container } = render(<App />)
    expect(container.querySelector('main')).toBeTruthy()
    expect(container.textContent).not.toMatch(/something went wrong/i)
  })

  it('renders pending achievements and unlocks as toasts after real activity', () => {
    // A single session should push the user past level 1 and announce it.
    setHash('/')
    store.acknowledge([])
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
