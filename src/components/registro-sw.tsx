'use client'

import { useEffect } from 'react'

/**
 * Registra el service worker (solo en producción, para no estorbar el desarrollo).
 * Gracias a esto el catálogo queda disponible incluso sin internet.
 */
export function RegistroSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    const t = setTimeout(() => {
      navigator.serviceWorker.register('/sw.js').catch((e) => {
        console.warn('No se pudo registrar el service worker:', e)
      })
    }, 1500)
    return () => clearTimeout(t)
  }, [])
  return null
}
