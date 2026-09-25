# Publicador AXON

Catálogo personal para publicar productos de [AXONTECH](https://github.com/axontech92/AXONTECH) en **Facebook** y **Revolico**: sincroniza el catálogo desde GitHub, permite editar nombres/precios/descripciones, marcar como **publicado** o **reservado**, y genera el texto listo para copiar (con hashtags).

Hecha con **Next.js 16 + Prisma + SQLite**. Pensada para usarse desde el móvil.

---

## Por qué podría "no cargar los productos" (y cómo se arregla)

La base de datos es SQLite (`db/custom.db`) y Prisma la localiza con la variable `DATABASE_URL`. Si falta o apunta a una ruta equivocada, `/api/productos` responde 500 y la app muestra el estado de error con el botón **Reintentar**.

Solución en 10 segundos:

```bash
cp .env.example .env
# Edita .env y pon la ruta ABSOLUTA al db/custom.db de este proyecto:
#   DATABASE_URL="file:/ruta/completa/a/este/proyecto/db/custom.db"
npm run dev
```

> Desde esta versión, si `DATABASE_URL` no está definida la app intenta sola con `db/custom.db` del proyecto (`src/lib/db.ts`), así que en la mayoría de los casos ya funciona sin `.env`.

Verifica el estado del backend en **`/api`** (health check): responde `{"ok":true,"db":"conectada","productos":N}` si todo está bien.

---

## Instalación

```bash
# 1. Dependencias (genera también el cliente de Prisma)
bun install        # o npm install

# 2. Variables de entorno (recomendado)
cp .env.example .env
#   DATABASE_URL="file:<ruta absoluta>/db/custom.db"
#   ADMIN_TOKEN="tu-secreto"   ← opcional, ver "Protección por token"

# 3. Desarrollo
npm run dev        # http://localhost:3000

# 4. Producción
npm run build
npm start
```

Si empiezas con una base vacía, importa el catálogo:

```bash
npm run seed       # usa datos/data-repo.json local o data.json del repo remoto
```

O simplemente pulsa **Sincronizar** en la app: descarga `data.json` desde el repo AXONTECH, crea productos nuevos, detecta agotados/stock/precios y baja las fotos.

---

## Qué incluye

### Sincronización con GitHub
- Fuente: `data.json` del repo AXONTECH (el archivo que su app sube tras cada venta).
- Detecta productos nuevos, agotados, stock que vuelve y cambios de precio; genera avisos en la app.
- Los productos que salen del catálogo se marcan agotados (no se borran).
- Descarga hasta 30 fotos nuevas por sync a `public/photos/`.
- **Transacción atómica**: o se aplica todo el sync o nada (antes podía quedar a medias).
- **Respaldo automático** de la base en `backups/` antes de cada sync o acción en lote (rota hasta 10 copias).

### Catálogo
- Filtros por estado (Disponibles, Sin publicar, Reservados, Publicados, Agotados, Todos) y por categoría.
- Búsqueda con **debounce** (nombre, descripción, notas y hashtags).
- **Orden alternativo**: nombre, precio (asc/desc) y stock.
- **Selección múltiple**: marca varios como publicados/reservados de una sola vez (barra de acciones en lote).
- Edición por producto: nombre, precio, descripción, foto (URL o galería del repo), hashtags automáticos y nota interna.
- Generador de texto para **Facebook** (con emojis) y **Revolico** (sin emojis), con opciones y nota de contacto recordada.
- Modo blanco y negro automático cuando todo lo disponible está reservado.

### Robustez
- **Estado de error real**: si el backend falla, la app muestra qué pasó y un botón **Reintentar** (antes se veía el catálogo vacío sin explicación).
- Todas las APIs responden errores en JSON y quedan registradas en la consola del servidor.
- `db.ts` resuelve `DATABASE_URL` por defecto y no inunda la consola con queries.
- Health check en `/api` para supervisión.
- **Auto-sync**: al volver a la app y cada 10 min (siempre que pasen 5 min desde la anterior).

### PWA / offline
- `manifest.json` + iconos + service worker (`public/sw.js`).
- El catálogo y las fotos quedan en caché: **se ve sin internet** (luego sincroniza al volver la conexión).
- Instalable como app en el móvil (Añadir a pantalla de inicio).
- El SW solo se registra en producción (`npm start`), no estorba en `npm run dev`.

### Rendimiento
- Imágenes con `next/image` (WebP + srcset según pantalla): menos datos móviles.
- `/api/productos` sin campos que la app no usa.
- Índices en SQLite: `Producto.nombreRepo`, `Producto.categoria`, `Notificacion.createdAt`.
- Sync en una sola transacción (más rápido y seguro).

### Protección por token (opcional)
Por defecto la app queda abierta (uso personal). Si la expones a internet y quieres bloquear las acciones de escritura:

1. Define en `.env`: `ADMIN_TOKEN="mi-secreto-largo"`.
2. En la app: **Diseño → Administración** y pega el mismo token.

A partir de ahí, editar/borrar productos, acciones en lote, sincronizar y marcar avisos exigirán el token (cabecera `x-admin-token`). La lectura sigue pública.

---

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Desarrollo en `:3000` |
| `npm run build` / `npm start` | Build standalone y arranque en producción |
| `npm run seed` | Importa el catálogo (local o desde GitHub) |
| `npm run db:push` | Aplica el schema de Prisma a la SQLite |
| `npm run db:generate` | Regenera el cliente Prisma |
| `npm run db:backup` | Respaldo manual de la BD (`node scripts/backup-db.mjs 30` para conservar 30) |
| `npm run lint` | ESLint |

Respaldo programado (cron del servidor), cada día a las 3:00:

```
0 3 * * * cd /ruta/al/proyecto && node scripts/backup-db.mjs
```

---

## Estructura

```
db/custom.db              ← SQLite: catálogo + tus marcas (publicado/reservado)
prisma/schema.prisma      ← Modelo de datos (Producto, Notificacion, SyncEstado)
src/app/api/              ← API: productos, lote, sync, notificaciones, health
src/app/page.tsx          ← UI principal (filtros, búsqueda, selección múltiple)
src/components/axon/      ← Tarjeta, hojas de editar/publicar, paneles, foto
src/lib/                  ← axon (lógica compartida), db, respaldo, seguridad, cliente
public/photos/            ← Fotos descargadas del repo
public/sw.js, manifest.json, icons/  ← PWA
backups/                  ← Respaldos automáticos (git-ignorados)
scripts/                  ← seed, backup-db, gen-icons
```

## Notas

- `db/custom.db` **viaja con el repo** a propósito: así conservas tus marcas de publicado/reservado entre clonas. Ojo: si sincronizas desde dos máquinas, la última que haga push gana.
- Las fotos que descarga el sync se suman a `public/photos/`; si haces push del repo, viajan con él.
- Para cambiar los iconos de la app, edita `scripts/gen-icons.mjs` y vuélvelo a ejecutar.
