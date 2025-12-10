// gestor-inventario-ropa/routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const authenticateToken = require('../middleware/auth');
// Asegúrate de que este archivo existe, si no, comenta la importación y la generación automática
const { generateUniqueBarcode } = require('../utils/barcodeGenerator');
const logActivity = require('../middleware/logMiddleware');
const checkAdminRole = require('../middleware/adminMiddleware');
// ---------------------------------------------------------------------
// 1. REGISTRAR PRODUCTO (POST /products)
// ---------------------------------------------------------------------
router.post('/products', authenticateToken, checkAdminRole, logActivity('Creación de Nuevo Producto', 'productos'), async (req, res) => {
    const { nombre, marca, descripcion, precio_venta, talla, color, codigo_barras } = req.body;

    if (!nombre || !marca || !precio_venta || !talla || !color) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    let final_codigo_barras = codigo_barras;

    // Generación automática si viene vacío
    if (!final_codigo_barras || final_codigo_barras.trim() === '') {
        try {
            final_codigo_barras = generateUniqueBarcode();
        } catch (e) {
            // Fallback si no existe la librería: usa un timestamp simple
            final_codigo_barras = Date.now().toString(); 
        }
    }

    try {
        // Verificar duplicados
        const existing = await db.query('SELECT id FROM productos WHERE codigo_barras = $1', [final_codigo_barras]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'El código de barras ya existe.' });
        }

        // Insertar en PRODUCTOS (donde ahora viven talla, color y codigo)
        const result = await db.query(
            'INSERT INTO productos (nombre, marca, descripcion, precio_venta, talla, color, codigo_barras) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [nombre, marca, descripcion, precio_venta, talla, color, final_codigo_barras]
        );

        // El trigger en la BD creará la fila en 'inventario' automáticamente con cantidad 0
        
        res.status(201).json({ 
            message: 'Producto registrado con éxito.', 
            producto: result.rows[0] 
        });

    } catch (error) {
        console.error('Error al registrar:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ---------------------------------------------------------------------
// 2. CONSULTAR INVENTARIO (GET /inventory)
// ---------------------------------------------------------------------
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        // CORRECCIÓN: Ahora seleccionamos talla, color y codigo desde la tabla 'p' (productos)
        const query = `
            SELECT 
                p.id,
                p.nombre, 
                p.marca, 
                p.precio_venta, 
                p.talla, 
                p.color, 
                p.codigo_barras, 
                i.cantidad
            FROM inventario i
            JOIN productos p ON i.producto_id = p.id
            ORDER BY p.nombre ASC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

// ---------------------------------------------------------------------
// 3. ENTRADA DE STOCK (POST /scan-in)
// ---------------------------------------------------------------------
router.post('/scan-in', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad = 1 } = req.body;
    
    try {
        // 1. Buscar el producto por código de barras en la tabla PRODUCTOS
        const productCheck = await db.query('SELECT id FROM productos WHERE codigo_barras = $1', [codigo_barras]);
        
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        
        const producto_id = productCheck.rows[0].id;

        // 2. Actualizar inventario usando el ID encontrado
        const update = await db.query(
            'UPDATE inventario SET cantidad = cantidad + $1 WHERE producto_id = $2 RETURNING cantidad',
            [cantidad, producto_id]
        );

        res.json({ 
            message: 'Entrada registrada.', 
            nueva_cantidad: update.rows[0].cantidad 
        });

    } catch (error) {
        console.error('Error en scan-in:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
});

// ---------------------------------------------------------------------
// 4. SALIDA DE STOCK (POST /scan-out)
// ---------------------------------------------------------------------
router.post('/scan-out', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad = 1 } = req.body;
    const userId = req.user.userId;
    console.log('ID del Vendedor que se está usando:', userId); // 🛑 TEMPORAL
    try {
        // 1. Buscar producto, precio y stock actual
        const checkQuery = `
            SELECT i.producto_id, i.cantidad, p.precio_venta 
            FROM inventario i
            JOIN productos p ON i.producto_id = p.id
            WHERE p.codigo_barras = $1
        `;
        const check = await db.query(checkQuery, [codigo_barras]);

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        const { producto_id, cantidad: stockActual, precio_venta } = check.rows[0];

        if (stockActual < cantidad) {
            return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockActual}` });
        }

        // 2. Restar inventario
        const update = await db.query(
            'UPDATE inventario SET cantidad = cantidad - $1 WHERE producto_id = $2 RETURNING cantidad',
            [cantidad, producto_id]
        );

        // 3. 🛑 NUEVO: Guardar en Historial de Ventas
        const totalVenta = precio_venta * cantidad;
        await db.query(
            'INSERT INTO historial_ventas (producto_id, cantidad, precio_unitario, total_venta, user_id) VALUES ($1, $2, $3, $4 ,$5)',
            [producto_id, cantidad, precio_venta, totalVenta, userId]
        );

        res.json({ 
            message: 'Venta registrada con historial.', 
            nueva_cantidad: update.rows[0].cantidad 
        });

    } catch (error) {
        console.error('Error en scan-out:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
});

module.exports = router;