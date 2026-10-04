/* Forge service worker — offline support for a fully static app.
 *
 * Strategy:
 *   • Precache the app shell on install (index.html, the manifest, the icon).
 *   • Hashed build assets (/assets/*) are cache-first, because their filenames
 *     change whenever their contents do.
 *   • Navigations are network-first with a cached index.html fallback, so a
 *     reload while offline still boots the app.
 *   • Anything else is stale-while-revalidate.
 *
 * There is no server, no API and no user data on the network: all state lives in
 * localStorage, so nothing here ever needs to sync.
 */

const VERSION = 'forge-v2'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`

const SHELL_FILES = ['./', './index.html', './manifest.webmanifest', './icon.svg', './workout-split-bg.jpg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL)
      // Individually, so one 404 cannot fail the whole install.
      await Promise.all(
        SHELL_FILES.map(async (file) => {
          try {
            await cache.add(new Request(file, { cache: 'reload' }))
          } catch {
            /* offline-only install, or the file is missing — skip it */
          }
        }),
      )
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit
  const response = await fetch(request)
  if (response && response.ok && response.type === 'basic') cache.put(request, response.clone())
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match('./index.html')) || Response.error()
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') cache.put(request, response.clone())
      return response
    })
    .catch(() => undefined)
  return hit || (await network) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Only same-origin requests are cached; nothing else is fetched by the app.
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request, ASSETS))
    return
  }

  // Public static files (including workout images) should be fetched fresh and
  // cached only after a successful network response. Never let an old SW cache
  // replace a newly deployed image.
  if (url.pathname.startsWith('/images/') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.png') || url.pathname.endsWith('.webp')) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(staleWhileRevalidate(request, SHELL))
})
