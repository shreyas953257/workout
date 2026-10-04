import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'

/**
 * Offline support.
 *
 * Registered only in a production build — a service worker sitting in front of
 * Vite's dev server interferes with hot reloading and serves stale modules while
 * you are editing. A failure here is never fatal: the app works without it.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // The workout app is fully client-side. Unregister older service workers so
  // stale cached HTML/assets cannot interfere with the deployed app.
  window.addEventListener('load', () => {
    void navigator.serviceWorker.getRegistrations().then((registrations) =>
      Promise.all(registrations.map((registration) => registration.unregister())),
    )
  })
}

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  // The splash shell is only needed until React paints.
  requestAnimationFrame(() => document.getElementById('boot')?.remove())
}
