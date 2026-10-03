import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './components/pages/Dashboard'
import { Workouts } from './components/pages/Workouts'
import { Programs } from './components/pages/Programs'
import { ProgramDetail } from './components/pages/ProgramDetail'
import { SessionPage } from './components/pages/SessionPage'
import { Exercises } from './components/pages/Exercises'
import { ExerciseDetail } from './components/pages/ExerciseDetail'
import { History } from './components/pages/History'
import { SessionDetail } from './components/pages/SessionDetail'
import { CalendarPage } from './components/pages/CalendarPage'
import { Analytics } from './components/pages/Analytics'
import { Goals } from './components/pages/Goals'
import { Achievements } from './components/pages/Achievements'
import { Unlocks } from './components/pages/Unlocks'
import { Profile } from './components/pages/Profile'
import { Settings } from './components/pages/Settings'
import { NotFound } from './components/pages/NotFound'

// The handbook is the heaviest part of the bundle (every Markdown file is
// inlined at build time), and only two screens need it, so it loads on demand.
const Docs = lazy(() => import('./components/pages/Docs').then((m) => ({ default: m.Docs })))
const DocPage = lazy(() => import('./components/pages/DocPage').then((m) => ({ default: m.DocPage })))

function RouteLoading({ label }: { label: string }) {
  return (
    <div className="page">
      <div className="stack-3" aria-live="polite" aria-busy="true">
        <p className="eyebrow">{label}…</p>
        <div className="skeleton" style={{ height: 28, width: '40%' }} />
        <div className="skeleton" style={{ height: 120 }} />
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    </div>
  )
}

/**
 * Routing.
 *
 * HashRouter, because the app is served from a static folder — including from
 * `file://` and from GitHub Pages sub-paths — where server-side history support
 * does not exist. Every screen is reachable by URL and survives a reload.
 */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/:id" element={<ProgramDetail />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/exercises/:id" element={<ExerciseDetail />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<SessionDetail />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/unlocks" element={<Unlocks />} />
          <Route path="/profile" element={<Profile />} />
          <Route
            path="/docs"
            element={
              <Suspense fallback={<RouteLoading label="Loading the handbook" />}>
                <Docs />
              </Suspense>
            }
          />
          <Route
            path="/docs/:id"
            element={
              <Suspense fallback={<RouteLoading label="Loading the document" />}>
                <DocPage />
              </Suspense>
            }
          />
          <Route path="/settings" element={<Settings />} />
          {/* Redirects for the names people guess first. */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/programmes" element={<Navigate to="/programs" replace />} />
          <Route path="/prs" element={<Navigate to="/analytics" replace />} />
          <Route path="/library" element={<Navigate to="/exercises" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
