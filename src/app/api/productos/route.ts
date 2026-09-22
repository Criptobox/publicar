import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { esAgotado, type Producto, type Stats } from '@/lib/axon'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [productos, notificaciones, sync, noLeidas] = await Promise.all([
    db.producto.findMany({ orderBy: [{ nombreRepo: 'asc' }] }),
    db.notificacion.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }),
    db.syncEstado.findUnique({ where: { id: 'principal' } }),
    db.notificacion.count({ where: { leida: false } }),
  ])

  const activos = productos.filter((p) => !esAgotado(p as Producto))
  const stats: Stats = {
    totales: productos.length,
    activos: activos.length,
    agotados: productos.length - activos.length,
    reservados: activos.filter((p) => p.reservado).length,
    publicados: productos.filter((p) => p.publicado).length,
    todoReservado: activos.length > 0 && activos.every((p) => p.reservado),
    todoAgotado: productos.length > 0 && activos.length === 0,
  }

  return NextResponse.json({
    productos,
    stats,
    notificaciones,
    noLeidas,
    ultimaSync: sync?.ultimaSync ?? null,
    ultimoResultado: sync?.ultimoResultado ?? '',
  })
}
