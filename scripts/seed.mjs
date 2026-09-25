// Semilla: importa los productos del repo AXONTECH (desde data.json, que es
// el archivo que la app del dueño sincroniza automáticamente tras cada venta;
// productos.json quedó congelado el 13/8/2026 y está desactualizado)
//
// Busca los datos en este orden:
//   1. datos/data-repo.json dentro del proyecto (copia local)
//   2. data.json del repo AXONTECH en GitHub (remoto)
//
// Uso: npm run seed   (o: node scripts/seed.mjs)
import { PrismaClient } from '@prisma/client'
import { existsSync, mkdirSync, readFileSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

// Fallback de DATABASE_URL para que funcione en cualquier máquina
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `file:${path.join(raiz, 'db', 'custom.db')}`
}

const REPO_RAW = 'https://raw.githubusercontent.com/axontech92/AXONTECH/main/'

const db = new PrismaClient()

const STOP = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'con', 'para', 'por',
  'del', 'al', 'en', 'y', 'o', 'a', 'e', 'u', 'the', 'linea', 'línea', 'etapa',
])

function capitalizar(p) {
  if (!p) return ''
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
}

function generarHashtags(nombre, categoria) {
  const limpio = (nombre || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const palabras = limpio
    .split(/\s+/)
    .filter((p) => p.length > 2 && !STOP.has(p) && !/^\d+([.,]\d+)?$/.test(p))
  const tags = []
  const vistos = new Set()
  for (const p of palabras) {
    const t = '#' + capitalizar(p)
    if (!vistos.has(t)) {
      vistos.add(t)
      tags.push(t)
    }
  }
  if (categoria) {
    const t = '#' + capitalizar(categoria)
    if (!vistos.has(t)) {
      vistos.add(t)
      tags.push(t)
    }
  }
  tags.push('#Oferta')
  return tags.slice(0, 10).join(' ')
}

function parsePrecio(p) {
  if (typeof p === 'number') return isFinite(p) ? p : 0
  if (typeof p === 'string') {
    const n = parseFloat(p.replace(/[^0-9.]/g, ''))
    return isFinite(n) ? n : 0
  }
  return 0
}

async function cargarDatos() {
  const archivoLocal = path.join(raiz, 'datos', 'data-repo.json')
  if (existsSync(archivoLocal)) {
    console.log('Fuente: datos/data-repo.json (local)')
    return JSON.parse(readFileSync(archivoLocal, 'utf8'))
  }
  console.log('Fuente: data.json del repo AXONTECH en GitHub…')
  const res = await fetch(REPO_RAW + 'data.json')
  if (!res.ok) {
    throw new Error(`No se pudo descargar data.json (GitHub respondió ${res.status})`)
  }
  return await res.json()
}

async function main() {
  const datos = await cargarDatos()
  const remotos = Array.isArray(datos.productos) ? datos.productos : []
  const dirFotos = path.join(raiz, 'public', 'photos')
  mkdirSync(dirFotos, { recursive: true })
  const fotos = readdirSync(dirFotos)

  const mapaCats = new Map()
  for (const c of datos.categorias ?? []) {
    if (typeof c?.id === 'number' && c.name) mapaCats.set(c.id, c.name)
  }

  const idsRemotos = new Set()
  let conFoto = 0
  for (const r of remotos) {
    if (!r || typeof r.id !== 'number') continue
    const id = String(r.id)
    idsRemotos.add(id)
    const nombre = String(r.nombre || r.name || 'Producto').trim()
    const descripcion = String(r.descripcion || r.description || '')
    const precio = r.precioActual !== undefined && r.precioActual !== null
      ? parsePrecio(r.precioActual)
      : parsePrecio(r.precio)
    const categoria = r.categoria || mapaCats.get(r.catId ?? -1) || ''
    const stock = typeof r.stock === 'number' ? r.stock : 0
    let imagen = String(r.imagen || r.photo || '').trim()

    // Productos sin imagen: buscar foto con patrón p-<id>-*
    if (!imagen) {
      const encontrada = fotos.find((f) => f.startsWith(`p-${id}-`))
      if (encontrada) imagen = 'photos/' + encontrada
    }
    if (imagen) conFoto++

    await db.producto.upsert({
      where: { id },
      update: {
        nombreRepo: nombre,
        descripcionRepo: descripcion,
        precioRepo: precio,
        categoria,
        stockRepo: stock,
        ...(imagen ? { imagen } : {}),
      },
      create: {
        id,
        nombreRepo: nombre,
        descripcionRepo: descripcion,
        precioRepo: precio,
        categoria,
        stockRepo: stock,
        imagen,
        hashtags: generarHashtags(nombre, categoria),
      },
    })
  }

  // Productos que ya no están en data.json: quedan como agotados (ocultos)
  const actuales = await db.producto.findMany()
  let quitados = 0
  for (const p of actuales) {
    if (!idsRemotos.has(p.id)) {
      await db.producto.update({
        where: { id: p.id },
        data: { stockRepo: 0, agotadoManual: true },
      })
      quitados++
    }
  }

  await db.syncEstado.upsert({
    where: { id: 'principal' },
    update: { ultimoResultado: `Importación desde data.json (${remotos.length} productos)` },
    create: {
      id: 'principal',
      ultimoResultado: `Importación desde data.json (${remotos.length} productos)`,
    },
  })

  console.log(`Semilla lista: ${remotos.length} productos de data.json, ${conFoto} con foto, ${quitados} fuera de catálogo marcados agotados`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
