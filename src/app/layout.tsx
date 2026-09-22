import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Publicador AXON · Catálogo para Facebook y Revolico',
  description:
    'Copia productos del catálogo AXONTECH, edítalos, márcalos como publicados o reservados y genera el texto con hashtags para Facebook y Revolico.',
  icons: {
    icon: 'https://z-cdn.chatglm.cn/z-ai/static/logo.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0e13',
}

// Aplica la paleta guardada antes del primer render para evitar parpadeo
const scriptPaleta = `
try {
  var p = localStorage.getItem('pal') || 'grafito';
  document.documentElement.dataset.pal = p;
} catch (e) {
  document.documentElement.dataset.pal = 'grafito';
}
`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptPaleta }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
