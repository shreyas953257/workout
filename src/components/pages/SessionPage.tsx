import { SessionRunner } from '../workout/SessionRunner'

/**
 * `/session` — the live workout screen.
 *
 * Kept as its own route so the shell can show the "Back to session" pill and the
 * rest timer stays reachable from anywhere in the app while a draft is open.
 */
export function SessionPage() {
  return <SessionRunner />
}

export default SessionPage
