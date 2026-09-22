'use client'

import { Check, Hand, Megaphone, Pencil, PackageX } from 'lucide-react'
import {
  esAgotado,
  nombreVisible,
  precioVisible,
  descripcionVisible,
  type Producto,
} from '@/lib/axon'
import { FotoProducto } from './foto'

interface Props {
  producto: Producto
  alEditar: () => void
  alPublicar: () => void
  alAlternarReservado: () => void
  alAlternarPublicado: () => void
}

export function TarjetaProducto({
  producto: p,
  alEditar,
  alPublicar,
  alAlternarReservado,
  alAlternarPublicado,
}: Props) {
  const agotado = esAgotado(p)
  const stockBajo = !agotado && p.stockRepo > 0 && p.stockRepo <= 5

  return (
    <article
      className={`group relative overflow-hidden rounded-3xl border border-border bg-card shadow-sm transition hover:shadow-md ${
        agotado ? 'opacity-70' : ''
      }`}
    >
      {/* Foto */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <FotoProducto
          ruta={p.fotoOverride || p.imagen}
          alt={nombreVisible(p)}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />

        {/* Cinta de agotado */}
        {agotado ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/55">
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-bold uppercase tracking-wider text-white">
              <PackageX className="h-4 w-4" /> Agotado
            </span>
          </div>
        ) : null}

        {/* Insignias de estado */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {p.publicado ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow">
              <Check className="h-3 w-3" /> Publicado
            </span>
          ) : null}
          {p.reservado && !agotado ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-black shadow">
              <Hand className="h-3 w-3" /> Reservado
            </span>
          ) : null}
        </div>

        {/* Precio sobre la foto */}
        {!agotado ? (
          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-3 py-1.5 text-base font-extrabold text-white backdrop-blur">
            ${precioVisible(p)}
            <span className="ml-1 text-[10px] font-medium uppercase opacity-80">USD</span>
          </span>
        ) : null}
      </div>

      {/* Cuerpo */}
      <div className="p-4">
        <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
            {p.categoria || 'General'}
          </span>
          {stockBajo ? (
            <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-amber-500">
              ¡Quedan {p.stockRepo}!
            </span>
          ) : null}
          {agotado && p.agotadoManual && p.stockRepo > 0 ? (
            <span className="text-[10px]">(agotado a mano)</span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-[15px] font-bold leading-snug">{nombreVisible(p)}</h3>
        {descripcionVisible(p) ? (
          <p className="mt-1 line-clamp-2 whitespace-pre-line text-[13px] leading-snug text-muted-foreground">
            {descripcionVisible(p)}
          </p>
        ) : null}
        {p.notas ? (
          <p className="mt-1 truncate text-[12px] italic text-muted-foreground/80">
            Nota: {p.notas}
          </p>
        ) : null}

        {/* Acciones */}
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={alPublicar}
            disabled={agotado}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Megaphone className="h-4 w-4" /> Publicar
          </button>
          <button
            onClick={alEditar}
            aria-label="Editar producto"
            title="Editar"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground transition hover:bg-accent"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={alAlternarReservado}
            disabled={agotado}
            aria-label={p.reservado ? 'Quitar reserva' : 'Marcar como reservado'}
            aria-pressed={p.reservado}
            title={p.reservado ? 'Quitar reserva' : 'Reservar'}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
              p.reservado
                ? 'bg-amber-400 text-black'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            <Hand className="h-4 w-4" />
          </button>
          <button
            onClick={alAlternarPublicado}
            aria-label={p.publicado ? 'Marcar como no publicado' : 'Marcar como publicado'}
            aria-pressed={p.publicado}
            title={p.publicado ? 'Quitar publicado' : 'Marcar publicado'}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${
              p.publicado
                ? 'bg-emerald-500 text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  )
}

