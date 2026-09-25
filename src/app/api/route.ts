import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Chequeo de salud: útil para saber si la app y su base de datos están vivas.
export async function GET() {
  try {
    const total = await db.producto.count()
    return NextResponse.json({ ok: true, db: 'conectada', productos: total })
  } catch (e) {
    console.error('GET /api (health) falló:', e)
    return NextResponse.json(
      {
        ok: false,
        db: 'sin conexión',
        detalle: e instanceof Error ? e.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
}
