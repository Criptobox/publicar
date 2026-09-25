// Respaldo manual o programado de la base de datos SQLite.
// Uso:
//   npm run db:backup          (o: node scripts/backup-db.mjs)
//   node scripts/backup-db.mjs 30   → conservar 30 copias
//
// Ideal para un cron del servidor, por ejemplo cada día a las 3:00:
//   0 3 * * * cd /ruta/al/proyecto && node scripts/backup-db.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
import { dirname, isAbsolute, join } from 'path'
import { fileURLToPath } from 'url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const max = parseInt(process.argv[2], 10) || 10

function resolverBD() {
  const candidatos = []
  const url = process.env.DATABASE_URL || ''
  if (url.startsWith('file:')) {
    const ruta = url.slice('file:'.length)
    candidatos.push(ruta)
    if (!isAbsolute(ruta)) {
      candidatos.push(join(raiz, ruta))
      candidatos.push(join(raiz, 'prisma', ruta))
    }
  }
  candidatos.push(join(raiz, 'db', 'custom.db'))
  return candidatos.find((c) => existsSync(c) && statSync(c).isFile()) || null
}

try {
  const origen = resolverBD()
  if (!origen) {
    console.error('No se encontró la base de datos (¿DATABASE_URL sin definir?)')
    process.exit(1)
  }
  const dir = join(raiz, 'backups')
  mkdirSync(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const destino = join(dir, `custom-${ts}.db`)
  copyFileSync(origen, destino)

  // Rotación: conservar solo las `max` más recientes
  const copias = readdirSync(dir)
    .filter((f) => f.endsWith('.db'))
    .sort()
    .reverse()
  for (const vieja of copias.slice(max)) {
    try {
      unlinkSync(join(dir, vieja))
    } catch {}
  }
  console.log(`Respaldo creado: ${destino} (${copias.length} copias en total)`)
} catch (e) {
  console.error('El respaldo falló:', e)
  process.exit(1)
}
