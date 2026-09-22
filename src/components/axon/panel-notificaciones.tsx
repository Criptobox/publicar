'use client'

import {
  Bell,
  BellOff,
  CheckCheck,
  DollarSign,
  PackageMinus,
  PackagePlus,
  PackageX,
  Sparkles,
} from 'lucide-react'
import type { Notificacion } from '@/lib/axon'
import { Hoja } from './hoja'

interface Props {
  abierta: boolean
  alCerrar: () => void
  notificaciones: Notificacion[]
  alMarcarTodas: () => void
  bn?: boolean
}

const ICONOS: Record<string, React.ReactNode> = {
  agotado: <PackageMinus className="h-4 w-4 text-red-500" />,
  nuevo: <Sparkles className="h-4 w-4 text-emerald-500" />,
  stock: <PackagePlus className="h-4 w-4 text-emerald-500" />,
  precio: <DollarSign className="h-4 w-4 text-amber-500" />,
  quitar: <PackageX className="h-4 w-4 text-red-500" />,
}

function fechaRelativa(iso: string): string {
  const d = new Date(iso)
  const dif = Date.now() - d.getTime()
  const min = Math.floor(dif / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  return d.toLocaleDateString('es-CU', { day: 'numeric', month: 'short' })
}

export function PanelNotificaciones({
  abierta,
  alCerrar,
  notificaciones,
  alMarcarTodas,
  bn,
}: Props) {
  const noLeidas = notificaciones.filter((n) => !n.leida).length

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Avisos"
      subtitulo="Cambios detectados al sincronizar con el repo"
      bn={bn}
    >
      {notificaciones.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
          <BellOff className="h-10 w-10 opacity-40" />
          <p className="max-w-[240px] text-sm">
            Todavía no hay avisos. Pulsa «Sincronizar» y te avisaré aquí cuando un
            producto se agote, vuelva a haber stock, cambie de precio o salga uno nuevo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {noLeidas > 0 ? `${noLeidas} sin leer` : 'Todo leído'}
            </p>
            {noLeidas > 0 ? (
              <button
                onClick={alMarcarTodas}
                className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground transition hover:bg-accent"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todo leído
              </button>
            ) : null}
          </div>

          <ul className="space-y-2">
            {notificaciones.map((n) => (
              <li
                key={n.id}
                className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                  n.leida
                    ? 'border-border bg-background opacity-70'
                    : 'border-primary/30 bg-primary/5'
                }`}
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  {ICONOS[n.tipo] ?? <Bell className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold leading-snug">{n.titulo}</p>
                  {n.mensaje ? (
                    <p className="truncate text-[13px] text-muted-foreground">{n.mensaje}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {fechaRelativa(n.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Hoja>
  )
}
