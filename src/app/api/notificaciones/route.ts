import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [notificaciones, noLeidas] = await Promise.all([
    db.notificacion.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }),
    db.notificacion.count({ where: { leida: false } }),
  ])
  return NextResponse.json({ notificaciones, noLeidas })
}

// Marcar como leídas: { accion: 'leer-todas' } o { accion: 'leer', id: '...' }
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.accion === 'leer-todas') {
    await db.notificacion.updateMany({ where: { leida: false }, data: { leida: true } })
  } else if (body.accion === 'leer' && typeof body.id === 'string') {
    await db.notificacion.update({ where: { id: body.id }, data: { leida: true } })
  }
  const noLeidas = await db.notificacion.count({ where: { leida: false } })
  return NextResponse.json({ ok: true, noLeidas })
}
