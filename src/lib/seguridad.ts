import { NextResponse } from 'next/server'

/**
 * Protección opcional para las rutas que modifican datos
 * (PATCH/DELETE de productos, acciones en lote, sync, notificaciones).
 *
 * Cómo funciona:
 * - Si NO defines ADMIN_TOKEN en el .env, todo queda abierto (uso personal
 *   en tu máquina o en una red privada). Es el comportamiento por defecto.
 * - Si defines ADMIN_TOKEN=tu-secreto, las rutas de escritura exigirán el
 *   token en la cabecera `x-admin-token` (o `Authorization: Bearer ...`).
 *   En la app, pégalo en Diseño → Administración; se guarda en el navegador.
 */
export function autorizado(req: Request): boolean {
  const token = process.env.ADMIN_TOKEN
  if (!token) return true
  const recibido =
    req.headers.get('x-admin-token') ||
    (req.headers.get('authorization') || '').replace(/^Bearer /i, '')
  return recibido.length > 0 && recibido === token
}

export function respuestaNoAutorizado() {
  return NextResponse.json(
    {
      ok: false,
      error:
        'Acceso denegado: esta app exige un token de administración (ADMIN_TOKEN). Pégalo en Diseño → Administración.',
    },
    { status: 401 }
  )
}
