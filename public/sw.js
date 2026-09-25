/* Service Worker del Publicador AXON
 *
 * Estrategia:
 * - /api/productos → network-first con respaldo en caché: si no hay internet,
 *   la última versión del catálogo sigue visible (modo offline).
 * - Fotos y estáticos (/_next/static, /photos, /icons) → cache-first: no cambian.
 * - El resto de la navegación → red, con la portada en caché como respaldo.
 *
 * Para forzar una versión nueva del caché, sube el número de VERSION.
 */
const VERSION = 'axon-v1'
const CACHE = `${VERSION}-contenido`

const PRECACHE = ['/', '/manifest.json', '/logo.svg']

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) =>
        Promise.all(
          claves
            .filter((k) => k !== CACHE && k.startsWith('axon-'))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (evento) => {
  const req = evento.request
  if (req.method !== 'GET') return
  let url
  try {
    url = new URL(req.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return

  // Catálogo: red primero, caché como respaldo offline
  if (url.pathname === '/api/productos') {
    evento.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {})
          return res
        })
        .catch(() =>
          caches
            .match(req)
            .then((m) => m || new Response(JSON.stringify({ productos: [], offline: true }), {
              headers: { 'Content-Type': 'application/json' },
            }))
        )
    )
    return
  }

  // Estáticos y fotos: caché primero
  const esEstatico =
    url.pathname.startsWith('/photos/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/_next/static') ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/manifest.json'
  if (esEstatico) {
    evento.respondWith(
      caches.match(req).then(
        (m) =>
          m ||
          fetch(req).then((res) => {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia)).catch(() => {})
            return res
          })
      )
    )
    return
  }

  // Navegación: red con respaldo de la portada
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req).catch(() => caches.match('/').then((m) => m || Response.error()))
    )
  }
})
