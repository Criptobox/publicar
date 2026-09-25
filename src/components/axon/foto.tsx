'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { fotoLocal, fotoRemota } from '@/lib/axon'

interface Props {
  ruta: string
  alt: string
  className?: string
  sizes?: string
}

/**
 * Muestra la foto del producto probando primero la copia local
 * (/photos/...) y, si falla, la original en GitHub.
 *
 * Usa next/image: sirve la foto en el tamaño justo para cada pantalla
 * (srcset) y en WebP, lo que ahorra muchos datos en el móvil. Las URL
 * data: no las optimiza Next, así que van con <img> normal.
 */
export function FotoProducto({ ruta, alt, className = '', sizes }: Props) {
  // Reinicia los intentos cuando cambia la ruta (ajuste durante el render,
  // patrón recomendado por React en lugar de un useEffect)
  const [rutaAnterior, setRutaAnterior] = useState(ruta)
  const [intento, setIntento] = useState(0)
  const [sinFoto, setSinFoto] = useState(!ruta)
  if (ruta !== rutaAnterior) {
    setRutaAnterior(ruta)
    setIntento(0)
    setSinFoto(!ruta)
  }

  if (!ruta || sinFoto) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
        aria-label="Producto sin foto"
      >
        <ImageOff className="h-8 w-8 opacity-50" />
      </div>
    )
  }

  // Imágenes incrustadas (data:) no pasan por el optimizador de Next
  if (/^data:/i.test(ruta)) {
    return (
      <img
        src={ruta}
        alt={alt}
        loading="lazy"
        className={className}
        onError={() => setSinFoto(true)}
      />
    )
  }

  const fuentes = [fotoLocal(ruta), fotoRemota(ruta)]
  if (intento >= fuentes.length) {
    return (
      <div
        className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}
        aria-label="No se pudo cargar la foto"
      >
        <ImageOff className="h-8 w-8 opacity-50" />
      </div>
    )
  }

  return (
    <Image
      src={fuentes[intento]}
      alt={alt}
      fill
      sizes={sizes ?? '(max-width: 639px) 100vw, (max-width: 767px) 50vw, 364px'}
      loading="lazy"
      className={className}
      onError={() => setIntento((n) => n + 1)}
    />
  )
}
