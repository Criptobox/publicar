'use client'

import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import { fotoLocal, fotoRemota } from '@/lib/axon'

interface Props {
  ruta: string
  alt: string
  className?: string
}

/**
 * Muestra la foto del producto probando primero la copia local
 * (/photos/...) y, si falla, la original en GitHub.
 */
export function FotoProducto({ ruta, alt, className = '' }: Props) {
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

  if (/^(https?:|data:)/i.test(ruta)) {
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
    <img
      src={fuentes[intento]}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setIntento((n) => n + 1)}
    />
  )
}
