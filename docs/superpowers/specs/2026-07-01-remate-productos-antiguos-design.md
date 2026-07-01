# Diseño: Remate de productos antiguos (+3 meses en stock)

## Contexto y objetivo

El cliente necesita identificar productos que llevan mucho tiempo en inventario sin
venderse (particularmente +3 meses desde su fecha de ingreso), poder aplicarles un
descuento porcentual para liquidarlos/rematarlos, y ver esto reflejado automáticamente
en el Punto de Venta. También quiere un resumen visible desde la pantalla de Inicio que
lo dirija a esta nueva sección.

## Alcance

- Nueva columna en base de datos para guardar un precio de oferta paralelo al precio normal.
- Nuevos endpoints backend para reportar productos antiguos y aplicar/quitar descuentos (individual o en lote).
- Nueva pestaña "Remate" en el frontend, con fotos, badges de antigüedad, filtro por meses, selección múltiple y paginación.
- Botón de descuento individual también disponible desde Inventario.
- Precio efectivo (oferta si existe, si no normal) usado automáticamente al agregar productos al carrito en POS e Inventario.
- Fotos e items más grandes en Inventario.
- Tarjeta de resumen "Artículos sin movimiento" en Inicio con enlace a Remate.

Fuera de alcance: expiración automática de descuentos, historial de cambios de precio,
notificaciones automáticas, permisos adicionales más allá de admin/cajero ya existentes.

## Modelo de datos

Se agrega una sola columna a `productos`:

```sql
ALTER TABLE productos ADD COLUMN precio_oferta NUMERIC(10,2) NULL;
```

- `NULL` = sin descuento activo, se usa `precio_venta` normalmente.
- Con descuento activo: `precio_oferta` guarda el precio final ya calculado
  (`precio_venta * (1 - porcentaje/100)`, redondeado a 2 decimales).
- El `%` de descuento no se persiste; se puede derivar comparando `precio_venta` vs
  `precio_oferta` para mostrarlo en UI.
- Quitar el descuento = `UPDATE productos SET precio_oferta = NULL`. El precio original
  nunca se pierde porque `precio_venta` no se toca.

Esta migración se aplica manualmente contra la base de datos de Render (no hay carpeta
de migraciones en el proyecto). El usuario decidirá si comparte un `.env` local con
`DATABASE_URL` para que se corra vía script, o la ejecuta él mismo desde el shell de
Render / un cliente Postgres.

## Backend (routes/inventory.js)

### `GET /inventory/reports/stagnant?meses=3`
- Middleware: `authenticateToken` (accesible a admin y cajero, sin `checkAdminRole`).
- Query param `meses` (entero, default `3`) define el mínimo de meses en stock a filtrar.
- Reemplaza el endpoint actual (que solo tenía 3 meses fijos y columnas mínimas).
- Devuelve por producto: `id, nombre, marca, imagen_url, cantidad, precio_venta,
  precio_oferta, fecha_creacion, meses_en_stock` (calculado con
  `EXTRACT(MONTH FROM AGE(NOW(), fecha_creacion)) + EXTRACT(YEAR FROM AGE(NOW(), fecha_creacion))*12`).
- Solo incluye productos con `cantidad > 0` (igual que el reporte actual).

### `POST /inventory/discount`
- Middleware: `authenticateToken`, `checkAdminRole`, `logActivity('Aplicar Descuento', 'productos')`.
- Body: `{ producto_ids: number[], porcentaje: number }`.
- Valida `porcentaje` entre 1 y 99.
- En una transacción, por cada id: `UPDATE productos SET precio_oferta = ROUND(precio_venta * (1 - $porcentaje/100.0), 2) WHERE id = $id`.
- Responde con la lista de productos actualizados (id + nuevo precio_oferta).

### `DELETE /inventory/discount`
- Middleware: `authenticateToken`, `checkAdminRole`, `logActivity('Quitar Descuento', 'productos')`.
- Body: `{ producto_ids: number[] }`.
- `UPDATE productos SET precio_oferta = NULL WHERE id = ANY($producto_ids)`.

### `GET /inventory/inventory` (modificación)
- Se agrega `p.precio_oferta` al `SELECT` existente para que Inventario y POS conozcan
  el precio efectivo de cada producto.

## Frontend

### Nueva ruta y navegación
- Nueva ruta `/remate` registrada en `App.jsx` (mismo patrón que las demás rutas
  protegidas), renderizando un nuevo componente `Remate.jsx`.
- Nuevo ítem en `Sidebar.jsx`: `{ text: 'Remate', icon: <Sell />, path: '/remate' }`,
  agregado al arreglo de menú básico (visible para admin y cajero, no solo dentro del
  bloque `if (user?.rol === 'admin')`).

### `Remate.jsx` (nuevo componente)
Sigue el mismo patrón visual y de datos que `InventoryDashboard.jsx`:

- **Filtros:** chips clicables `+3 meses` / `+6 meses` / `+12 meses` (default `+3`) que
  cambian el query param `meses` de la petición; más un campo numérico para un valor
  personalizado.
- **Tabla** con filas altas (imagen ~80-90px), columnas: checkbox de selección
  (solo visible/habilitado para admin), Foto (click abre el mismo modal de galería con
  zoom y navegación que ya existe en Inventario), Producto, Marca, Precio (tachado +
  precio de oferta si aplica), Badge de antigüedad, Stock.
- **Badge de antigüedad:** texto exacto `"{meses_en_stock} meses en stock"`, color
  según rango: amarillo (`warning`, 3-6 meses), naranja (`#ef6c00` custom, 6-12 meses),
  rojo (`error`, 12+ meses).
- **Paginación:** `TablePagination` con opciones `10/25/50`, igual patrón que Inventario.
- **Acciones de descuento (solo admin):**
  - Barra flotante cuando hay checkboxes seleccionados: input de "% descuento" + botón
    "Aplicar a N productos" (llama `POST /inventory/discount`) + botón "Quitar
    descuento a N productos" (llama `DELETE /inventory/discount`).
  - Acción rápida por fila individual con el mismo par de botones, sin necesidad de
    seleccionar checkboxes.
- Para cajero: mismos datos visibles, pero sin checkboxes ni controles de descuento
  (solo lectura).

### `InventoryDashboard.jsx` (modificaciones)
- Avatar/foto de producto: `50x50` → `70x70`.
- Aumentar padding vertical de celdas de la tabla para filas más altas y legibles.
- Columna de precio: si el producto tiene `precio_oferta`, se muestra el precio normal
  tachado + el precio de oferta en verde/negrita; si no, se muestra igual que ahora.
- Nuevo botón "Descuento" (ícono `Sell`, solo admin) junto a Editar/Eliminar, abre un
  modal pequeño para meter el % y aplicar (reutiliza `POST /inventory/discount` con un
  solo id) o quitar el descuento si ya existe uno.
- Al agregar al carrito (`handleAddToCart`), usar precio efectivo:
  `product.precio_oferta ?? product.precio_venta` en vez de `product.precio_venta`.

### `PointOfSale.jsx` (modificación mínima)
- En `addProductToCart`, al construir el item del carrito, usar precio efectivo
  (`product.precio_oferta ?? product.precio_venta`) como `precio_venta` del item, igual
  que en Inventario. Sin cambios visuales adicionales: el admin sigue pudiendo editar el
  precio manualmente en el carrito como ya lo hace hoy.

### `StatsDashboard.jsx` (Inicio, modificación)
- Debajo de las 3 tarjetas KPI existentes, se agrega una tarjeta/aviso a todo el ancho,
  visible para admin y cajero:
  - Llama `GET /inventory/reports/stagnant?meses=3` solo para obtener el conteo (`length`
    del array devuelto).
  - Muestra: `"N productos llevan más de 3 meses en stock"` con ícono de advertencia.
  - Botón "Ver en Remate →" que navega a `/remate` (`useNavigate`).
  - Si `N === 0`, no se muestra la tarjeta (o se muestra un estado neutro "Todo al día").

## Manejo de errores y casos borde

- Si `porcentaje` no es un número entre 1-99, el backend responde `400`.
- Si `producto_ids` viene vacío, el backend responde `400` ("Selecciona al menos un producto").
- Los endpoints de descuento son atómicos por lote (transacción `BEGIN/COMMIT/ROLLBACK`),
  igual que el resto de endpoints de escritura en `inventory.js`.
- Si `imagen_url` no existe para un producto en Remate, se muestra el mismo fallback
  (inicial del nombre) que ya usa Inventario.
- `meses_en_stock` se calcula en SQL para evitar desajustes de zona horaria entre
  frontend/backend.

## Testing

- Backend: pruebas manuales vía Postman/cURL de los 3 endpoints nuevos (stagnant con
  distintos `meses`, discount con ids válidos/inválidos, delete discount), verificando
  que las transacciones no dejen estados parciales.
- Frontend: verificación manual en navegador (dev server) de: filtro por meses, badges
  de color correctos, selección múltiple + aplicar/quitar descuento en lote, que el
  precio con descuento se refleje en POS al escanear, y que el enlace desde Inicio
  navegue correctamente a `/remate`.
