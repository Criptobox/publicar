'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Check,
  Hand,
  Megaphone,
  PackageX,
  Palette,
  RefreshCw,
  Search,
} from 'lucide-react'
import {
  esAgotado,
  nombreVisible,
  descripcionVisible,
  type Notificacion,
  type Producto,
  type Stats,
} from '@/lib/axon'
import { FOTOS_REPO } from '@/lib/fotos-repo'
import { TarjetaProducto } from '@/components/axon/tarjeta-producto'
import { HojaEditar } from '@/components/axon/hoja-editar'
import { HojaPublicar } from '@/components/axon/hoja-publicar'
import { PanelPaletas } from '@/components/axon/panel-paletas'
import { PanelNotificaciones } from '@/components/axon/panel-notificaciones'

type EstadoFiltro = 'activos' | 'pendientes' | 'reservados' | 'publicados' | 'agotados' | 'todos'

const FILTROS: { id: EstadoFiltro; etiqueta: string }[] = [
  { id: 'activos', etiqueta: 'Disponibles' },
  { id: 'pendientes', etiqueta: 'Sin publicar' },
  { id: 'reservados', etiqueta: 'Reservados' },
  { id: 'publicados', etiqueta: 'Publicados' },
  { id: 'agotados', etiqueta: 'Agotados' },
  { id: 'todos', etiqueta: 'Todos' },
]

function cumpleFiltro(
  p: Producto,
  filtro: EstadoFiltro
): boolean {
  const agotado = esAgotado(p)
  switch (filtro) {
    case 'activos':
      return !agotado
    case 'pendientes':
      return !agotado && !p.publicado && !p.reservado
    case 'reservados':
      return !agotado && p.reservado
    case 'publicados':
      return !agotado && p.publicado
    case 'agotados':
      return agotado
    case 'todos':
      return true
  }
}

export default function Pagina() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [ultimaSync, setUltimaSync] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)

  const [q, setQ] = useState('')
  const [categoria, setCategoria] = useState('todas')
  const [filtro, setFiltro] = useState<EstadoFiltro>('activos')

  const [paleta, setPaleta] = useState('grafito')
  const [bnForzado, setBnForzado] = useState(false)

  const [editando, setEditando] = useState<Producto | null>(null)
  const [publicando, setPublicando] = useState<Producto | null>(null)
  const [panel, setPanel] = useState<'paletas' | 'notif' | null>(null)
  const [toast, setToast] = useState('')
  const temporizadorToast = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarToast = useCallback((mensaje: string) => {
    setToast(mensaje)
    if (temporizadorToast.current) clearTimeout(temporizadorToast.current)
    temporizadorToast.current = setTimeout(() => setToast(''), 2600)
  }, [])

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/productos', { cache: 'no-store' })
      const datos = await res.json()
      setProductos(datos.productos ?? [])
      setStats(datos.stats ?? null)
      setNotificaciones(datos.notificaciones ?? [])
      setNoLeidas(datos.noLeidas ?? 0)
      setUltimaSync(datos.ultimaSync ?? null)
    } catch {
      mostrarToast('No se pudo cargar el catálogo')
    } finally {
      setCargando(false)
    }
  }, [mostrarToast])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Paleta guardada
  useEffect(() => {
    try {
      const p = localStorage.getItem('pal')
      if (p) setPaleta(p)
      setBnForzado(localStorage.getItem('bn') === '1')
    } catch {}
  }, [])

  const aplicarPaleta = useCallback((id: string) => {
    setPaleta(id)
    document.documentElement.dataset.pal = id
    try {
      localStorage.setItem('pal', id)
    } catch {}
  }, [])

  const alternarBnForzado = useCallback(() => {
    setBnForzado((v) => {
      const nuevo = !v
      try {
        localStorage.setItem('bn', nuevo ? '1' : '0')
      } catch {}
      return nuevo
    })
  }, [])

  // Actualizar producto en el backend + estado local
  const actualizar = useCallback(
    async (id: string, cambios: Partial<Producto>): Promise<boolean> => {
      try {
        const res = await fetch(`/api/productos/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cambios),
        })
        const datos = await res.json()
        if (datos.ok && datos.producto) {
          setProductos((lista) =>
            lista.map((p) => (p.id === id ? (datos.producto as Producto) : p))
          )
          return true
        }
        mostrarToast(datos.error || 'No se pudo guardar')
        return false
      } catch {
        mostrarToast('Sin conexión con el servidor')
        return false
      }
    },
    [mostrarToast]
  )

  const sincronizar = useCallback(async () => {
    if (sincronizando) return
    setSincronizando(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const d = await res.json()
      if (d.ok) {
        const partes: string[] = []
        if (d.nuevos > 0) partes.push(`${d.nuevos} nuevo(s)`)
        if (d.agotados > 0) partes.push(`${d.agotados} se agotó`)
        if (d.disponibles > 0) partes.push(`${d.disponibles} con stock`)
        if (d.precios > 0) partes.push(`${d.precios} cambio(s) de precio`)
        mostrarToast(
          partes.length > 0
            ? `Sincronizado: ${partes.join(' · ')}`
            : 'Sincronizado: todo sin cambios'
        )
      } else {
        mostrarToast(`Error al sincronizar: ${d.error}`)
      }
      await cargar()
    } catch {
      mostrarToast('No se pudo conectar con GitHub')
    } finally {
      setSincronizando(false)
    }
  }, [sincronizando, mostrarToast, cargar])

  const alternarReservado = useCallback(
    async (p: Producto) => {
      const ok = await actualizar(p.id, { reservado: !p.reservado })
      if (ok)
        mostrarToast(
          p.reservado ? 'Reserva quitada' : 'Marcado como reservado'
        )
    },
    [actualizar, mostrarToast]
  )

  const alternarPublicado = useCallback(
    async (p: Producto) => {
      const ok = await actualizar(p.id, { publicado: !p.publicado })
      if (ok)
        mostrarToast(
          p.publicado ? 'Marcado como no publicado' : 'Marcado como publicado'
        )
    },
    [actualizar, mostrarToast]
  )

  const guardarEdicion = useCallback(
    async (id: string, cambios: Partial<Producto>) => {
      const ok = await actualizar(id, cambios)
      if (ok) mostrarToast('Cambios guardados')
    },
    [actualizar, mostrarToast]
  )

  const desdeHojaPublicar = useCallback(
    async (_texto: string, marcar: boolean) => {
      if (marcar && publicando) {
        const ok = await actualizar(publicando.id, { publicado: true })
        mostrarToast(
          ok ? 'Texto copiado · marcado como publicado' : 'Texto copiado'
        )
      } else {
        mostrarToast('Texto copiado al portapapeles')
      }
    },
    [actualizar, mostrarToast, publicando]
  )

  const marcarNotificacionesLeidas = useCallback(async () => {
    try {
      await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'leer-todas' }),
      })
      setNotificaciones((lista) => lista.map((n) => ({ ...n, leida: true })))
      setNoLeidas(0)
    } catch {
      mostrarToast('No se pudo marcar como leído')
    }
  }, [mostrarToast])

  // Derivados
  const bnAuto = stats?.todoReservado ?? false
  const bn = bnAuto || bnForzado

  const categorias = useMemo(
    () => Array.from(new Set(productos.map((p) => p.categoria).filter(Boolean))).sort(),
    [productos]
  )

  const conteos = useMemo(() => {
    const c = {
      activos: 0,
      pendientes: 0,
      reservados: 0,
      publicados: 0,
      agotados: 0,
      todos: productos.length,
    } as Record<EstadoFiltro, number>
    // Usar exactamente el mismo criterio de los filtros para que el
    // número del chip siempre coincida con lo que se muestra al pulsarlo
    for (const f of FILTROS) {
      c[f.id] = productos.filter((p) => cumpleFiltro(p, f.id)).length
    }
    return c
  }, [productos])

  const lista = useMemo(() => {
    const q2 = q.trim().toLowerCase()
    let l = productos.filter((p) => {
      if (!cumpleFiltro(p, filtro)) return false
      if (categoria !== 'todas' && p.categoria !== categoria) return false
      if (q2) {
        const texto = [
          nombreVisible(p),
          descripcionVisible(p),
          p.categoria,
          p.notas,
        ]
          .join(' ')
          .toLowerCase()
        if (!texto.includes(q2)) return false
      }
      return true
    })
    l = [...l].sort((a, b) => {
      const rango = (p: Producto) => (esAgotado(p) ? 2 : p.reservado ? 1 : 0)
      const dif = rango(a) - rango(b)
      if (dif !== 0) return dif
      return nombreVisible(a).localeCompare(nombreVisible(b), 'es')
    })
    return l
  }, [productos, filtro, categoria, q])

  const cerrarEditar = useCallback(() => setEditando(null), [])
  const cerrarPublicar = useCallback(() => setPublicando(null), [])
  const cerrarPanel = useCallback(() => setPanel(null), [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className={`flex min-h-screen flex-col ${bn ? 'modo-bn' : ''}`}>
        {/* Cabecera */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-2 px-4">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-extrabold leading-tight">
                Publicador AXON
              </h1>
              <p className="truncate text-[11px] text-muted-foreground">
                Catálogo para Facebook y Revolico
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={sincronizar}
                disabled={sincronizando}
                aria-label="Sincronizar con GitHub"
                title="Sincronizar con el repo de AXONTECH"
                className="flex h-10 items-center gap-2 rounded-full bg-primary px-3.5 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} />
                <span className="hidden xs:inline sm:inline">Sincronizar</span>
              </button>
              <button
                onClick={() => setPanel('notif')}
                aria-label={`Avisos, ${noLeidas} sin leer`}
                title="Avisos"
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-accent"
              >
                <Bell className="h-4.5 w-4.5" />
                {noLeidas > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                ) : null}
              </button>
              <button
                onClick={() => setPanel('paletas')}
                aria-label="Cambiar diseño"
                title="Paletas de colores"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-accent"
              >
                <Palette className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Avisos globales */}
        {bnAuto && stats && !stats.todoAgotado ? (
          <div className="border-b border-border bg-amber-400/15 px-4 py-2.5">
            <p className="mx-auto flex max-w-3xl items-center gap-2 text-[13px] font-semibold text-amber-600 dark:text-amber-300">
              <Hand className="h-4 w-4 shrink-0" />
              Todos los productos disponibles están reservados — modo blanco y negro
              activado
            </p>
          </div>
        ) : null}
        {stats?.todoAgotado ? (
          <div className="border-b border-border bg-red-500/10 px-4 py-2.5">
            <p className="mx-auto flex max-w-3xl items-center gap-2 text-[13px] font-semibold text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Todo el catálogo está agotado. Sincroniza para ver si llega stock nuevo.
            </p>
          </div>
        ) : null}

        {/* Contenido */}
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
          {/* Buscador */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto…"
              aria-label="Buscar producto"
              className="h-12 w-full rounded-2xl border border-input bg-card pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Filtros de estado */}
          <div className="sin-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
            {FILTROS.map((f) => {
              const activo = filtro === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setFiltro(f.id)}
                  aria-pressed={activo}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition ${
                    activo
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-accent'
                  }`}
                >
                  {f.etiqueta}
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      activo ? 'bg-black/15' : 'bg-muted-foreground/15'
                    }`}
                  >
                    {conteos[f.id]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Categorías */}
          <div className="sin-scrollbar -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
            {['todas', ...categorias].map((c) => {
              const activo = categoria === c
              return (
                <button
                  key={c}
                  onClick={() => setCategoria(c)}
                  aria-pressed={activo}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    activo
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {c === 'todas' ? 'Todas las categorías' : c}
                </button>
              )
            })}
          </div>

          {/* Lista de productos */}
          {cargando ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-3xl border border-border bg-card"
                >
                  <div className="aspect-[4/3] bg-muted" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-20 rounded-full bg-muted" />
                    <div className="h-4 w-3/4 rounded-full bg-muted" />
                    <div className="h-10 w-full rounded-2xl bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border py-16 text-center text-muted-foreground">
              {filtro === 'agotados' ? (
                <PackageX className="h-10 w-10 opacity-40" />
              ) : filtro === 'reservados' ? (
                <Hand className="h-10 w-10 opacity-40" />
              ) : (
                <Megaphone className="h-10 w-10 opacity-40" />
              )}
              <p className="max-w-[260px] text-sm">
                {q
                  ? 'Ningún producto coincide con la búsqueda.'
                  : filtro === 'pendientes'
                    ? '¡Todo publicado! No quedan productos pendientes.'
                    : 'No hay productos en esta sección ahora mismo.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {lista.map((p) => (
                <TarjetaProducto
                  key={p.id}
                  producto={p}
                  alEditar={() => setEditando(p)}
                  alPublicar={() => setPublicando(p)}
                  alAlternarReservado={() => alternarReservado(p)}
                  alAlternarPublicado={() => alternarPublicado(p)}
                />
              ))}
            </div>
          )}
        </main>

        {/* Pie */}
        <footer className="mt-auto border-t border-border px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-3xl space-y-1 text-center">
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Productos copiados de{' '}
              <span className="font-semibold">github.com/axontech92/AXONTECH</span>
              {ultimaSync
                ? ` · Última sincronización: ${new Date(ultimaSync).toLocaleString('es-CU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : ''}
            </p>
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3" /> Los agotados se esconden solos y te avisamos
              cuando alguno se agota
            </p>
          </div>
        </footer>
      </div>

      {/* Hojas y paneles (fuera del filtro B/N para poder controlar el diseño) */}
      <HojaEditar
        producto={editando}
        fotosRepo={FOTOS_REPO}
        alCerrar={cerrarEditar}
        alGuardar={guardarEdicion}
        bn={bn}
      />
      <HojaPublicar
        producto={publicando}
        alCerrar={cerrarPublicar}
        alCopiar={desdeHojaPublicar}
        bn={bn}
      />
      <PanelPaletas
        abierta={panel === 'paletas'}
        alCerrar={cerrarPanel}
        paleta={paleta}
        alElegirPaleta={aplicarPaleta}
        bnForzado={bnForzado}
        alAlternarBn={alternarBnForzado}
        bnAuto={bnAuto}
      />
      <PanelNotificaciones
        abierta={panel === 'notif'}
        alCerrar={cerrarPanel}
        notificaciones={notificaciones}
        alMarcarTodas={marcarNotificacionesLeidas}
        bn={bn}
      />

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background shadow-xl animar-aparecer"
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}
