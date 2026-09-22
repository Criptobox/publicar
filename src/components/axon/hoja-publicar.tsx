'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Copy, Facebook, Globe, Hand } from 'lucide-react'
import {
  esAgotado,
  textoFacebook,
  textoRevolico,
  type OpcionesPublicacion,
  type Producto,
} from '@/lib/axon'
import { Hoja } from './hoja'

interface Props {
  producto: Producto | null
  alCerrar: () => void
  alCopiar: (texto: string, marcarPublicado: boolean) => Promise<void>
  bn?: boolean
}

export function HojaPublicar({ producto, alCerrar, alCopiar, bn }: Props) {
  const [opciones, setOpciones] = useState<OpcionesPublicacion>({
    incluirPrecio: true,
    incluirDisponibilidad: true,
    incluirHashtags: true,
    nota: '',
  })
  const [marcarPublicado, setMarcarPublicado] = useState(true)
  const [texto, setTexto] = useState('')
  const [copiando, setCopiando] = useState(false)
  const [notaGuardada, setNotaGuardada] = useState(false)

  // Nota recordada entre productos (por ejemplo el teléfono de contacto)
  const [notaMemoria, setNotaMemoria] = useState('')

  useEffect(() => {
    try {
      setNotaMemoria(localStorage.getItem('nota-publicar') || '')
    } catch {}
  }, [])

  useEffect(() => {
    if (producto) {
      setOpciones((o) => ({ ...o, nota: notaMemoria }))
      setMarcarPublicado(true)
    }
  }, [producto?.id])

  useEffect(() => {
    if (!producto) return
    setTexto(textoFacebook(producto, opciones))
  }, [producto, opciones])

  if (!producto) return null

  const agotado = esAgotado(producto)

  const fijarOpcion = (campo: keyof OpcionesPublicacion, valor: boolean | string) =>
    setOpciones((o) => ({ ...o, [campo]: valor }))

  const copiar = async (plataforma: 'facebook' | 'revolico') => {
    if (copiando) return
    setCopiando(true)
    try {
      const t =
        plataforma === 'facebook'
          ? textoFacebook(producto, opciones)
          : textoRevolico(producto, opciones)
      setTexto(t)
      await navigator.clipboard.writeText(t)
      if (opciones.nota !== notaMemoria) {
        setNotaMemoria(opciones.nota)
        try {
          localStorage.setItem('nota-publicar', opciones.nota)
          setNotaGuardada(true)
        } catch {}
      }
      if (marcarPublicado && !producto.publicado) {
        await alCopiar(t, true)
      } else {
        await alCopiar(t, false)
      }
    } finally {
      setCopiando(false)
    }
  }

  const chip = (activo: boolean, texto: string, alPulsar: () => void) => (
    <button
      type="button"
      onClick={alPulsar}
      aria-pressed={activo}
      className={`rounded-full px-3.5 py-2 text-xs font-bold transition ${
        activo
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-accent'
      }`}
    >
      {texto}
    </button>
  )

  return (
    <Hoja
      abierta
      alCerrar={alCerrar}
      titulo="Publicar producto"
      subtitulo={producto.nombreRepo}
      bn={bn}
    >
      <div className="space-y-4">
        {agotado ? (
          <div className="flex items-start gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            Este producto está agotado. Publícalo solo si te llega stock.
          </div>
        ) : producto.reservado ? (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-300">
            <Hand className="mt-0.5 h-4 w-4 shrink-0" />
            Este producto está reservado: el texto dirá «RESERVADO (queda apartado, se puede pedir)».
          </div>
        ) : null}

        {/* Opciones */}
        <section>
          <p className="mb-2 text-sm font-bold">Incluir en el texto</p>
          <div className="flex flex-wrap gap-2">
            {chip(opciones.incluirPrecio, '💵 Precio', () =>
              fijarOpcion('incluirPrecio', !opciones.incluirPrecio)
            )}
            {chip(opciones.incluirDisponibilidad, '📦 Disponibilidad', () =>
              fijarOpcion('incluirDisponibilidad', !opciones.incluirDisponibilidad)
            )}
            {chip(opciones.incluirHashtags, '# Hashtags', () =>
              fijarOpcion('incluirHashtags', !opciones.incluirHashtags)
            )}
          </div>
        </section>

        {/* Nota de contacto */}
        <section>
          <label className="mb-1.5 block text-sm font-bold">
            Nota de contacto (opcional)
          </label>
          <input
            value={opciones.nota}
            onChange={(e) => fijarOpcion('nota', e.target.value)}
            placeholder="Ej: Interesados escribir al 53xxxxxx"
            className="h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          {notaGuardada ? (
            <p className="mt-1 text-[11px] text-muted-foreground">Nota guardada para próximos productos.</p>
          ) : null}
        </section>

        {/* Vista previa editable */}
        <section>
          <label className="mb-1.5 block text-sm font-bold">
            Vista previa (puedes editarla antes de copiar)
          </label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            className="scroll-fino w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-ring"
          />
        </section>

        {/* Marcar publicado */}
        <button
          type="button"
          onClick={() => setMarcarPublicado((v) => !v)}
          aria-pressed={marcarPublicado}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-left transition hover:bg-accent"
        >
          <span className="text-sm">
            <span className="block font-bold">Marcar como publicado al copiar</span>
            <span className="block text-xs opacity-75">
              Así no se te olvida cuáles ya publicaste
            </span>
          </span>
          <span
            className={`relative h-6 w-11 shrink-0 rounded-full transition ${
              marcarPublicado ? 'bg-emerald-500' : 'bg-muted-foreground/30'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                marcarPublicado ? 'left-[1.4rem]' : 'left-0.5'
              }`}
            />
          </span>
        </button>

        {/* Botones de copiar */}
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => copiar('facebook')}
            disabled={copiando}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Facebook className="h-4 w-4" />
            Copiar para Facebook
          </button>
          <button
            onClick={() => copiar('revolico')}
            disabled={copiando}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-background text-sm font-bold text-foreground transition hover:bg-accent disabled:opacity-50"
          >
            <Globe className="h-4 w-4" />
            Copiar para Revolico
          </button>
        </div>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          <Copy className="mr-1 inline h-3 w-3" />
          El texto de Revolico sale sin emojis ni formato para que el sitio lo acepte bien.
        </p>
      </div>
    </Hoja>
  )
}
