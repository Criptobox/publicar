import path from 'path'
import { PrismaClient } from '@prisma/client'

// Fallback: si no hay DATABASE_URL definida (p. ej. repo clonado sin .env),
// apuntamos a la SQLite que vive dentro del proyecto. Así /api/productos
// nunca revienta con "Unable to open the database file" (error code 14).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'db', 'custom.db')}`
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Sin log de queries: solo avisos y errores (el log de queries llenaba la
    // consola y penalizaba el rendimiento en producción).
    log:
      process.env.NODE_ENV === 'production'
        ? ['warn', 'error']
        : ['warn', 'error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
