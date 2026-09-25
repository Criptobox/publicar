import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, writeFileSync } from 'fs'
import path from 'path'
import { db } from '@/lib/db'
import { REPO_RAW } from '@/lib/axon'
import { generarHashtags } from '@/lib/axon'
import { autorizado, respuestaNoAutorizado } from '@/lib/seguridad'
import { respaldarBD } from '@/lib/respaldo'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * FUENTE DE DATOS: data.json
 * Es el archivo que la app AXONTECH sube a GitHub automáticamente tras cada
 * venta (varias veces al día). El viejo productos.json quedó congelado el
 * 13/8/2026 y le faltan productos, por eso ya no se usa.
 */

interface RepoProducto {
  id: number
  nombre?: string
  name?: string
  descripcion?: string
  description?: string
  precioActual?: number
  precio?: number | string
  stock?: number
  catId?: number
  categoria?: string
  imagen?: string
  photo?: string
}

interface RepoData {
  productos?: RepoProducto[]
  categorias?: { id: number; name: string }[]
  timestamp?: string
}

function parsePrecio(p: unknown): number {
  if (typeof p === 'number') return isFinite(p) ? p : 0
  if (typeof p === 'string') {
    const n = parseFloat(p.replace(/[^0-9.]/g, ''))
    return isFinite(n) ? n : 0
  }
  return 0
}

async function fetchConTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { cache: 'no-store', signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

async function descargarFoto(ruta: string, destino: string, existentes: Set<string>): Promise<boolean> {
  const archivo = ruta.replace(/^photos\//, '').replace(/^\/+/, '')
  if (!archivo || existentes.has(archivo)) return false
  try {
    const res = await fetchConTimeout(REPO_RAW + 'photos/' + archivo, 10000)
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) return false // demasiado pequeño para ser una foto real
    writeFileSync(path.join(destino, archivo), buf)
    existentes.add(archivo)
    return true
  } catch {
    return false
  }
}

// Operación preparada fuera de la transacción para que esta sea corta
type Operacion =
  | { tipo: 'create'; id: string; data: Record<string, unknown> }
  | { tipo: 'update'; id: string; data: Record<string, unknown> }

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return respuestaNoAutorizado()

  try {
    const res = await fetchConTimeout(REPO_RAW + 'data.json', 25000)
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `GitHub respondió con error ${res.status}` },
        { status: 200 }
      )
    }
    const datos: RepoData = await res.json()
    const remotos = Array.isArray(datos.productos) ? datos.productos : []
    if (remotos.length === 0) {
      return NextResponse.json({ ok: false, error: 'data.json no trajo productos' }, { status: 200 })
    }

    // Mapa de categorías que viene dentro del propio data.json
    const mapaCats = new Map<number, string>()
    for (const c of datos.categorias ?? []) {
      if (typeof c?.id === 'number' && c.name) mapaCats.set(c.id, c.name)
    }

    const dirFotos = path.join(process.cwd(), 'public', 'photos')
    let existentesFotos: Set<string>
    try {
      existentesFotos = new Set(readdirSync(dirFotos))
    } catch {
      existentesFotos = new Set()
    }

    const existentes = new Map(
      (await db.producto.findMany()).map((p) => [p.id, p])
    )
    const primeraVez = existentes.size === 0

    // Los productos del repo vienen por id numérico
    const idsRemotos = new Set<string>()
    let nuevos = 0
    let actualizados = 0
    let agotados = 0
    let disponibles = 0
    let precios = 0
    let quitados = 0
    let fotosDescargadas = 0
    const notifs: { tipo: string; productoId: string; titulo: string; mensaje: string }[] = []
    let intentosFoto = 0
    const operaciones: Operacion[] = []

    // FASE 1 (sin transacción): calcular cambios y descargar fotos (I/O lento)
    for (const r of remotos) {
      if (!r || typeof r.id !== 'number') continue
      const id = String(r.id)
      idsRemotos.add(id)
      const nombre = String(r.nombre || r.name || 'Producto').trim()
      const descripcion = String(r.descripcion || r.description || '')
      const precio = r.precioActual !== undefined && r.precioActual !== null
        ? parsePrecio(r.precioActual)
        : parsePrecio(r.precio)
      const categoria = r.categoria || mapaCats.get(r.catId ?? -1) || ''
      const stock = typeof r.stock === 'number' ? r.stock : 0
      const imagen = String(r.imagen || r.photo || '').trim()

      // Intentar descargar fotos nuevas (máx. 30 por sync para no demorar)
      if (imagen && fotosDescargadas + intentosFoto < 30 && !imagen.startsWith('data:')) {
        intentosFoto++
        if (await descargarFoto(imagen, dirFotos, existentesFotos)) fotosDescargadas++
      }

      const ex = existentes.get(id)
      if (!ex) {
        operaciones.push({
          tipo: 'create',
          id,
          data: {
            id,
            nombreRepo: nombre,
            descripcionRepo: descripcion,
            precioRepo: precio,
            categoria,
            stockRepo: stock,
            imagen,
            hashtags: generarHashtags(nombre, categoria),
          },
        })
        nuevos++
        if (!primeraVez) {
          notifs.push({
            tipo: 'nuevo',
            productoId: id,
            titulo: 'Producto nuevo en el catálogo',
            mensaje: nombre,
          })
        }
      } else {
        if (ex.stockRepo > 0 && stock <= 0) {
          agotados++
          notifs.push({
            tipo: 'agotado',
            productoId: id,
            titulo: 'Se agotó un producto',
            mensaje: nombre,
          })
        }
        if (ex.stockRepo <= 0 && stock > 0) {
          disponibles++
          notifs.push({
            tipo: 'stock',
            productoId: id,
            titulo: 'Hay stock de nuevo',
            mensaje: nombre,
          })
        }
        if (precio !== ex.precioRepo && ex.stockRepo > 0 && stock > 0) {
          precios++
          notifs.push({
            tipo: 'precio',
            productoId: id,
            titulo: `Cambió el precio: ${precio} USD (antes ${ex.precioRepo} USD)`,
            mensaje: nombre,
          })
        }
        const data: Record<string, unknown> = {
          nombreRepo: nombre,
          descripcionRepo: descripcion,
          precioRepo: precio,
          categoria,
          stockRepo: stock,
          // Si lo habían marcado agotado a mano y ahora hay stock, se libera
          ...(stock > 0 && ex.agotadoManual && ex.stockRepo <= 0 ? { agotadoManual: false } : {}),
          ...(imagen && !ex.fotoOverride ? { imagen } : {}),
        }
        operaciones.push({ tipo: 'update', id, data })
        actualizados++
      }
    }

    // Productos que desaparecieron del catálogo del repo:
    // se marcan agotados para que se oculten (con aviso). Con protección:
    // si data.json viniera con menos de la mitad de lo que ya teníamos,
    // no quitamos nada (podría ser una subida a medias).
    if (!primeraVez && remotos.length >= existentes.size * 0.5) {
      for (const [id, ex] of existentes) {
        if (idsRemotos.has(id)) continue
        // Solo avisar la primera vez que sale del catálogo:
        // si ya estaba marcado agotado a mano y sin stock, ya se gestionó
        if (ex.agotadoManual && ex.stockRepo <= 0) continue
        quitados++
        operaciones.push({ tipo: 'update', id, data: { stockRepo: 0, agotadoManual: true } })
        notifs.push({
          tipo: 'quitar',
          productoId: id,
          titulo: 'Salió del catálogo de AXONTECH',
          mensaje: ex.nombreRepo,
        })
      }
    }

    // FASE 2: respaldo de la base antes de tocar nada + transacción atómica.
    // Antes cada producto se guardaba uno a uno: un fallo a mitad dejaba el
    // catálogo a medias. Ahora todo sale bien o todo se revierte.
    respaldarBD()
    await db.$transaction(
      async (tx) => {
        for (const op of operaciones) {
          if (op.tipo === 'create') {
            await tx.producto.create({ data: op.data as never })
          } else {
            await tx.producto.update({ where: { id: op.id }, data: op.data })
          }
        }
        if (notifs.length > 0) {
          await tx.notificacion.createMany({ data: notifs })
        }
      },
      { timeout: 25000, maxWait: 8000 }
    )

    const ahora = new Date()
    const resumen =
      `Sync ${ahora.toLocaleString('es-CU')}: ${nuevos} nuevos, ` +
      `${agotados} agotados, ${disponibles} con stock, ${precios} cambios de precio` +
      (quitados > 0 ? `, ${quitados} salieron del catálogo` : '')
    await db.syncEstado.upsert({
      where: { id: 'principal' },
      update: { ultimaSync: ahora, ultimoResultado: resumen },
      create: { id: 'principal', ultimaSync: ahora, ultimoResultado: resumen },
    })

    return NextResponse.json({
      ok: true,
      fuente: 'data.json',
      nuevos,
      actualizados,
      agotados,
      disponibles,
      precios,
      quitados,
      fotosDescargadas,
      total: remotos.length,
      avisos: notifs.length,
    })
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'Tiempo de espera agotado al conectar con GitHub' : e.message) : 'Error desconocido'
    console.error('POST /api/sync falló:', e)
    return NextResponse.json({ ok: false, error: msg }, { status: 200 })
  }
}
