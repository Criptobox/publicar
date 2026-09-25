import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import path from 'path'

/**
 * Respaldo de la base SQLite antes de operaciones de riesgo (sincronizar,
 * acciones en lote). Guarda copias en <proyecto>/backups/ con marca de tiempo
 * y rota para conservar solo las `max` más recientes.
 *
 * Devuelve la ruta del respaldo creado, o null si no se pudo (nunca lanza:
 * un fallo de respaldo no debe bloquear la operación del usuario).
 */
export function respaldarBD(max = 10): string | null {
  try {
    // Localizar el archivo real de la base de datos
    const candidatos: string[] = []
    const url = process.env.DATABASE_URL || ''
    if (url.startsWith('file:')) {
      const ruta = url.slice('file:'.length)
      candidatos.push(ruta)
      if (!path.isAbsolute(ruta)) {
        candidatos.push(path.join(process.cwd(), ruta))
        candidatos.push(path.join(process.cwd(), 'prisma', ruta))
      }
    }
    candidatos.push(path.join(process.cwd(), 'db', 'custom.db'))
    const origen = candidatos.find((c) => existsSync(c) && statSync(c).isFile())
    if (!origen) return null

    const dir = path.join(process.cwd(), 'backups')
    mkdirSync(dir, { recursive: true })

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const destino = path.join(dir, `custom-${ts}.db`)
    copyFileSync(origen, destino)

    // Rotación: conservar solo las `max` copias más recientes
    const copias = readdirSync(dir)
      .filter((f) => f.endsWith('.db'))
      .sort()
      .reverse()
    for (const vieja of copias.slice(max)) {
      try {
        unlinkSync(path.join(dir, vieja))
      } catch {}
    }
    return destino
  } catch {
    return null
  }
}
