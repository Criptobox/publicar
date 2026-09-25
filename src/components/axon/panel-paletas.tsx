'use client'

import { useEffect, useState } from 'react'
import { Check, KeyRound, Moon, Sun } from 'lucide-react'
import { PALETAS } from '@/lib/axon'
import { CLAVE_TOKEN } from '@/lib/cliente'
import { Hoja } from './hoja'

interface Props {
  abierta: boolean
  alCerrar: () => void
  paleta: string
  alElegirPaleta: (id: string) => void
  bnForzado: boolean
  alAlternarBn: () => void
  bnAuto: boolean
}

export function PanelPaletas({
  abierta,
  alCerrar,
  paleta,
  alElegirPaleta,
  bnForzado,
  alAlternarBn,
  bnAuto,
}: Props) {
  // Token de administración (solo se usa si el servidor define ADMIN_TOKEN)
  const [token, setToken] = useState(() => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(CLAVE_TOKEN) || '' : ''
    } catch {
      return ''
    }
  })
  const fijarToken = (v: string) => {
    setToken(v)
    try {
      localStorage.setItem(CLAVE_TOKEN, v)
    } catch {}
  }

  return (
    <Hoja
      abierta={abierta}
      alCerrar={alCerrar}
      titulo="Diseño"
      subtitulo="Elige la paleta de colores de la app"
      bn={false}
    >
      <div className="space-y-5">
        <section className="grid grid-cols-2 gap-3">
          {PALETAS.map((p) => {
            const activa = paleta === p.id
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => alElegirPaleta(p.id)}
                aria-pressed={activa}
                className={`relative flex items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                  activa
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-background hover:bg-accent'
                }`}
              >
                <span className="flex shrink-0 -space-x-1.5">
                  {p.muestra.map((c) => (
                    <span
                      key={c}
                      className="h-7 w-7 rounded-full border-2 border-card"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 text-sm font-bold">
                    {p.oscuro ? (
                      <Moon className="h-3 w-3 opacity-60" />
                    ) : (
                      <Sun className="h-3 w-3 opacity-60" />
                    )}
                    {p.nombre}
                  </span>
                  <span className="text-[11px] opacity-70">
                    {p.oscuro ? 'Oscuro' : 'Claro'}
                  </span>
                </span>
                {activa ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                ) : null}
              </button>
            )
          })}
        </section>

        <section>
          <button
            type="button"
            onClick={alAlternarBn}
            aria-pressed={bnForzado}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-accent"
          >
            <span className="text-sm">
              <span className="block font-bold">Blanco y negro siempre</span>
              <span className="block text-xs opacity-75">
                {bnAuto
                  ? 'Activado automáticamente: todo el catálogo disponible está reservado'
                  : 'Pon toda la app en blanco y negro'}
              </span>
            </span>
            <span
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                bnForzado ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  bnForzado ? 'left-[1.4rem]' : 'left-0.5'
                }`}
              />
            </span>
          </button>
        </section>

        <section>
          <div className="mb-1.5 flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <p className="text-sm font-bold">Administración</p>
          </div>
          <input
            value={token}
            onChange={(e) => fijarToken(e.target.value)}
            placeholder="Token de administración (opcional)"
            autoComplete="off"
            className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Solo hace falta si quien despliega la app activó ADMIN_TOKEN en el
            servidor. El token se guarda solo en este navegador.
          </p>
        </section>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          Cuando todos los productos que no están agotados queden reservados, la app se
          pone en blanco y negro automáticamente para avisarte.
        </p>
      </div>
    </Hoja>
  )
}
