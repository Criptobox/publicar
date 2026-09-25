import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { autorizado, respuestaNoAutorizado } from '@/lib/seguridad'

export const dynamic = 'force-dynamic'

const CAMPOS_BOOLEANOS = ['reservado', 'publicado', 'agotadoManual'] as const
const CAMPOS_TEXTO = [
  'nombreLocal',
  'descripcionLocal',
  'fotoOverride',
  'hashtags',
  'notas',
  'publicadoEn',
] as const

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!autorizado(req)) return respuestaNoAutorizado()

  try {
    const { id } = await params
    const actual = await db.producto.findUnique({ where: { id } })
    if (!actual) {
      return NextResponse.json({ ok: false, error: 'Producto no encontrado' }, { status: 404 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ ok: false, error: 'Cuerpo inválido' }, { status: 400 })
    }

    const datos: Record<string, unknown> = {}
    for (const campo of CAMPOS_BOOLEANOS) {
      if (typeof body[campo] === 'boolean') datos[campo] = body[campo]
    }
    for (const campo of CAMPOS_TEXTO) {
      if (typeof body[campo] === 'string') datos[campo] = body[campo]
    }
    if ('precioLocal' in body) {
      if (body.precioLocal === null || body.precioLocal === '') datos.precioLocal = null
      else if (typeof body.precioLocal === 'number' && isFinite(body.precioLocal)) {
        datos.precioLocal = body.precioLocal
      } else if (typeof body.precioLocal === 'string' && body.precioLocal.trim() !== '') {
        const n = parseFloat(body.precioLocal.replace(',', '.'))
        if (isFinite(n)) datos.precioLocal = n
      }
    }

    // Al marcar como publicado, registrar la fecha
    if (datos.publicado === true && !actual.publicadoAt) datos.publicadoAt = new Date()
    if (datos.publicado === false) datos.publicadoAt = null

    if (Object.keys(datos).length === 0) {
      return NextResponse.json({ ok: false, error: 'Nada que actualizar' }, { status: 400 })
    }

    const producto = await db.producto.update({ where: { id }, data: datos })
    return NextResponse.json({ ok: true, producto })
  } catch (e) {
    console.error('PATCH /api/productos/[id] falló:', e)
    return NextResponse.json(
      { ok: false, error: 'No se pudo guardar el cambio en la base de datos' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!autorizado(req)) return respuestaNoAutorizado()

  try {
    const { id } = await params
    await db.producto.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('DELETE /api/productos/[id] falló:', e)
    return NextResponse.json(
      { ok: false, error: 'No se pudo borrar el producto' },
      { status: 500 }
    )
  }
}
