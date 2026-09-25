/**
 * Utilidades del lado del cliente (navegador).
 */

/** Clave de localStorage donde se guarda el token de administración. */
export const CLAVE_TOKEN = 'axon-admin-token'

/**
 * Cabeceras para las peticiones que modifican datos.
 * Si el usuario configuró un token en Diseño → Administración, se envía.
 */
export function encabezadosAdmin(): Record<string, string> {
  let token = ''
  try {
    token = localStorage.getItem(CLAVE_TOKEN) || ''
  } catch {}
  return token ? { 'x-admin-token': token } : {}
}

/** Mensaje amigable cuando el servidor responde 401. */
export const MENSAJE_401 =
  'Esta app exige un token de administración. Pégalo en Diseño → Administración.'
