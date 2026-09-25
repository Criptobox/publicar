import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { esAgotado, type Producto, type Stats } from '@/lib/axon'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [productos, notificaciones, sync, noLeidas] = await Promise.all([
      db.producto.findMany({
        orderBy: [{ nombreRepo: 'asc' }],
        // Sin createdAt/updatedAt: la app no los usa y así la respuesta pesa menos
        // (importante con datos móviles).
        select: {
          id: true,
          nombreRepo: true,
          descripcionRepo: true,
          precioRepo: true,
          categoria: true,
          imagen: true,
          stockRepo: true,
          nombreLocal: true,
          descripcionLocal: true,
          precioLocal: true,
          fotoOverride: true,
          hashtags: true,
          notas: true,
          reservado: true,
          publicado: true,
          publicadoEn: true,
          publicadoAt: true,
          agotadoManual: true,
        },
      }),
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
      ok: true,
      productos,
      stats,
      notificaciones,
      noLeidas,
      ultimaSync: sync?.ultimaSync ?? null,
      ultimoResultado: sync?.ultimoResultado ?? '',
    })
  } catch (e) {
    // Sin try/catch esto salía como HTML 500 y el frontend no sabía qué pasó.
    console.error('GET /api/productos falló:', e)
    const detalle = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json(
      {
        ok: false,
        error: 'No se pudo leer la base de datos. Revisa DATABASE_URL y que exista db/custom.db.',
        detalle,
      },
      { status: 500 }
    )
  }
}
