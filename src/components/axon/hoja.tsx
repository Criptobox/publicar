'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface Props {
  abierta: boolean
  alCerrar: () => void
  titulo: string
  subtitulo?: string
  bn?: boolean
  children: React.ReactNode
}

/** Hoja inferior estilo móvil para editar, publicar y paneles. */
export function Hoja({ abierta, alCerrar, titulo, subtitulo, bn, children }: Props) {
  useEffect(() => {
    if (!abierta) return
    const antes = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => {
      document.body.style.overflow = antes
      window.removeEventListener('keydown', alTeclear)
    }
  }, [abierta, alCerrar])

  if (!abierta) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={titulo}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animar-fondo"
        onClick={alCerrar}
      />
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-t-[1.75rem] border border-b-0 border-border bg-card text-card-foreground shadow-2xl animar-hoja pb-[env(safe-area-inset-bottom)] ${bn ? 'modo-bn' : ''}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 pb-4 pt-3">
          <div className="min-w-0">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
            <h2 className="truncate text-lg font-bold">{titulo}</h2>
            {subtitulo ? (
              <p className="truncate text-sm text-muted-foreground">{subtitulo}</p>
            ) : null}
          </div>
          <button
            onClick={alCerrar}
            aria-label="Cerrar"
            className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="scroll-fino flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}
