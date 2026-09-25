'use client'

import { useEffect, useState } from 'react'
import { Camera, Check, Hand, PackageX, Wand2 } from 'lucide-react'
import {
  generarHashtags,
  nombreVisible,
  type Producto,
} from '@/lib/axon'
import { FotoProducto } from './foto'
import { Hoja } from './hoja'

interface Props {
  producto: Producto | null
  fotosRepo: string[]
  alCerrar: () => void
  alGuardar: (id: string, cambios: Partial<Producto>) => Promise<void>
  bn?: boolean
}

interface Formulario {
  nombreLocal: string
  precioLocal: string
  descripcionLocal: string
  fotoOverride: string
  hashtags: string
  notas: string
  reservado: boolean
  publicado: boolean
  agotadoManual: boolean
}

export function HojaEditar({ producto, fotosRepo, alCerrar, alGuardar, bn }: Props) {
  const [f, setF] = useState<Formulario | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [verGaleria, setVerGaleria] = useState(false)

  useEffect(() => {
    if (producto) {
      setF({
        nombreLocal: producto.nombreLocal,
        precioLocal: producto.precioLocal === null ? '' : String(producto.precioLocal),
        descripcionLocal: producto.descripcionLocal,
        fotoOverride: producto.fotoOverride,
        hashtags: producto.hashtags,
        notas: producto.notas,
        reservado: producto.reservado,
        publicado: producto.publicado,
        agotadoManual: producto.agotadoManual,
      })
      setVerGaleria(false)
    } else {
      setF(null)
    }
  }, [producto])

  if (!producto || !f) return null

  const fijar = <K extends keyof Formulario>(campo: K, valor: Formulario[K]) =>
    setF((prev) => (prev ? { ...prev, [campo]: valor } : prev))

  const guardar = async () => {
    if (!f || guardando) return
    setGuardando(true)
    try {
      const precio =
        f.precioLocal.trim() === '' ? null : parseFloat(f.precioLocal.replace(',', '.'))
      await alGuardar(producto.id, {
        nombreLocal: f.nombreLocal,
        precioLocal: precio !== null && isFinite(precio) ? precio : null,
        descripcionLocal: f.descripcionLocal,
        fotoOverride: f.fotoOverride,
        hashtags: f.hashtags,
        notas: f.notas,
        reservado: f.reservado,
        publicado: f.publicado,
        agotadoManual: f.agotadoManual,
      } as Partial<Producto>)
      alCerrar()
    } finally {
      setGuardando(false)
    }
  }

  const interruptor = (
    etiqueta: string,
    campo: 'reservado' | 'publicado' | 'agotadoManual',
    icono: React.ReactNode,
    activoClase: string,
    ayuda: string
  ) => (
    <button
      type="button"
      onClick={() => fijar(campo, !f[campo])}
      aria-pressed={f[campo]}
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
        f[campo]
          ? activoClase
          : 'border-border bg-background hover:bg-accent'
      }`}
    >
      <span className="flex items-center gap-3">
        {icono}
        <span>
          <span className="block text-sm font-bold">{etiqueta}</span>
          <span className="block text-xs opacity-75">{ayuda}</span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          f[campo] ? 'bg-current/30' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            f[campo] ? 'left-[1.4rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Editar producto"
      subtitulo={nombreVisible(producto)}
      bn={bn}
    >
      <div className="space-y-4">
        {/* Foto */}
        <section>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-bold">
            <Camera className="h-4 w-4" /> Foto
          </label>
          <div className="flex gap-3">
            <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
              <FotoProducto
                ruta={f.fotoOverride || producto.imagen}
                alt="Foto actual"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <input
                value={f.fotoOverride}
                onChange={(e) => fijar('fotoOverride', e.target.value)}
                placeholder="Pega la URL de una foto nueva…"
                className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVerGaleria((v) => !v)}
                  className="h-9 flex-1 rounded-xl bg-secondary px-3 text-xs font-bold text-secondary-foreground transition hover:bg-accent"
                >
                  {verGaleria ? 'Ocultar galería' : 'Elegir de la galería del repo'}
                </button>
                {f.fotoOverride ? (
                  <button
                    type="button"
                    onClick={() => fijar('fotoOverride', '')}
                    className="h-9 rounded-xl bg-destructive/15 px-3 text-xs font-bold text-destructive transition hover:bg-destructive/25"
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {verGaleria ? (
            <div className="scroll-fino mt-3 grid max-h-56 grid-cols-4 gap-2 overflow-y-auto rounded-2xl border border-border p-2 sm:grid-cols-5">
              {fotosRepo.slice(0, 60).map((ruta) => {
                const activa = (f.fotoOverride || producto.imagen) === ruta
                return (
                  <button
                    type="button"
                    key={ruta}
                    onClick={() => fijar('fotoOverride', ruta)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                      activa ? 'border-primary' : 'border-transparent hover:border-muted-foreground/40'
                    }`}
                  >
                    <FotoProducto ruta={ruta} alt={ruta} className="h-full w-full object-cover" />
                    {activa ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Check className="h-5 w-5 text-white" />
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}
        </section>

        {/* Nombre y precio */}
        <section className="grid gap-3 sm:grid-cols-[1fr_120px]">
          <div>
            <label className="mb-1.5 block text-sm font-bold">Nombre</label>
            <input
              value={f.nombreLocal}
              onChange={(e) => fijar('nombreLocal', e.target.value)}
              placeholder={producto.nombreRepo}
              className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Si lo dejas vacío se usa el original: {producto.nombreRepo}
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">Precio USD</label>
            <input
              value={f.precioLocal}
              onChange={(e) => fijar('precioLocal', e.target.value)}
              inputMode="decimal"
              placeholder={String(producto.precioRepo)}
              className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Original: ${producto.precioRepo}
            </p>
          </div>
        </section>

        {/* Descripción */}
        <section>
          <label className="mb-1.5 block text-sm font-bold">Descripción</label>
          <textarea
            value={f.descripcionLocal}
            onChange={(e) => fijar('descripcionLocal', e.target.value)}
            rows={6}
            placeholder={producto.descripcionRepo || 'Escribe una descripción…'}
            className="scroll-fino w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Si la dejas vacía se usa la descripción original del repo.
          </p>
        </section>

        {/* Hashtags */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-bold">Hashtags</label>
            <button
              type="button"
              onClick={() =>
                fijar(
                  'hashtags',
                  generarHashtags(
                    f.nombreLocal || producto.nombreRepo,
                    producto.categoria
                  )
                )
              }
              className="flex h-8 items-center gap-1.5 rounded-full bg-secondary px-3 text-xs font-bold text-secondary-foreground transition hover:bg-accent"
            >
              <Wand2 className="h-3.5 w-3.5" /> Generar
            </button>
          </div>
          <input
            value={f.hashtags}
            onChange={(e) => fijar('hashtags', e.target.value)}
            placeholder="#Ejemplo #Hashtags"
            className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Nota */}
        <section>
          <label className="mb-1.5 block text-sm font-bold">Nota interna</label>
          <input
            value={f.notas}
            onChange={(e) => fijar('notas', e.target.value)}
            placeholder="Ej: cliente Yoandra lo quiere para el viernes"
            className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Estados */}
        <section className="space-y-2">
          {interruptor(
            'Reservado',
            'reservado',
            <Hand className="h-5 w-5" />,
            'border-amber-400 bg-amber-400/15 text-amber-600 dark:text-amber-300',
            'Avisa en la app que alguien lo pidió'
          )}
          {interruptor(
            'Publicado',
            'publicado',
            <Check className="h-5 w-5" />,
            'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
            'Marca que ya lo publicaste'
          )}
          {interruptor(
            'Agotado (a mano)',
            'agotadoManual',
            <PackageX className="h-5 w-5" />,
            'border-red-500 bg-red-500/15 text-red-600 dark:text-red-400',
            'Lo esconde de la lista principal'
          )}
        </section>

        {/* Guardar */}
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </Hoja>
  )
}
