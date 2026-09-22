// Librería compartida del Publicador AXON

export const REPO_RAW =
  'https://raw.githubusercontent.com/axontech92/AXONTECH/main/'
export const REPO_URL = 'https://github.com/axontech92/AXONTECH'

// ---- Tipos ----

export interface Producto {
  id: string
  nombreRepo: string
  descripcionRepo: string
  precioRepo: number
  categoria: string
  imagen: string
  stockRepo: number
  nombreLocal: string
  descripcionLocal: string
  precioLocal: number | null
  fotoOverride: string
  hashtags: string
  notas: string
  reservado: boolean
  publicado: boolean
  publicadoEn: string
  publicadoAt: string | null
  agotadoManual: boolean
  createdAt: string
  updatedAt: string
}

export interface Notificacion {
  id: string
  tipo: 'nuevo' | 'agotado' | 'stock' | 'precio' | string
  productoId: string
  titulo: string
  mensaje: string
  leida: boolean
  createdAt: string
}

export interface Stats {
  totales: number
  activos: number
  agotados: number
  reservados: number
  publicados: number
  todoReservado: boolean
  todoAgotado: boolean
}

// ---- Estado del producto ----

export function esAgotado(p: Pick<Producto, 'stockRepo' | 'agotadoManual'>): boolean {
  return p.stockRepo <= 0 || p.agotadoManual
}

export function nombreVisible(p: Pick<Producto, 'nombreLocal' | 'nombreRepo'>): string {
  return p.nombreLocal.trim() || p.nombreRepo
}

export function descripcionVisible(p: Pick<Producto, 'descripcionLocal' | 'descripcionRepo'>): string {
  return p.descripcionLocal.trim() || p.descripcionRepo
}

export function precioVisible(p: Pick<Producto, 'precioLocal' | 'precioRepo'>): number {
  return p.precioLocal ?? p.precioRepo
}

// ---- Fotos ----

export function fotoLocal(ruta: string): string {
  if (/^(https?:|data:)/i.test(ruta)) return ruta
  return '/' + ruta.replace(/^\/+/, '')
}

export function fotoRemota(ruta: string): string {
  if (/^(https?:|data:)/i.test(ruta)) return ruta
  return REPO_RAW + ruta.replace(/^\/+/, '')
}

// ---- Hashtags ----

const STOP = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'con', 'para', 'por',
  'del', 'al', 'en', 'y', 'o', 'a', 'e', 'u', 'the', 'linea', 'etapa', 'digital',
])

function capitalizar(p: string): string {
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : ''
}

export function generarHashtags(nombre: string, categoria: string): string {
  const limpio = (nombre || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  const palabras = limpio
    .split(/\s+/)
    .filter((p) => p.length > 2 && !STOP.has(p) && !/^\d+([.,]\d+)?$/.test(p))
  const tags: string[] = []
  const vistos = new Set<string>()
  const agregar = (t: string) => {
    if (t && !vistos.has(t)) {
      vistos.add(t)
      tags.push(t)
    }
  }
  for (const p of palabras) agregar('#' + capitalizar(p))
  if (categoria) agregar('#' + capitalizar(categoria))
  agregar('#Oferta')
  return tags.slice(0, 10).join(' ')
}

// ---- Texto para publicar ----

export interface OpcionesPublicacion {
  incluirPrecio: boolean
  incluirDisponibilidad: boolean
  incluirHashtags: boolean
  nota: string
}

function lineaDisponibilidad(p: Producto): string {
  if (esAgotado(p)) return 'AGOTADO'
  if (p.reservado) return 'RESERVADO (queda apartado, se puede pedir)'
  if (p.stockRepo > 0 && p.stockRepo <= 5) return `¡Quedan solo ${p.stockRepo}!`
  return 'Disponible'
}

export function textoFacebook(p: Producto, o: OpcionesPublicacion): string {
  const partes: string[] = []
  partes.push(`🔥 ${nombreVisible(p).toUpperCase()}`)
  if (o.incluirPrecio) partes.push(`💵 Precio: ${precioVisible(p)} USD`)
  if (o.incluirDisponibilidad) partes.push(`📦 ${lineaDisponibilidad(p)}`)
  const desc = descripcionVisible(p).trim()
  if (desc) partes.push('', desc)
  if (o.nota.trim()) partes.push('', `📩 ${o.nota.trim()}`)
  if (o.incluirHashtags && p.hashtags.trim()) partes.push('', p.hashtags.trim())
  return partes.join('\n')
}

export function textoRevolico(p: Producto, o: OpcionesPublicacion): string {
  const partes: string[] = []
  partes.push(nombreVisible(p))
  const desc = descripcionVisible(p).trim()
  if (desc) partes.push('', desc)
  if (o.incluirPrecio) partes.push('', `Precio: ${precioVisible(p)} USD`)
  if (o.incluirDisponibilidad) partes.push(lineaDisponibilidad(p))
  if (o.nota.trim()) partes.push('', o.nota.trim())
  if (o.incluirHashtags && p.hashtags.trim()) partes.push('', p.hashtags.trim())
  return partes.join('\n')
}

// ---- Paletas ----

export interface Paleta {
  id: string
  nombre: string
  oscuro: boolean
  muestra: string[]
}

export const PALETAS: Paleta[] = [
  { id: 'grafito', nombre: 'Grafito', oscuro: true, muestra: ['#0b0e13', '#141922', '#34d399'] },
  { id: 'perla', nombre: 'Perla', oscuro: false, muestra: ['#f5f6f8', '#ffffff', '#0f766e'] },
  { id: 'atardecer', nombre: 'Atardecer', oscuro: true, muestra: ['#15100b', '#1e1710', '#fb923c'] },
  { id: 'bosque', nombre: 'Bosque', oscuro: false, muestra: ['#f3f7f3', '#ffffff', '#16a34a'] },
  { id: 'vino', nombre: 'Vino', oscuro: true, muestra: ['#140c10', '#1e141a', '#fb7185'] },
  { id: 'lavanda', nombre: 'Lavanda', oscuro: false, muestra: ['#f7f5fb', '#ffffff', '#7c3aed'] },
]
