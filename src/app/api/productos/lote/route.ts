import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autorizado, respuestaNoAutorizado } from '@/lib/seguridad'
import { respaldarBD } from '@/lib/respaldo'

export const dynamic = 'force-dynamic'

/**
 * Acciones en lote sobre varios productos a la vez.
 *
 * Cuerpo esperado:
 * {
 *   ids: string[],                                  // máx. 500
 *   cambios: { publicado?, reservado?, agotadoManual? }  // booleanos
 * }
 *
 * Responde: { ok, actualizados }
 */
export async function PATCH(req: NextRequest) {
  if (!autorizado(req)) return respuestaNoAutorizado()

  try {
    const body = await req.json().catch(() => null)
    if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Falta la lista de ids' },
        { status: 400 }
      )
    }
    if (body.ids.length > 500) {
      return NextResponse.json(
        { ok: false, error: 'Demasiados productos a la vez (máx. 500)' },
        { status: 400 }
      )
    }
    const ids = body.ids.filter((x: unknown): x is string => typeof x === 'string')
    if (ids.length === 0) {
      return NextResponse.json({ ok: false, error: 'Lista de ids inválida' }, { status: 400 })
    }

    const cambios = body.cambios || {}
    const datos: { publicado?: boolean; reservado?: boolean; agotadoManual?: boolean } = {}
    for (const campo of ['publicado', 'reservado', 'agotadoManual'] as const) {
      if (typeof cambios[campo] === 'boolean') datos[campo] = cambios[campo]
    }
    if (Object.keys(datos).length === 0) {
      return NextResponse.json(
        { ok: false, error: 'Ningún cambio válido (publicado, reservado o agotadoManual)' },
        { status: 400 }
      )
    }

    // Respaldo antes de tocar muchos productos a la vez
    respaldarBD()

    let actualizados = 0

    if (datos.publicado === true) {
      // Solo estampar la fecha en los que aún no estaban publicados
      const { publicado: _p, ...resto } = datos
      const r1 = await db.producto.updateMany({
        where: { id: { in: ids }, publicado: false },
        data: { publicado: true, publicadoAt: new Date() },
      })
      actualizados += r1.count
      if (Object.keys(resto).length > 0) {
        const r2 = await db.producto.updateMany({ where: { id: { in: ids } }, data: resto })
        actualizados += r2.count
      }
    } else if (datos.publicado === false) {
      const { publicado: _p, ...resto } = datos
      const r = await db.producto.updateMany({
        where: { id: { in: ids } },
        data: { publicado: false, publicadoAt: null, ...resto },
      })
      actualizados += r.count
    } else {
      const r = await db.producto.updateMany({ where: { id: { in: ids } }, data: datos })
      actualizados += r.count
    }

    return NextResponse.json({ ok: true, actualizados })
  } catch (e) {
    console.error('PATCH /api/productos/lote falló:', e)
    return NextResponse.json(
      { ok: false, error: 'No se pudo aplicar la acción en lote' },
      { status: 500 }
    )
  }
}
