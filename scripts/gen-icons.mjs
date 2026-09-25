// Genera los iconos PWA (public/icons/) a partir de un SVG con la marca "A".
// Uso: node scripts/gen-icons.mjs   (requiere sharp, ya está en dependencies)
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dirSalida = path.join(raiz, 'public', 'icons')
mkdirSync(dirSalida, { recursive: true })

// Icono: fondo grafito redondeado + megáfono estilizado con la "A" de AXON
const svg = (tamano, margen = 0) => {
  const r = margen === 0 ? 0.22 * tamano : 0.3 * tamano
  const interior = tamano - 2 * margen
  return `
<svg width="${tamano}" height="${tamano}" viewBox="0 0 ${tamano} ${tamano}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${tamano}" height="${tamano}" rx="${r}" fill="#0b0e13"/>
  <g transform="translate(${margen} ${margen})">
    <path d="M ${interior * 0.5} ${interior * 0.16}
             L ${interior * 0.82} ${interior * 0.84}
             L ${interior * 0.655} ${interior * 0.84}
             L ${interior * 0.5} ${interior * 0.48}
             L ${interior * 0.345} ${interior * 0.84}
             L ${interior * 0.18} ${interior * 0.84} Z"
          fill="#34d399"/>
    <rect x="${interior * 0.44}" y="${interior * 0.72}" width="${interior * 0.12}" height="${interior * 0.05}" rx="${interior * 0.02}" fill="#34d399"/>
  </g>
</svg>`
}

const base = Buffer.from(svg(512))

// 192 y 512 normales
await sharp(base).resize(192, 192).png().toFile(path.join(dirSalida, 'icon-192.png'))
await sharp(base).resize(512, 512).png().toFile(path.join(dirSalida, 'icon-512.png'))

// Maskable: necesita margen de seguridad (zona segura ~80%)
await sharp(Buffer.from(svg(512, 512 * 0.1)))
  .resize(512, 512)
  .png()
  .toFile(path.join(dirSalida, 'maskable-512.png'))

// Apple touch icon (180)
await sharp(base).resize(180, 180).png().toFile(path.join(dirSalida, 'apple-touch-icon.png'))

console.log('Iconos PWA generados en public/icons/')
