'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Check,
  Hand,
  ListChecks,
  Megaphone,
  PackageX,
  Palette,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import {
  esAgotado,
  nombreVisible,
  descripcionVisible,
  precioVisible,
  type Notificacion,
  type Producto,
  type Stats,
} from '@/lib/axon'
import { encabezadosAdmin, MENSAJE_401 } from '@/lib/cliente'
import { FOTOS_REPO } from '@/lib/fotos-repo'
import { TarjetaProducto } from '@/components/axon/tarjeta-producto'
import { HojaEditar } from '@/components/axon/hoja-editar'
import { HojaPublicar } from '@/components/axon/hoja-publicar'
import { PanelPaletas } from '@/components/axon/panel-paletas'
import { PanelNotificaciones } from '@/components/axon/panel-notificaciones'

type EstadoFiltro = 'activos' | 'pendientes' | 'reservados' | 'publicados' | 'agotados' | 'todos'
type Orden = 'nombre' | 'precio-asc' | 'precio-desc' | 'stock'

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

function haceRelativo(fechaISO: string, referencia: number): string {
  const ms = referencia - new Date(fechaISO).getTime()
  if (!isFinite(ms) || ms < 0) return 'ahora mismo'
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'hace instantes'
  if (min === 1) return 'hace 1 min'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h === 1) return 'hace 1 hora'
  if (h < 24) return `hace ${h} horas`
  const d = Math.floor(h / 24)
  return d === 1 ? 'hace 1 día' : `hace ${d} días`
}

export default function Pagina() {
  const [productos, setProductos] = useState<Producto[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [noLeidas, setNoLeidas] = useState(0)
  const [ultimaSync, setUltimaSync] = useState<string | null>(null)
  const [cargando, setCargando] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [qBusqueda, setQBusqueda] = useState('') // versión con debounce de q
  const [categoria, setCategoria] = useState('todas')
  const [filtro, setFiltro] = useState<EstadoFiltro>('activos')
  const [orden, setOrden] = useState<Orden>('nombre')

  // Selección múltiple
  const [modoSeleccion, setModoSeleccion] = useState(false)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())

  // Reloj suave para las fechas relativas ("hace 5 min")
  const [ahora, setAhora] = useState(() => Date.now())

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

  // Debounce de la búsqueda: no filtra cada tecla, espera 250 ms
  useEffect(() => {
    const t = setTimeout(() => setQBusqueda(q), 250)
    return () => clearTimeout(t)
  }, [q])

  // Reloj para las fechas relativas
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000)
    return () => clearInterval(t)
  }, [])

  const cargar = useCallback(async () => {
    try {
      const res = await fetch('/api/productos', { cache: 'no-store' })
      if (!res.ok) {
        let mensaje = `El servidor respondió con error ${res.status}`
        try {
          const d = await res.json()
          if (d?.error) mensaje = d.error
        } catch {}
        throw new Error(mensaje)
      }
      const datos = await res.json()
      setProductos(datos.productos ?? [])
      setStats(datos.stats ?? null)
      setNotificaciones(datos.notificaciones ?? [])
      setNoLeidas(datos.noLeidas ?? 0)
      setUltimaSync(datos.ultimaSync ?? null)
      setError(null)
    } catch (e) {
      console.error('Error al cargar el catálogo:', e)
      setError(e instanceof Error ? e.message : 'No se pudo cargar el catálogo')
    } finally {
      setCargando(false)
    }
  }, [])

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
          headers: { 'Content-Type': 'application/json', ...encabezadosAdmin() },
          body: JSON.stringify(cambios),
        })
        if (res.status === 401) {
          mostrarToast(MENSAJE_401)
          return false
        }
        const datos = await res.json()
        if (datos.ok && datos.producto) {
          setProductos((lista) =>
            lista.map((p) => (p.id === id ? (datos.producto as Producto) : p))
          )
          return true
        }
        mostrarToast(datos.error || 'No se pudo guardar')
        return false
      } catch (e) {
        console.error('Error al actualizar producto:', e)
        mostrarToast('Sin conexión con el servidor')
        return false
      }
    },
    [mostrarToast]
  )

  const sincronizandoRef = useRef(false)

  const sincronizar = useCallback(async () => {
    if (sincronizandoRef.current) return
    sincronizandoRef.current = true
    setSincronizando(true)
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: encabezadosAdmin(),
      })
      if (res.status === 401) {
        mostrarToast(MENSAJE_401)
        return
      }
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
    } catch (e) {
      console.error('Error al sincronizar:', e)
      mostrarToast('No se pudo conectar con GitHub')
    } finally {
      sincronizandoRef.current = false
      setSincronizando(false)
    }
  }, [mostrarToast, cargar])

  // Auto-sincronización: al volver a la app y cada 10 minutos (si pasaron 5 min
  // desde la anterior) se refresca el catálogo solo.
  const ultimaAutoSync = useRef(Date.now())
  useEffect(() => {
    const ESPERA_MS = 5 * 60 * 1000
    const intenta = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - ultimaAutoSync.current < ESPERA_MS) return
      ultimaAutoSync.current = Date.now()
      sincronizar()
    }
    const alVisibilidad = () => {
      if (document.visibilityState === 'visible') intenta()
    }
    document.addEventListener('visibilitychange', alVisibilidad)
    const t = setInterval(intenta, 10 * 60 * 1000)
    return () => {
      document.removeEventListener('visibilitychange', alVisibilidad)
      clearInterval(t)
    }
  }, [sincronizar])

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
      const res = await fetch('/api/notificaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...encabezadosAdmin() },
        body: JSON.stringify({ accion: 'leer-todas' }),
      })
      if (res.status === 401) {
        mostrarToast(MENSAJE_401)
        return
      }
      setNotificaciones((lista) => lista.map((n) => ({ ...n, leida: true })))
      setNoLeidas(0)
    } catch {
      mostrarToast('No se pudo marcar como leído')
    }
  }, [mostrarToast])

  // ---- Selección múltiple ----

  const alternarSeleccion = useCallback((id: string) => {
    setSeleccion((prev) => {
      const nuevo = new Set(prev)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }, [])

  const salirSeleccion = useCallback(() => {
    setModoSeleccion(false)
    setSeleccion(new Set())
  }, [])

  const alternarModoSeleccion = useCallback(() => {
    setModoSeleccion((v) => {
      if (v) setSeleccion(new Set())
      return !v
    })
  }, [])

  const aplicarLote = useCallback(
    async (cambios: {
      publicado?: boolean
      reservado?: boolean
      agotadoManual?: boolean
    }) => {
      if (seleccion.size === 0) return
      const ids = [...seleccion]
      try {
        const res = await fetch('/api/productos/lote', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...encabezadosAdmin() },
          body: JSON.stringify({ ids, cambios }),
        })
        if (res.status === 401) {
          mostrarToast(MENSAJE_401)
          return
        }
        const d = await res.json()
        if (!d.ok) {
          mostrarToast(d.error || 'No se pudo aplicar la acción')
          return
        }
        const sello = new Date().toISOString()
        const idsSet = new Set(ids)
        setProductos((lista) =>
          lista.map((p) => {
            if (!idsSet.has(p.id)) return p
            const c: Partial<Producto> = {}
            for (const k of ['publicado', 'reservado', 'agotadoManual'] as const) {
              if (typeof cambios[k] === 'boolean') c[k] = cambios[k] as boolean
            }
            if (cambios.publicado === true && !p.publicado) c.publicadoAt = sello
            if (cambios.publicado === false) c.publicadoAt = null
            return { ...p, ...c }
          })
        )
        mostrarToast(`Listo: ${d.actualizados} producto(s) actualizados`)
        salirSeleccion()
      } catch (e) {
        console.error('Error en acción en lote:', e)
        mostrarToast('Sin conexión con el servidor')
      }
    },
    [seleccion, mostrarToast, salirSeleccion]
  )

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
    const q2 = qBusqueda.trim().toLowerCase()
    let l = productos.filter((p) => {
      if (!cumpleFiltro(p, filtro)) return false
      if (categoria !== 'todas' && p.categoria !== categoria) return false
      if (q2) {
        const texto = [
          nombreVisible(p),
          descripcionVisible(p),
          p.categoria,
          p.notas,
          p.hashtags,
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
      switch (orden) {
        case 'precio-asc':
          return precioVisible(a) - precioVisible(b)
        case 'precio-desc':
          return precioVisible(b) - precioVisible(a)
        case 'stock':
          return b.stockRepo - a.stockRepo
        default:
          return nombreVisible(a).localeCompare(nombreVisible(b), 'es')
      }
    })
    return l
  }, [productos, filtro, categoria, qBusqueda, orden])

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
          <div className="sin-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1">
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

          {/* Ordenar y seleccionar */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <button
              onClick={alternarModoSeleccion}
              aria-pressed={modoSeleccion}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition ${
                modoSeleccion
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              <ListChecks className="h-4 w-4" />
              {modoSeleccion ? `Salir (${seleccion.size})` : 'Seleccionar'}
            </button>
            <select
              value={orden}
              onChange={(e) => setOrden(e.target.value as Orden)}
              aria-label="Ordenar productos"
              className="h-9 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="nombre">Orden: nombre</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
              <option value="stock">Más stock primero</option>
            </select>
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
          ) : error ? (
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-red-500/30 bg-red-500/10 px-6 py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-red-500" />
              <p className="max-w-[340px] text-sm font-semibold text-red-600 dark:text-red-400">
                {error}
              </p>
              <p className="max-w-[340px] text-xs leading-relaxed text-muted-foreground">
                Revisa que el servidor esté corriendo y que DATABASE_URL apunte al
                archivo db/custom.db del proyecto.
              </p>
              <button
                onClick={cargar}
                className="mt-1 flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
              >
                <RefreshCw className="h-4 w-4" /> Reintentar
              </button>
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
                {qBusqueda
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
                  modoSeleccion={modoSeleccion}
                  seleccionado={seleccion.has(p.id)}
                  alAlternarSeleccion={() => alternarSeleccion(p.id)}
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
              {ultimaSync ? (
                <>
                  {' '}
                  ·{' '}
                  <span title={new Date(ultimaSync).toLocaleString('es-CU')}>
                    Última sincronización: {haceRelativo(ultimaSync, ahora)}
                  </span>
                </>
              ) : (
                ''
              )}
            </p>
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <Check className="h-3 w-3" /> Los agotados se esconden solos y te avisamos
              cuando alguno se agota
            </p>
          </div>
        </footer>
      </div>

      {/* Barra de acciones en lote */}
      {modoSeleccion && seleccion.size > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2">
            <span className="mr-auto text-sm font-bold">
              {seleccion.size} seleccionado(s)
            </span>
            <button
              onClick={() => aplicarLote({ publicado: true })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              <Check className="h-4 w-4" /> Publicar
            </button>
            <button
              onClick={() => aplicarLote({ publicado: false })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-xs font-bold text-secondary-foreground transition hover:bg-accent"
            >
              Quitar publicación
            </button>
            <button
              onClick={() => aplicarLote({ reservado: true })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 text-xs font-bold text-black transition hover:opacity-90"
            >
              <Hand className="h-4 w-4" /> Reservar
            </button>
            <button
              onClick={() => aplicarLote({ reservado: false })}
              className="flex h-10 items-center gap-1.5 rounded-full bg-secondary px-3.5 text-xs font-bold text-secondary-foreground transition hover:bg-accent"
            >
              Liberar
            </button>
            <button
              onClick={salirSeleccion}
              aria-label="Salir de la selección"
              title="Salir de la selección"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

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
