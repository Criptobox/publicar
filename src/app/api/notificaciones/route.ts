import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autorizado, respuestaNoAutorizado } from '@/lib/seguridad'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [notificaciones, noLeidas] = await Promise.all([
      db.notificacion.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }),
      db.notificacion.count({ where: { leida: false } }),
    ])
    return NextResponse.json({ ok: true, notificaciones, noLeidas })
  } catch (e) {
    console.error('GET /api/notificaciones falló:', e)
    return NextResponse.json(
      { ok: false, error: 'No se pudieron leer los avisos' },
      { status: 500 }
    )
  }
}

// Marcar como leídas: { accion: 'leer-todas' } o { accion: 'leer', id: '...' }
export async function PATCH(req: NextRequest) {
  if (!autorizado(req)) return respuestaNoAutorizado()

  try {
    const body = await req.json().catch(() => ({}))
    if (body.accion === 'leer-todas') {
      await db.notificacion.updateMany({ where: { leida: false }, data: { leida: true } })
    } else if (body.accion === 'leer' && typeof body.id === 'string') {
      await db.notificacion.update({ where: { id: body.id }, data: { leida: true } })
    }
    const noLeidas = await db.notificacion.count({ where: { leida: false } })
    return NextResponse.json({ ok: true, noLeidas })
  } catch (e) {
    console.error('PATCH /api/notificaciones falló:', e)
    return NextResponse.json(
      { ok: false, error: 'No se pudo actualizar el aviso' },
      { status: 500 }
    )
  }
}
