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
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline caching is a bonus, not a requirement */
    })
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
