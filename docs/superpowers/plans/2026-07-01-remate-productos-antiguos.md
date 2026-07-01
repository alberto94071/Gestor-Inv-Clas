# Remate de Productos Antiguos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin/cajero identify products in stock more than N months, apply a percentage discount (individually or in bulk) that shows up automatically at the point of sale, and surface a shortcut from the home dashboard.

**Architecture:** One new nullable column (`precio_oferta`) on `productos` holds an optional discounted price in parallel with `precio_venta`. Three backend endpoints (report, apply discount, remove discount) in the existing `routes/inventory.js`. A new `Remate.jsx` frontend page reuses patterns already established in `InventoryDashboard.jsx` (image gallery zoom, pagination, Cloudinary URL optimization, role-based gating via `localStorage.user.rol`). `InventoryDashboard.jsx`, `PointOfSale.jsx`, and `StatsDashboard.jsx` get small, targeted edits.

**Tech Stack:** Express 5 + `pg` (PostgreSQL) on the backend; React 19 + MUI 7 + Axios on the frontend. No test framework exists in this repository (no Jest/Vitest/Mocha, zero test files) — this plan verifies each backend step with `curl` against the local dev server, and each frontend step by running `npm run dev` and checking the browser, matching how the rest of this codebase has been validated.

## Global Constraints

- All UI copy is in Spanish, matching the rest of the app (see `AdminTools.jsx`, `InventoryDashboard.jsx`).
- Currency is always formatted `Q${Number(x).toFixed(2)}` (Guatemalan Quetzal), matching `InventoryDashboard.jsx:301` and `PointOfSale.jsx:14`.
- Role is read from `JSON.parse(localStorage.getItem('user')).rol`, lower-cased for comparisons (see `InventoryDashboard.jsx:68-71`).
- Cloudinary thumbnails must go through the existing `getOptimizedImageUrl` transform pattern (`w_{width},c_limit,f_auto,q_auto`) already used in `InventoryDashboard.jsx:56-61`.
- Every write endpoint in `routes/inventory.js` wraps its DB work in `BEGIN`/`COMMIT`/`ROLLBACK` (see `routes/inventory.js:32-63`).
- Admin-only write endpoints use `authenticateToken, checkAdminRole, logActivity('<Acción>', 'productos')` in that order (see `routes/inventory.js:90`, `201`).
- `.env` is git-ignored already (`.gitignore:5`) — never commit real credentials.
- Backend base URL for local dev is `http://localhost:3000`; frontend calls go through `frontend/src/api/axiosInstance.js`, whose `baseURL` currently points at the deployed Render API — for local testing of new endpoints, `curl` is used directly against `http://localhost:3000/api/...` instead of the deployed frontend.

---

### Task 1: Database migration — add `precio_oferta` column

**Files:**
- Create: `scripts/migrate-add-precio-oferta.js`

**Interfaces:**
- Produces: a `precio_oferta NUMERIC(10,2) NULL` column on `productos`, consumed by every task below.

- [ ] **Step 1: Confirm you have local DB access configured**

Check whether a `.env` file already exists at the project root:

```bash
ls -la .env
```

If it does not exist, create one with either `DATABASE_URL` (pointing at the Render Postgres instance) or the local `DB_USER`/`DB_HOST`/`DB_DATABASE`/`DB_PASSWORD`/`DB_PORT` variables — same variables `db/db.js` already reads (see `db/db.js:9-22`). This file is git-ignored and must never be committed or pasted into chat.

- [ ] **Step 2: Write the migration script**

```js
// scripts/migrate-add-precio-oferta.js
require('dotenv').config();
const db = require('../db/db');

async function run() {
    try {
        await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(10,2) NULL');
        console.log('✅ Columna precio_oferta agregada (o ya existía).');
    } catch (err) {
        console.error('❌ Error al migrar:', err);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
}

run();
```

- [ ] **Step 3: Run the migration**

```bash
node scripts/migrate-add-precio-oferta.js
```

Expected output: `✅ Conexión exitosa a PostgreSQL!` (from `db/db.js:31`) followed by `✅ Columna precio_oferta agregada (o ya existía).`

- [ ] **Step 4: Verify the column exists**

```bash
node -e "require('dotenv').config(); const db = require('./db/db'); db.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='productos' AND column_name='precio_oferta'\").then(r => { console.log(r.rows); process.exit(0); });"
```

Expected output: `[ { column_name: 'precio_oferta' } ]`

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-add-precio-oferta.js
git commit -m "Add precio_oferta column migration script for product discounts"
```

---

### Task 2: Backend — include `precio_oferta` in the inventory list

**Files:**
- Modify: `routes/inventory.js:68-85` (the `GET /inventory` handler)

**Interfaces:**
- Consumes: `precio_oferta` column from Task 1.
- Produces: every product object returned by `GET /api/inventory/inventory` now includes a `precio_oferta` field (`null` or a number), consumed by `InventoryDashboard.jsx` and `PointOfSale.jsx` in later tasks.

- [ ] **Step 1: Update the query**

In `routes/inventory.js`, find:

```js
        const query = `
            SELECT 
                p.id, p.nombre, p.marca, p.descripcion, p.precio_venta, 
                p.talla, p.color, p.codigo_barras, p.imagen_url, p.fecha_creacion,
                COALESCE(i.cantidad, 0) as cantidad
            FROM productos p
            LEFT JOIN inventario i ON p.id = i.producto_id
            ORDER BY p.id DESC; 
        `;
```

Replace with:

```js
        const query = `
            SELECT 
                p.id, p.nombre, p.marca, p.descripcion, p.precio_venta, p.precio_oferta,
                p.talla, p.color, p.codigo_barras, p.imagen_url, p.fecha_creacion,
                COALESCE(i.cantidad, 0) as cantidad
            FROM productos p
            LEFT JOIN inventario i ON p.id = i.producto_id
            ORDER BY p.id DESC; 
        `;
```

- [ ] **Step 2: Start the backend locally**

```bash
npm run dev
```

Expected output includes `✅ Conexión exitosa a PostgreSQL!` and `Servidor Express corriendo en el puerto: 3000`.

- [ ] **Step 3: Verify with curl**

In a separate terminal, log in with an existing user to get a token (replace with real test credentials from your `usuarios` table), then call the endpoint:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"YOUR_TEST_EMAIL","password":"YOUR_TEST_PASSWORD"}' | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).token))")
curl -s http://localhost:3000/api/inventory/inventory -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data', d => console.log(JSON.parse(d)[0]))"
```

Expected output: the first product object now includes a `precio_oferta` key (value `null` for existing products, since none have a discount yet).

- [ ] **Step 4: Commit**

```bash
git add routes/inventory.js
git commit -m "Include precio_oferta in inventory list response"
```

---

### Task 3: Backend — enhanced stagnant-products report endpoint

**Files:**
- Modify: `routes/inventory.js:301-323` (the existing `router.get('/reports/stagnant', ...)` handler)

**Interfaces:**
- Consumes: `precio_oferta` column (Task 1).
- Produces: `GET /api/inventory/reports/stagnant?meses=N` accessible to any authenticated user (not admin-only anymore), returning an array of `{ id, nombre, marca, imagen_url, precio_venta, precio_oferta, fecha_creacion, cantidad, meses_en_stock }`, consumed by `Remate.jsx` (Task 8) and `StatsDashboard.jsx` (Task 15).

- [ ] **Step 1: Replace the endpoint**

Find in `routes/inventory.js`:

```js
// Reporte de productos estancados (Corregido el JOIN)
router.get('/reports/stagnant', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        // Unimos con la tabla 'inventario' para obtener la cantidad real
        const query = `
            SELECT p.nombre, i.cantidad, p.fecha_creacion 
            FROM productos p
            JOIN inventario i ON p.id = i.producto_id
            WHERE p.fecha_creacion < NOW() - INTERVAL '3 months' 
            AND i.cantidad > 0
            ORDER BY p.fecha_creacion ASC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error("Error reporte:", err.message);
        res.json([]); 
    }
});
```

Replace with:

```js
// Reporte de productos estancados (filtrable por cantidad de meses en stock)
router.get('/reports/stagnant', authenticateToken, async (req, res) => {
    const mesesParam = parseInt(req.query.meses);
    const meses = Number.isInteger(mesesParam) && mesesParam > 0 ? mesesParam : 3;

    try {
        const query = `
            SELECT 
                p.id, p.nombre, p.marca, p.imagen_url, p.precio_venta, p.precio_oferta,
                p.fecha_creacion, i.cantidad,
                FLOOR(EXTRACT(EPOCH FROM (NOW() - p.fecha_creacion)) / 2592000)::int AS meses_en_stock
            FROM productos p
            JOIN inventario i ON p.id = i.producto_id
            WHERE p.fecha_creacion < NOW() - ($1::text || ' months')::interval
            AND i.cantidad > 0
            ORDER BY p.fecha_creacion ASC
        `;
        const result = await db.query(query, [meses]);
        res.json(result.rows);
    } catch (err) {
        console.error("Error reporte:", err.message);
        res.json([]); 
    }
});
```

Note: `checkAdminRole` is intentionally removed here — per the approved design, cajero can view this report read-only, admin can additionally act on it (enforced on the write endpoints in Tasks 4-5, not this read endpoint).

- [ ] **Step 2: Verify with curl** (backend already running from Task 2, restart if needed)

```bash
curl -s "http://localhost:3000/api/inventory/reports/stagnant?meses=3" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data', d => console.log(JSON.parse(d)))"
```

Expected output: an array of products (only those with `cantidad > 0` and older than 3 months), each including a `meses_en_stock` integer.

- [ ] **Step 3: Verify the `meses` filter works**

```bash
curl -s "http://localhost:3000/api/inventory/reports/stagnant?meses=12" -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).length))"
```

Expected output: a number less than or equal to the count from Step 2 (fewer or equal products qualify at 12 months than at 3 months).

- [ ] **Step 4: Commit**

```bash
git add routes/inventory.js
git commit -m "Make stagnant-products report filterable by months and open to all roles"
```

---

### Task 4: Backend — apply discount endpoint

**Files:**
- Modify: `routes/inventory.js` (add new route near the other `productos`-related routes, after the stagnant report from Task 3)

**Interfaces:**
- Consumes: `precio_oferta` column (Task 1).
- Produces: `POST /api/inventory/discount` (admin-only), body `{ producto_ids: number[], porcentaje: number }`, returns `{ message, productos: [{ id, precio_venta, precio_oferta }] }`. Consumed by `Remate.jsx` (Tasks 10-11) and `InventoryDashboard.jsx` (Task 13).

- [ ] **Step 1: Add the endpoint**

Add this after the `/reports/stagnant` route in `routes/inventory.js` (before the `module.exports = router;` line):

```js
// =====================================================================
// 10. APLICAR / QUITAR DESCUENTO (REMATE)
// =====================================================================
router.post('/discount', authenticateToken, checkAdminRole, logActivity('Aplicar Descuento', 'productos'), async (req, res) => {
    const { producto_ids, porcentaje } = req.body;

    if (!Array.isArray(producto_ids) || producto_ids.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos un producto.' });
    }
    const pct = parseFloat(porcentaje);
    if (isNaN(pct) || pct <= 0 || pct >= 100) {
        return res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 99.' });
    }

    try {
        await db.query('BEGIN');

        const result = await db.query(
            `UPDATE productos 
             SET precio_oferta = ROUND(precio_venta * (1 - $1 / 100.0), 2)
             WHERE id = ANY($2::int[])
             RETURNING id, precio_venta, precio_oferta`,
            [pct, producto_ids]
        );

        await db.query('COMMIT');
        return res.json({ message: 'Descuento aplicado.', productos: result.rows });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al aplicar descuento:', error);
        return res.status(500).json({ error: 'Error al aplicar el descuento.' });
    }
});
```

- [ ] **Step 2: Verify with curl** — pick a real product id from your data (e.g. `1`)

```bash
curl -s -X POST http://localhost:3000/api/inventory/discount -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"producto_ids":[1],"porcentaje":20}'
```

Expected output: `{"message":"Descuento aplicado.","productos":[{"id":1,"precio_venta":"100.00","precio_oferta":"80.00"}]}` (numbers will match your actual product's price at 20% off).

- [ ] **Step 3: Verify validation rejects bad input**

```bash
curl -s -X POST http://localhost:3000/api/inventory/discount -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"producto_ids":[],"porcentaje":20}'
curl -s -X POST http://localhost:3000/api/inventory/discount -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"producto_ids":[1],"porcentaje":150}'
```

Expected output for both: a `400` response with an `error` message (`"Selecciona al menos un producto."` and `"El porcentaje debe estar entre 1 y 99."` respectively).

- [ ] **Step 4: Commit**

```bash
git add routes/inventory.js
git commit -m "Add POST /inventory/discount endpoint to apply bulk product discounts"
```

---

### Task 5: Backend — remove discount endpoint

**Files:**
- Modify: `routes/inventory.js` (add new route directly after the one from Task 4)

**Interfaces:**
- Consumes: `precio_oferta` column (Task 1).
- Produces: `DELETE /api/inventory/discount` (admin-only), body `{ producto_ids: number[] }`, returns `{ message, productos: [{ id }] }`. Consumed by `Remate.jsx` (Tasks 10-11) and `InventoryDashboard.jsx` (Task 13).

- [ ] **Step 1: Add the endpoint**

```js
router.delete('/discount', authenticateToken, checkAdminRole, logActivity('Quitar Descuento', 'productos'), async (req, res) => {
    const { producto_ids } = req.body;

    if (!Array.isArray(producto_ids) || producto_ids.length === 0) {
        return res.status(400).json({ error: 'Selecciona al menos un producto.' });
    }

    try {
        await db.query('BEGIN');

        const result = await db.query(
            `UPDATE productos 
             SET precio_oferta = NULL
             WHERE id = ANY($1::int[])
             RETURNING id`,
            [producto_ids]
        );

        await db.query('COMMIT');
        return res.json({ message: 'Descuento eliminado.', productos: result.rows });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al quitar descuento:', error);
        return res.status(500).json({ error: 'Error al quitar el descuento.' });
    }
});
```

- [ ] **Step 2: Verify with curl** (using the same product id discounted in Task 4)

```bash
curl -s -X DELETE http://localhost:3000/api/inventory/discount -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"producto_ids":[1]}'
curl -s http://localhost:3000/api/inventory/inventory -H "Authorization: Bearer $TOKEN" | node -e "process.stdin.on('data', d => console.log(JSON.parse(d).find(p => p.id === 1).precio_oferta))"
```

Expected output: the delete call returns `{"message":"Descuento eliminado.","productos":[{"id":1}]}`, and the second command prints `null`.

- [ ] **Step 3: Commit**

```bash
git add routes/inventory.js
git commit -m "Add DELETE /inventory/discount endpoint to remove product discounts"
```

---

### Task 6: Frontend — Sidebar entry and route registration for Remate

**Files:**
- Modify: `frontend/src/components/Sidebar.jsx`
- Modify: `frontend/src/App.jsx`
- Create: `frontend/src/components/Remate.jsx` (placeholder, filled out in Task 8)

**Interfaces:**
- Produces: `/remate` route reachable from the sidebar for `admin` and `cajero` roles.

- [ ] **Step 1: Create a placeholder Remate component**

```jsx
// frontend/src/components/Remate.jsx
import React from 'react';
import { Container, Typography } from '@mui/material';

const Remate = () => {
    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Typography variant="h4">Remate</Typography>
        </Container>
    );
};

export default Remate;
```

- [ ] **Step 2: Add the Sidebar entry**

In `frontend/src/components/Sidebar.jsx`, update the icon import (currently):

```jsx
import { 
    Dashboard,      // Icono para Inicio
    Inventory,      // Icono para Inventario
    PointOfSale,    // Icono para POS
    Assessment,     // Icono para Reportes
    People,         // Icono para Usuarios
    History,        // Icono para Auditoría
    ReceiptLong,    // Icono para Personalizar Recibo
    ExitToApp,       // Icono para Salir
    Handyman
} from '@mui/icons-material';
```

to:

```jsx
import { 
    Dashboard,      // Icono para Inicio
    Inventory,      // Icono para Inventario
    PointOfSale,    // Icono para POS
    Assessment,     // Icono para Reportes
    People,         // Icono para Usuarios
    History,        // Icono para Auditoría
    ReceiptLong,    // Icono para Personalizar Recibo
    ExitToApp,       // Icono para Salir
    Handyman,
    Sell            // Icono para Remate
} from '@mui/icons-material';
```

Then update the menu construction (currently):

```jsx
    // 1. Menú Básico (Para todos los usuarios)
    const menuItems = [
        { text: 'Inicio', icon: <Dashboard />, path: '/' },
        { text: 'Inventario', icon: <Inventory />, path: '/inventory' },
        { text: 'Punto de Venta', icon: <PointOfSale />, path: '/pos' },
    ];

    // 2. Menú de Administrador (Se agregan si el rol es admin)
    if (user?.rol === 'admin') {
```

to:

```jsx
    // 1. Menú Básico (Para todos los usuarios)
    const menuItems = [
        { text: 'Inicio', icon: <Dashboard />, path: '/' },
        { text: 'Inventario', icon: <Inventory />, path: '/inventory' },
        { text: 'Punto de Venta', icon: <PointOfSale />, path: '/pos' },
    ];

    // Remate: visible para admin y cajero (no para empleado)
    if (user?.rol === 'admin' || user?.rol === 'cajero') {
        menuItems.push({ text: 'Remate', icon: <Sell />, path: '/remate' });
    }

    // 2. Menú de Administrador (Se agregan si el rol es admin)
    if (user?.rol === 'admin') {
```

- [ ] **Step 3: Register the route in App.jsx**

In `frontend/src/App.jsx`, add the import (after the `AdminTools` import):

```jsx
import AdminTools from './components/AdminTools';
import Remate from './components/Remate';
```

Then update the protected routes block (currently):

```jsx
                                    <Route path="/" element={<StatsDashboard />} />
                                    <Route path="/inventory" element={<InventoryDashboard />} />
                                    <Route path="/pos" element={<PointOfSale />} />
                                    
                                    {/* Rutas solo para Admin */}
                                    {user?.rol === 'admin' && (
```

to:

```jsx
                                    <Route path="/" element={<StatsDashboard />} />
                                    <Route path="/inventory" element={<InventoryDashboard />} />
                                    <Route path="/pos" element={<PointOfSale />} />

                                    {(user?.rol === 'admin' || user?.rol === 'cajero') && (
                                        <Route path="/remate" element={<Remate />} />
                                    )}
                                    
                                    {/* Rutas solo para Admin */}
                                    {user?.rol === 'admin' && (
```

- [ ] **Step 4: Manually verify in the browser**

```bash
cd frontend
npm run dev
```

Open the printed local URL, log in as a `cajero` or `admin` user, and confirm a "Remate" item with a tag icon appears in the sidebar between "Punto de Venta" and the admin-only items, and clicking it navigates to a page showing the "Remate" placeholder heading. Log in as an `empleado` user (if one exists) and confirm the item does NOT appear.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/components/Sidebar.jsx frontend/src/App.jsx frontend/src/components/Remate.jsx
git commit -m "Add Remate route and sidebar entry for admin and cajero roles"
```

---

### Task 7: Frontend — Remate.jsx: data loading, month filters, age badges, pagination

**Files:**
- Modify: `frontend/src/components/Remate.jsx` (replace the Task 6 placeholder entirely)

**Interfaces:**
- Consumes: `GET /api/inventory/reports/stagnant?meses=N` (Task 3).
- Produces: `getAgeBadgeStyle(meses)` helper and the page's `products` state shape `{ id, nombre, marca, imagen_url, precio_venta, precio_oferta, cantidad, meses_en_stock }`, both reused by Tasks 8-11.

- [ ] **Step 1: Write the full component**

```jsx
// frontend/src/components/Remate.jsx
import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination
} from '@mui/material';
import { Sell } from '@mui/icons-material';

const MONTH_FILTERS = [3, 6, 12];

const getAgeBadgeStyle = (meses) => {
    if (meses >= 12) return { bgcolor: '#ffebee', color: '#c62828' }; // rojo
    if (meses >= 6) return { bgcolor: '#fff3e0', color: '#ef6c00' }; // naranja
    return { bgcolor: '#fff8e1', color: '#f9a825' }; // amarillo
};

const Remate = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [mesesFiltro, setMesesFiltro] = useState(3);
    const [mesesPersonalizados, setMesesPersonalizados] = useState('');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchStagnant = async (meses) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/reports/stagnant', {
                params: { meses },
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(Array.isArray(res.data) ? res.data : []);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el reporte de productos antiguos.');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStagnant(mesesFiltro); setPage(0); }, [mesesFiltro]);

    const handleCustomMeses = (e) => {
        if (e.key === 'Enter') {
            const val = parseInt(mesesPersonalizados);
            if (!isNaN(val) && val > 0) setMesesFiltro(val);
        }
    };

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getOptimizedImageUrl = (url, width = 100) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        const parts = url.split('/upload/');
        return `${parts[0]}/upload/w_${width},c_limit,f_auto,q_auto/${parts[1]}`;
    };

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    const visibleProducts = products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Sell fontSize="large" color="warning" />
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    Remate de Productos Antiguos
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {MONTH_FILTERS.map((m) => (
                    <Chip
                        key={m}
                        label={`+${m} meses`}
                        color={mesesFiltro === m ? 'primary' : 'default'}
                        onClick={() => { setMesesFiltro(m); setMesesPersonalizados(''); }}
                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                    />
                ))}
                <TextField
                    size="small"
                    label="Meses personalizados"
                    type="number"
                    value={mesesPersonalizados}
                    onChange={(e) => setMesesPersonalizados(e.target.value)}
                    onKeyDown={handleCustomMeses}
                    sx={{ width: 180 }}
                />
            </Paper>

            <Paper sx={{ width: '100%', mb: 2, borderRadius: 3, overflow: 'hidden' }} elevation={3}>
                <TableContainer sx={{ maxHeight: '65vh' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Antigüedad</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleProducts.map((product) => {
                                const badgeStyle = getAgeBadgeStyle(product.meses_en_stock);
                                return (
                                    <TableRow key={product.id} hover sx={{ height: 90 }}>
                                        <TableCell>
                                            <Avatar
                                                src={getOptimizedImageUrl(product.imagen_url, 140)}
                                                variant="rounded"
                                                sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd' }}
                                            >
                                                {product.nombre.charAt(0)}
                                            </Avatar>
                                        </TableCell>
                                        <TableCell><Typography fontWeight="bold" variant="body2">{product.nombre}</Typography></TableCell>
                                        <TableCell>{product.marca}</TableCell>
                                        <TableCell align="right">
                                            {product.precio_oferta ? (
                                                <Box>
                                                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#999' }}>
                                                        Q{Number(product.precio_venta).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                                                        Q{Number(product.precio_oferta).toFixed(2)}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                    Q{Number(product.precio_venta).toFixed(2)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${product.meses_en_stock} meses en stock`}
                                                sx={{ fontWeight: 'bold', ...badgeStyle }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={product.cantidad} color={product.cantidad < 5 ? 'error' : 'success'} sx={{ fontWeight: 'bold' }} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {visibleProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        No hay productos con esa antigüedad.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={products.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página"
                />
            </Paper>
        </Container>
    );
};

export default Remate;
```

- [ ] **Step 2: Manually verify in the browser**

With the backend running (`npm run dev` at project root) and frontend running (`cd frontend && npm run dev`), navigate to `/remate`. Confirm: the list loads, the "+3/+6/+12 meses" chips filter the list when clicked, the custom months field filters on Enter, badges show the right color per the 3/6/12 month tiers, and the `10/25/50` rows-per-page selector works.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Remate.jsx
git commit -m "Build Remate page with month filters, age badges, and pagination"
```

---

### Task 8: Frontend — Remate.jsx: photo zoom modal

**Files:**
- Modify: `frontend/src/components/Remate.jsx`

**Interfaces:**
- Consumes: `products` state and `getOptimizedImageUrl` from Task 7.
- Produces: click-to-zoom gallery, consumed by no later task (self-contained UX addition).

- [ ] **Step 1: Add the new imports**

Change:

```jsx
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination
} from '@mui/material';
import { Sell } from '@mui/icons-material';
```

to:

```jsx
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination, Dialog, IconButton, Tooltip
} from '@mui/material';
import { Sell, ArrowBack, ArrowForward, Close, ImageNotSupported } from '@mui/icons-material';
```

- [ ] **Step 2: Add zoom state and navigation handlers**

After the `rowsPerPage` state declaration, add:

```jsx
    const [viewImageIndex, setViewImageIndex] = useState(null);
```

After `getOptimizedImageUrl`, add:

```jsx
    const handleNextImage = () => viewImageIndex < products.length - 1 && setViewImageIndex(viewImageIndex + 1);
    const handlePrevImage = () => viewImageIndex > 0 && setViewImageIndex(viewImageIndex - 1);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (viewImageIndex === null) return;
            if (e.key === 'ArrowRight') handleNextImage();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'Escape') setViewImageIndex(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewImageIndex, products]);

    const currentGalleryProduct = viewImageIndex !== null ? products[viewImageIndex] : null;
```

- [ ] **Step 3: Make the Avatar clickable**

Inside the `visibleProducts.map` callback, right after `const badgeStyle = getAgeBadgeStyle(product.meses_en_stock);`, add:

```jsx
                                const realIndex = products.indexOf(product);
```

Then change:

```jsx
                                        <TableCell>
                                            <Avatar
                                                src={getOptimizedImageUrl(product.imagen_url, 140)}
                                                variant="rounded"
                                                sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd' }}
                                            >
                                                {product.nombre.charAt(0)}
                                            </Avatar>
                                        </TableCell>
```

to:

```jsx
                                        <TableCell>
                                            <Tooltip title="Ver detalle (Zoom)">
                                                <Avatar
                                                    src={getOptimizedImageUrl(product.imagen_url, 140)}
                                                    variant="rounded"
                                                    onClick={() => setViewImageIndex(realIndex)}
                                                    sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}
                                                >
                                                    {product.nombre.charAt(0)}
                                                </Avatar>
                                            </Tooltip>
                                        </TableCell>
```

- [ ] **Step 4: Add the zoom Dialog**

Right before the closing `</Container>`, add:

```jsx
            <Dialog
                open={viewImageIndex !== null}
                onClose={() => setViewImageIndex(null)}
                maxWidth="lg"
                PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none', overflow: 'visible' } }}
            >
                <Box sx={{ position: 'relative', width: 'auto', maxWidth: '90vw', maxHeight: '90vh', bgcolor: 'white', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 24 }}>
                    <IconButton onClick={() => setViewImageIndex(null)} sx={{ position: 'absolute', top: 10, right: 10, zIndex: 50, bgcolor: 'rgba(0,0,0,0.1)', '&:hover': { bgcolor: 'rgba(0,0,0,0.2)' } }}>
                        <Close />
                    </IconButton>

                    {currentGalleryProduct && (
                        <>
                            <Box sx={{ width: '100%', minWidth: { xs: '300px', md: '500px' }, height: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8f9fa', position: 'relative' }}>
                                <IconButton onClick={handlePrevImage} disabled={viewImageIndex === 0} sx={{ position: 'absolute', left: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' }, display: viewImageIndex === 0 ? 'none' : 'flex' }}>
                                    <ArrowBack />
                                </IconButton>

                                {currentGalleryProduct.imagen_url ? (
                                    <img
                                        src={getOptimizedImageUrl(currentGalleryProduct.imagen_url, 1000)}
                                        alt="Detalle"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <Box display="flex" flexDirection="column" alignItems="center" color="text.secondary">
                                        <ImageNotSupported sx={{ fontSize: 80, opacity: 0.3 }} />
                                        <Typography variant="caption">Sin Imagen</Typography>
                                    </Box>
                                )}

                                <IconButton onClick={handleNextImage} disabled={viewImageIndex === products.length - 1} sx={{ position: 'absolute', right: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' }, display: viewImageIndex === products.length - 1 ? 'none' : 'flex' }}>
                                    <ArrowForward />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid #eee' }}>
                                <Typography variant="h5" fontWeight="bold">{currentGalleryProduct.nombre}</Typography>
                                <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>{currentGalleryProduct.marca}</Typography>
                                <Chip label={`${currentGalleryProduct.meses_en_stock} meses en stock`} sx={{ fontWeight: 'bold', ...getAgeBadgeStyle(currentGalleryProduct.meses_en_stock) }} />
                            </Box>
                        </>
                    )}
                </Box>
            </Dialog>
```

- [ ] **Step 5: Manually verify in the browser**

On `/remate`, click a product photo — confirm the zoom dialog opens, arrow keys and on-screen arrow buttons navigate between products, and `Escape` or the close button dismiss it.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/Remate.jsx
git commit -m "Add photo zoom gallery to Remate page"
```

---

### Task 9: Frontend — Remate.jsx: bulk selection and discount actions (admin only)

**Files:**
- Modify: `frontend/src/components/Remate.jsx`

**Interfaces:**
- Consumes: `POST /api/inventory/discount` and `DELETE /api/inventory/discount` (Tasks 4-5).
- Produces: `applyDiscount(ids, pct)` and `removeDiscount(ids)` functions, reused by Task 10 for the per-row quick action.

- [ ] **Step 1: Add new imports**

Change:

```jsx
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination, Dialog, IconButton, Tooltip
} from '@mui/material';
import { Sell, ArrowBack, ArrowForward, Close, ImageNotSupported } from '@mui/icons-material';
```

to:

```jsx
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination, Dialog, IconButton, Tooltip,
    Checkbox, Button, Snackbar
} from '@mui/material';
import { Sell, ArrowBack, ArrowForward, Close, ImageNotSupported } from '@mui/icons-material';
```

- [ ] **Step 2: Add role, selection, and toast state**

After the `viewImageIndex` state declaration, add:

```jsx
    const [userRole, setUserRole] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkPct, setBulkPct] = useState('');
    const [applying, setApplying] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
```

Right after the component's other `useEffect` calls (below the `fetchStagnant`-triggering effect), add:

```jsx
    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) setUserRole((JSON.parse(userStr).rol || '').toLowerCase());
    }, []);

    const isAdmin = userRole === 'admin';
```

- [ ] **Step 3: Add the discount action helpers**

After `handleChangeRowsPerPage`, add:

```jsx
    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const applyDiscount = async (ids, pct) => {
        const parsedPct = parseFloat(pct);
        if (!ids.length || isNaN(parsedPct) || parsedPct <= 0 || parsedPct >= 100) {
            setToast({ open: true, msg: 'Ingresa un porcentaje válido (1-99).', severity: 'error' });
            return;
        }
        setApplying(true);
        try {
            const token = localStorage.getItem('authToken');
            await API.post('/inventory/discount', { producto_ids: ids, porcentaje: parsedPct }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento aplicado correctamente.', severity: 'success' });
            setSelectedIds([]);
            setBulkPct('');
            await fetchStagnant(mesesFiltro);
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al aplicar el descuento.', severity: 'error' });
        } finally {
            setApplying(false);
        }
    };

    const removeDiscount = async (ids) => {
        if (!ids.length) return;
        setApplying(true);
        try {
            const token = localStorage.getItem('authToken');
            await API.delete('/inventory/discount', {
                data: { producto_ids: ids },
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento eliminado.', severity: 'success' });
            setSelectedIds([]);
            await fetchStagnant(mesesFiltro);
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al quitar el descuento.', severity: 'error' });
        } finally {
            setApplying(false);
        }
    };
```

- [ ] **Step 4: Add the checkbox column (admin only)**

Change the table header:

```jsx
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
```

to:

```jsx
                        <TableHead>
                            <TableRow>
                                {isAdmin && <TableCell padding="checkbox" />}
                                <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
```

Change the row rendering, right after `<TableRow key={product.id} hover sx={{ height: 90 }}>`:

```jsx
                                    <TableRow key={product.id} hover sx={{ height: 90 }}>
                                        <TableCell>
```

to:

```jsx
                                    <TableRow key={product.id} hover sx={{ height: 90 }}>
                                        {isAdmin && (
                                            <TableCell padding="checkbox">
                                                <Checkbox checked={selectedIds.includes(product.id)} onChange={() => toggleSelect(product.id)} />
                                            </TableCell>
                                        )}
                                        <TableCell>
```

And update the empty-state `colSpan` from `6` to a dynamic value — change:

```jsx
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
```

to:

```jsx
                                    <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 3 }}>
```

- [ ] **Step 5: Add the floating bulk-action bar (admin only)**

Right before the closing `</Paper>` that wraps the table (i.e., right after the `<TablePagination ... />` block), add:

```jsx
                {isAdmin && selectedIds.length > 0 && (
                    <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff8e1' }}>
                        <Typography fontWeight="bold">{selectedIds.length} seleccionado(s)</Typography>
                        <TextField
                            size="small"
                            label="% Descuento"
                            type="number"
                            value={bulkPct}
                            onChange={(e) => setBulkPct(e.target.value)}
                            sx={{ width: 140 }}
                        />
                        <Button variant="contained" color="warning" startIcon={<Sell />} disabled={applying} onClick={() => applyDiscount(selectedIds, bulkPct)}>
                            Aplicar a {selectedIds.length} productos
                        </Button>
                        <Button variant="outlined" color="error" disabled={applying} onClick={() => removeDiscount(selectedIds)}>
                            Quitar descuento a {selectedIds.length} productos
                        </Button>
                    </Box>
                )}
```

- [ ] **Step 6: Add the Snackbar toast**

Right before the closing `</Container>` (after the zoom `<Dialog>` from Task 8), add:

```jsx
            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
```

- [ ] **Step 7: Manually verify in the browser**

Log in as admin, go to `/remate`, select two or more products via checkboxes, enter a percentage (e.g. `15`), click "Aplicar" — confirm the toast shows success, the table refreshes showing the struck-through original price plus the new discounted price for those products, and the selection clears. Click "Quitar descuento" on the same products — confirm the discounted price disappears and the price returns to normal. Log in as cajero and confirm no checkboxes or bulk bar appear, but the list (including any active discounts) is still visible.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/Remate.jsx
git commit -m "Add bulk selection and discount apply/remove actions to Remate page (admin only)"
```

---

### Task 10: Frontend — Remate.jsx: per-row quick discount action (admin only)

**Files:**
- Modify: `frontend/src/components/Remate.jsx`

**Interfaces:**
- Consumes: `applyDiscount` and `removeDiscount` from Task 9.

- [ ] **Step 1: Add per-row inline controls**

Find the price cell (already shows the struck-through/discounted price):

```jsx
                                        <TableCell align="right">
                                            {product.precio_oferta ? (
                                                <Box>
                                                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#999' }}>
                                                        Q{Number(product.precio_venta).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                                                        Q{Number(product.precio_oferta).toFixed(2)}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                    Q{Number(product.precio_venta).toFixed(2)}
                                                </Typography>
                                            )}
                                        </TableCell>
```

Replace with (adds an inline admin-only mini form/button below the price):

```jsx
                                        <TableCell align="right">
                                            {product.precio_oferta ? (
                                                <Box>
                                                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#999' }}>
                                                        Q{Number(product.precio_venta).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                                                        Q{Number(product.precio_oferta).toFixed(2)}
                                                    </Typography>
                                                    {isAdmin && (
                                                        <Button size="small" color="error" disabled={applying} onClick={() => removeDiscount([product.id])}>
                                                            Quitar
                                                        </Button>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Box>
                                                    <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                        Q{Number(product.precio_venta).toFixed(2)}
                                                    </Typography>
                                                    {isAdmin && (
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end', mt: 0.5 }}>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                placeholder="%"
                                                                value={rowPct[product.id] || ''}
                                                                onChange={(e) => setRowPct({ ...rowPct, [product.id]: e.target.value })}
                                                                sx={{ width: 70 }}
                                                            />
                                                            <IconButton size="small" color="warning" disabled={applying} onClick={() => applyDiscount([product.id], rowPct[product.id])}>
                                                                <Sell fontSize="small" />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </Box>
                                            )}
                                        </TableCell>
```

- [ ] **Step 2: Add the `rowPct` state**

Next to the `bulkPct` state declaration, add:

```jsx
    const [rowPct, setRowPct] = useState({});
```

- [ ] **Step 3: Manually verify in the browser**

Log in as admin, go to `/remate`, on a product without an active discount type a percentage into the small inline field and click the tag icon — confirm the discount applies immediately without needing to select a checkbox. On a discounted product, click "Quitar" — confirm it reverts to the normal price. Log in as cajero and confirm neither control is visible.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/Remate.jsx
git commit -m "Add per-row quick discount action to Remate page (admin only)"
```

---

### Task 11: Frontend — InventoryDashboard.jsx: bigger rows/photos and discounted price display

**Files:**
- Modify: `frontend/src/components/InventoryDashboard.jsx`

**Interfaces:**
- Consumes: `precio_oferta` field now present on inventory items (Task 2).

- [ ] **Step 1: Enlarge the row photo**

Find (around line 284-296):

```jsx
                                    <TableCell>
                                        <Tooltip title="Ver detalle (Zoom)">
                                            <Avatar 
                                                // 🟢 AQUI USAMOS LA URL OPTIMIZADA (Miniatura)
                                                src={getOptimizedImageUrl(product.imagen_url, 100)} 
                                                variant="rounded" 
                                                onClick={() => setViewImageIndex(realIndex)}
                                                sx={{ 
                                                    width: 50, height: 50, bgcolor: '#eee', border: '1px solid #ddd', cursor: 'pointer',
                                                    transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' }
                                                }}
                                            >
                                                {product.nombre.charAt(0)}
                                            </Avatar>
                                        </Tooltip>
                                    </TableCell>
```

Replace with:

```jsx
                                    <TableCell>
                                        <Tooltip title="Ver detalle (Zoom)">
                                            <Avatar 
                                                // 🟢 AQUI USAMOS LA URL OPTIMIZADA (Miniatura)
                                                src={getOptimizedImageUrl(product.imagen_url, 140)} 
                                                variant="rounded" 
                                                onClick={() => setViewImageIndex(realIndex)}
                                                sx={{ 
                                                    width: 70, height: 70, bgcolor: '#eee', border: '1px solid #ddd', cursor: 'pointer',
                                                    transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' }
                                                }}
                                            >
                                                {product.nombre.charAt(0)}
                                            </Avatar>
                                        </Tooltip>
                                    </TableCell>
```

- [ ] **Step 2: Make rows taller**

Find:

```jsx
                                return (
                                <TableRow key={product.id} hover>
```

Replace with:

```jsx
                                return (
                                <TableRow key={product.id} hover sx={{ height: 96 }}>
```

- [ ] **Step 3: Show the discounted price with strikethrough**

Find:

```jsx
                                    <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>Q{Number(product.precio_venta).toFixed(2)}</TableCell>
```

Replace with:

```jsx
                                    <TableCell align="right">
                                        {product.precio_oferta ? (
                                            <Box>
                                                <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#999', display: 'block' }}>
                                                    Q{Number(product.precio_venta).toFixed(2)}
                                                </Typography>
                                                <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                    Q{Number(product.precio_oferta).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                Q{Number(product.precio_venta).toFixed(2)}
                                            </Typography>
                                        )}
                                    </TableCell>
```

(`Box` and `Typography` are already imported at the top of this file.)

- [ ] **Step 4: Manually verify in the browser**

Go to `/inventory`. Confirm photos are visibly bigger and rows are taller/easier to read than before. If any product currently has a discount active (from earlier testing in Task 9), confirm its price shows struck-through original + green discounted price.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/InventoryDashboard.jsx
git commit -m "Enlarge Inventory rows/photos and show discounted price when active"
```

---

### Task 12: Frontend — InventoryDashboard.jsx: individual discount modal and effective cart price

**Files:**
- Modify: `frontend/src/components/InventoryDashboard.jsx`

**Interfaces:**
- Consumes: `POST /inventory/discount`, `DELETE /inventory/discount` (Tasks 4-5).
- Produces: cart items pushed to `pos_cart_temp` now carry the effective (discounted, if any) price — consumed visually by `PointOfSale.jsx`.

- [ ] **Step 1: Add discount modal state**

Find:

```jsx
    // 🟢 GALERÍA (Índice de navegación)
    const [viewImageIndex, setViewImageIndex] = useState(null);
```

Replace with:

```jsx
    // 🟢 GALERÍA (Índice de navegación)
    const [viewImageIndex, setViewImageIndex] = useState(null);

    // 🟢 DESCUENTO INDIVIDUAL (REMATE)
    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [discountTarget, setDiscountTarget] = useState(null);
    const [discountPct, setDiscountPct] = useState('');
```

- [ ] **Step 2: Add the apply/remove handlers**

Find `confirmDelete` (ends around the line with `setDeleteConfirmOpen(false); }`), and add right after its closing:

```jsx
    const handleOpenDiscount = (product) => { setDiscountTarget(product); setDiscountPct(''); setDiscountModalOpen(true); };

    const handleApplyDiscount = async () => {
        const pct = parseFloat(discountPct);
        if (!discountTarget || isNaN(pct) || pct <= 0 || pct >= 100) {
            setToast({ open: true, msg: 'Ingresa un porcentaje válido (1-99).', severity: 'error' });
            return;
        }
        try {
            const token = localStorage.getItem('authToken');
            await API.post('/inventory/discount', { producto_ids: [discountTarget.id], porcentaje: pct }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento aplicado.', severity: 'success' });
            setDiscountModalOpen(false);
            fetchInventory();
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al aplicar el descuento.', severity: 'error' });
        }
    };

    const handleRemoveDiscount = async () => {
        if (!discountTarget) return;
        try {
            const token = localStorage.getItem('authToken');
            await API.delete('/inventory/discount', {
                data: { producto_ids: [discountTarget.id] },
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento eliminado.', severity: 'success' });
            setDiscountModalOpen(false);
            fetchInventory();
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al quitar el descuento.', severity: 'error' });
        }
    };
```

- [ ] **Step 3: Add the discount button next to Edit/Delete**

Find:

```jsx
                                    {userRole === 'admin' && (
                                        <TableCell align="center">
                                            <IconButton color="primary" onClick={() => handleOpenEdit(product)} size="small" sx={{ mr: 1 }}><Edit /></IconButton>
                                            <IconButton color="error" onClick={() => handleDeleteClick(product)} size="small"><Delete /></IconButton>
                                        </TableCell>
                                    )}
```

Replace with:

```jsx
                                    {userRole === 'admin' && (
                                        <TableCell align="center">
                                            <IconButton color="warning" onClick={() => handleOpenDiscount(product)} size="small" sx={{ mr: 1 }}><Sell /></IconButton>
                                            <IconButton color="primary" onClick={() => handleOpenEdit(product)} size="small" sx={{ mr: 1 }}><Edit /></IconButton>
                                            <IconButton color="error" onClick={() => handleDeleteClick(product)} size="small"><Delete /></IconButton>
                                        </TableCell>
                                    )}
```

- [ ] **Step 4: Import the `Sell` icon**

Find:

```jsx
import { 
    Add, Search, Delete, Edit, Close, 
    ArrowBack, ArrowForward, ImageNotSupported,
    ShoppingCart, Remove, AddCircle, RemoveCircle
} from '@mui/icons-material';
```

Replace with:

```jsx
import { 
    Add, Search, Delete, Edit, Close, 
    ArrowBack, ArrowForward, ImageNotSupported,
    ShoppingCart, Remove, AddCircle, RemoveCircle, Sell
} from '@mui/icons-material';
```

- [ ] **Step 5: Add the discount Dialog**

Right after the closing `</Dialog>` of "MODAL 3: ELIMINAR", add:

```jsx
            {/* --- MODAL 5: DESCUENTO INDIVIDUAL --- */}
            <Dialog open={discountModalOpen} onClose={() => setDiscountModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Aplicar Descuento</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="h6">{discountTarget?.nombre}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Precio actual: <strong>Q{Number(discountTarget?.precio_venta || 0).toFixed(2)}</strong>
                            {discountTarget?.precio_oferta && (
                                <> — Precio oferta: <strong>Q{Number(discountTarget.precio_oferta).toFixed(2)}</strong></>
                            )}
                        </Typography>
                        <TextField
                            autoFocus
                            type="number"
                            label="% Descuento"
                            value={discountPct}
                            onChange={(e) => setDiscountPct(e.target.value)}
                            sx={{ width: '160px' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
                    {discountTarget?.precio_oferta && (
                        <Button onClick={handleRemoveDiscount} variant="outlined" color="error">
                            Quitar Descuento
                        </Button>
                    )}
                    <Button onClick={handleApplyDiscount} variant="contained" color="warning">
                        Aplicar
                    </Button>
                </DialogActions>
            </Dialog>
```

Add `Button` to the MUI import list — find:

```jsx
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar,
    Tooltip, Snackbar, TablePagination
} from '@mui/material';
```

(`Button` is already imported here — no change needed to this block; this step confirms it, do not duplicate the import.)

- [ ] **Step 6: Use the effective price when adding to cart**

Find `handleAddToCart` (around line 162-183):

```jsx
    const handleAddToCart = () => {
        if (viewImageIndex === null) return;
        
        // CORRECCIÓN PARA QUE FUNCIONE CON PAGINACIÓN
        // Obtenemos el producto correcto de la lista filtrada completa
        const product = filteredInventory[viewImageIndex]; 
        
        if (!product) return;

        const storedCart = localStorage.getItem('pos_cart_temp');
        let currentCart = storedCart ? JSON.parse(storedCart) : [];

        const existingItem = currentCart.find(item => item.id === product.id);
        if (existingItem) {
            setToast({ open: true, msg: 'El producto ya está en el carrito POS', severity: 'info' });
        } else {
            currentCart.push({ ...product, qty: 1 });
            localStorage.setItem('pos_cart_temp', JSON.stringify(currentCart));
            setToast({ open: true, msg: '¡Agregado al Carrito! (Ve al Punto de Venta)', severity: 'success' });
        }
    };
```

Replace with:

```jsx
    const handleAddToCart = () => {
        if (viewImageIndex === null) return;
        
        // CORRECCIÓN PARA QUE FUNCIONE CON PAGINACIÓN
        // Obtenemos el producto correcto de la lista filtrada completa
        const product = filteredInventory[viewImageIndex]; 
        
        if (!product) return;

        const storedCart = localStorage.getItem('pos_cart_temp');
        let currentCart = storedCart ? JSON.parse(storedCart) : [];

        const existingItem = currentCart.find(item => item.id === product.id);
        if (existingItem) {
            setToast({ open: true, msg: 'El producto ya está en el carrito POS', severity: 'info' });
        } else {
            const precioEfectivo = product.precio_oferta ? Number(product.precio_oferta) : Number(product.precio_venta);
            currentCart.push({ ...product, precio_venta: precioEfectivo, qty: 1 });
            localStorage.setItem('pos_cart_temp', JSON.stringify(currentCart));
            setToast({ open: true, msg: '¡Agregado al Carrito! (Ve al Punto de Venta)', severity: 'success' });
        }
    };
```

- [ ] **Step 7: Manually verify in the browser**

On `/inventory`, as admin, click the new tag/discount icon on a product row, enter a percentage, click "Aplicar" — confirm the toast confirms success and the row now shows the struck-through price. Reopen the modal for the same product — confirm a "Quitar Descuento" button now appears; click it and confirm the price reverts. Open the photo zoom on a discounted product and click "Agregar al Carrito", then go to Punto de Venta and confirm the item is in the cart at the discounted price.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/components/InventoryDashboard.jsx
git commit -m "Add individual discount modal to Inventory and use effective price when adding to cart"
```

---

### Task 13: Frontend — PointOfSale.jsx: use effective price when scanning

**Files:**
- Modify: `frontend/src/components/PointOfSale.jsx`

**Interfaces:**
- Consumes: `precio_oferta` field on inventory items (Task 2).

- [ ] **Step 1: Update `addProductToCart`**

Find:

```jsx
    const addProductToCart = (code) => {
        setError(null);
        setSuccessMsg(null);
        const product = inventory.find(p => p.codigo_barras === code);
        
        if (!product) { setError("Producto no encontrado."); return; }
        if (product.cantidad <= 0) { setError(`¡Sin stock de ${product.nombre}!`); return; }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            updateQuantity(existingItem.id, existingItem.qty + 1, product.cantidad);
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };
```

Replace with:

```jsx
    const addProductToCart = (code) => {
        setError(null);
        setSuccessMsg(null);
        const product = inventory.find(p => p.codigo_barras === code);
        
        if (!product) { setError("Producto no encontrado."); return; }
        if (product.cantidad <= 0) { setError(`¡Sin stock de ${product.nombre}!`); return; }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            updateQuantity(existingItem.id, existingItem.qty + 1, product.cantidad);
        } else {
            const precioEfectivo = product.precio_oferta ? Number(product.precio_oferta) : Number(product.precio_venta);
            setCart([...cart, { ...product, precio_venta: precioEfectivo, qty: 1 }]);
        }
    };
```

- [ ] **Step 2: Manually verify in the browser**

Discount a product from `/inventory` or `/remate`. Go to `/pos`, scan/type its barcode and press Enter — confirm the item appears in the cart already at the discounted price (not the original). Confirm the admin can still manually override the price in the cart afterward, same as before.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/PointOfSale.jsx
git commit -m "Use discounted price automatically when scanning products at POS"
```

---

### Task 14: Frontend — StatsDashboard.jsx: "Artículos sin movimiento" summary card

**Files:**
- Modify: `frontend/src/components/StatsDashboard.jsx`

**Interfaces:**
- Consumes: `GET /api/inventory/reports/stagnant?meses=3` (Task 3).

- [ ] **Step 1: Add imports**

Find:

```jsx
import { 
    Container, Typography, CircularProgress, Grid, Card, CardContent, 
    Box, Avatar, Paper, Divider, Tabs, Tab, Alert, IconButton
} from '@mui/material';

// 2. IMPORTS DE ICONOS (Material Icons)
import { 
    Inventory, AttachMoney, Warning, TrendingUp, BarChart as BarIcon, 
    ShowChart, Lock, Person, CalendarMonth, ArrowBack
} from '@mui/icons-material';
```

Replace with:

```jsx
import { 
    Container, Typography, CircularProgress, Grid, Card, CardContent, 
    Box, Avatar, Paper, Divider, Tabs, Tab, Alert, IconButton, Button
} from '@mui/material';

// 2. IMPORTS DE ICONOS (Material Icons)
import { 
    Inventory, AttachMoney, Warning, TrendingUp, BarChart as BarIcon, 
    ShowChart, Lock, Person, CalendarMonth, ArrowBack, Sell
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
```

- [ ] **Step 2: Add navigate hook and stagnant count state**

Find:

```jsx
const StatsDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
```

Replace with:

```jsx
const StatsDashboard = () => {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [stagnantCount, setStagnantCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
```

- [ ] **Step 3: Fetch the stagnant count**

Find the end of the `fetchData` function's try block:

```jsx
                try {
                    const salesRes = await API.get('/inventory/sales-history', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSalesHistory(salesRes.data);
                } catch (e) {
                    console.warn("Error historial:", e);
                }

            } catch (err) {
                console.error("Error dashboard:", err);
                setError("No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
```

Replace with:

```jsx
                try {
                    const salesRes = await API.get('/inventory/sales-history', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSalesHistory(salesRes.data);
                } catch (e) {
                    console.warn("Error historial:", e);
                }

                try {
                    const stagnantRes = await API.get('/inventory/reports/stagnant', {
                        params: { meses: 3 },
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setStagnantCount(Array.isArray(stagnantRes.data) ? stagnantRes.data.length : 0);
                } catch (e) {
                    console.warn("Error reporte estancados:", e);
                }

            } catch (err) {
                console.error("Error dashboard:", err);
                setError("No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
```

- [ ] **Step 4: Add the summary card**

Find the closing of the KPI `<Grid container>` (right after the 3rd KPI `</Grid>` and before `{/* TABS DE ADMIN */}`):

```jsx
                    </Grid>
                </Grid>

                {/* TABS DE ADMIN */}
```

Replace with:

```jsx
                    </Grid>
                </Grid>

                {/* ARTÍCULOS SIN MOVIMIENTO */}
                {(userRole === 'admin' || userRole === 'cajero') && stagnantCount > 0 && (
                    <Paper elevation={3} sx={{ p: 3, mb: 4, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, bgcolor: '#fff8e1', border: '1px solid #ffe082' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: '#fff3e0', color: '#ef6c00', width: 50, height: 50 }}><Warning /></Avatar>
                            <Box>
                                <Typography fontWeight="bold">Artículos sin movimiento</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {stagnantCount} producto{stagnantCount === 1 ? '' : 's'} llevan más de 3 meses en stock
                                </Typography>
                            </Box>
                        </Box>
                        <Button variant="contained" color="warning" startIcon={<Sell />} onClick={() => navigate('/remate')}>
                            Ver en Remate
                        </Button>
                    </Paper>
                )}

                {/* TABS DE ADMIN */}
```

- [ ] **Step 5: Manually verify in the browser**

Go to `/` (Inicio) as admin or cajero while at least one product qualifies as stagnant (3+ months, from the seed data or from earlier manual testing). Confirm the "Artículos sin movimiento" card appears with the correct count and clicking "Ver en Remate" navigates to `/remate`. Log in as `empleado` (if that role exists in your data) and confirm the card does not appear.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/StatsDashboard.jsx
git commit -m "Add stagnant-products summary card to home dashboard linking to Remate"
```

---

### Task 15: Final full-flow verification

**Files:** none (verification only)

- [ ] **Step 1: Run the linter**

```bash
cd frontend
npm run lint
```

Expected output: no errors (warnings about pre-existing code are acceptable, but no new errors from files touched in this plan).

- [ ] **Step 2: Full manual walkthrough**

With both servers running (`npm run dev` at root, `cd frontend && npm run dev`):
1. Log in as admin. Go to Inicio — confirm the stagnant summary card (if applicable) and click through to Remate.
2. On Remate, filter by +3/+6/+12 meses and a custom value, confirm badges and photos render, zoom a photo.
3. Select 2+ products, apply a 25% bulk discount, confirm prices update; remove the discount from one product individually via the per-row control.
4. Go to Inventory, confirm larger photos/rows, apply a discount to one product via the new modal, confirm strikethrough pricing.
5. Go to Punto de Venta, scan the discounted product's barcode, confirm the cart shows the discounted price automatically.
6. Complete the sale and confirm the ticket total reflects the discounted price.
7. Log out, log in as a `cajero` user, repeat steps 1-2 confirming read-only access (no checkboxes, no bulk bar, no per-row discount controls) and that POS still reflects discounted prices automatically.

- [ ] **Step 3: Confirm no regressions in existing admin-only tools**

Go to `/admin-tools` and confirm the existing "Productos Estancados (+3 meses)" mini-report still loads correctly (it calls the same `/reports/stagnant` endpoint, now enhanced but backward-compatible with the `nombre`/`cantidad`/`fecha_creacion` fields it already reads).
