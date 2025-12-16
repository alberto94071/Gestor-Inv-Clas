// gestor-inventario-ropa/routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const authenticateToken = require('../middleware/auth'); 
const checkAdminRole = require('../middleware/adminMiddleware'); 
const logActivity = require('../middleware/logMiddleware');
const { generateUniqueBarcode } = require('../utils/barcodeGenerator');

// ---------------------------------------------------------------------
// 1. REGISTRAR PRODUCTO (POST /products)
// Incluye limpieza de espacios (trim) y transacción segura.
// ---------------------------------------------------------------------
router.post('/products', authenticateToken, logActivity('Creación de Producto', 'productos'), async (req, res) => {
    const { 
        nombre, marca, descripcion, precio_venta, 
        talla, color, codigo_barras, stock_inicial 
    } = req.body;

    if (!nombre || !precio_venta) {
        return res.status(400).json({ error: 'Nombre y Precio de Venta son obligatorios.' });
    }

    // 🛑 MEJORA CRÍTICA: Limpiar espacios en blanco (TRIM)
    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';

    // Generar código si no viene
    const finalCode = codigoLimpio || generateUniqueBarcode();

    try {
        await db.query('BEGIN');

        // A. Insertar Producto
        const productResult = await db.query(
            'INSERT INTO productos (nombre, marca, descripcion, precio_venta, talla, color, codigo_barras) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
            [nombre, marca, descripcion, precio_venta, talla, color, finalCode]
        );
        const newProductId = productResult.rows[0].id;

        // B. Insertar Inventario (con stock inicial o 0)
        let cantidad = 0;
        if (stock_inicial) {
            cantidad = parseInt(stock_inicial);
            if (isNaN(cantidad)) cantidad = 0; 
        }
        
        // Insertamos solo ID y Cantidad (la ubicación la quitamos para evitar errores antiguos)
        await db.query(
            'INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2)',
            [newProductId, cantidad]
        );

        await db.query('COMMIT');
        res.status(201).json({ message: 'Producto registrado con éxito', producto: productResult.rows[0] });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al registrar producto:', error);
        
        // Error de código duplicado
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El código de barras ya existe.' });
        }
        res.status(500).json({ error: 'Error al registrar el producto.' });
    }
});

// ---------------------------------------------------------------------
// 2. CONSULTAR INVENTARIO (GET /inventory)
// 🛑 CRÍTICO: Usa LEFT JOIN para ver productos "huérfanos" y evitar errores fantasmas.
// ---------------------------------------------------------------------
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id,
                p.nombre, 
                p.marca, 
                p.precio_venta, 
                p.talla, 
                p.color, 
                p.codigo_barras, 
                COALESCE(i.cantidad, 0) as cantidad -- Si es null, muestra 0
            FROM productos p
            LEFT JOIN inventario i ON p.id = i.producto_id -- Muestra el producto aunque no tenga inventario
            ORDER BY 
                CASE WHEN COALESCE(i.cantidad, 0) > 0 THEN 0 ELSE 1 END, -- Prioridad a los que tienen stock
                p.id DESC; -- Los más nuevos arriba
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
// Suma stock. Si el producto era "zombie" (sin ficha), lo revive creando la entrada.
// ---------------------------------------------------------------------
router.post('/scan-in', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad = 1 } = req.body;
    
    // Limpieza de espacios también aquí
    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';

    try {
        // 1. Buscar ID del producto
        const prodQuery = await db.query('SELECT id FROM productos WHERE codigo_barras = $1', [codigoLimpio]);
        
        if (prodQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        const producto_id = prodQuery.rows[0].id;

        // 2. Intentar actualizar (UPDATE)
        const update = await db.query(
            'UPDATE inventario SET cantidad = cantidad + $1 WHERE producto_id = $2 RETURNING cantidad',
            [cantidad, producto_id]
        );

        if (update.rows.length > 0) {
            // Si ya existía, devolvemos nueva cantidad
            return res.json({ message: 'Stock agregado.', nueva_cantidad: update.rows[0].cantidad });
        } else {
            // Si NO existía en inventario (era huérfano), lo insertamos ahora
            await db.query('INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2)', [producto_id, cantidad]);
            return res.json({ message: 'Stock inicializado y agregado.', nueva_cantidad: cantidad });
        }

    } catch (error) {
        console.error('Error en scan-in:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
});

// ---------------------------------------------------------------------
// 4. SALIDA DE STOCK / VENTA (POST /scan-out)
// Resta stock y guarda historial con User ID.
// ---------------------------------------------------------------------
router.post('/scan-out', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad = 1 } = req.body;
    const userId = req.user.userId; // Obtenido del token corregido
    
    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';

    try {
        // 1. Verificar existencia y stock
        const checkQuery = `
            SELECT i.producto_id, i.cantidad, p.precio_venta 
            FROM inventario i
            JOIN productos p ON i.producto_id = p.id
            WHERE p.codigo_barras = $1
        `;
        const check = await db.query(checkQuery, [codigoLimpio]);

        if (check.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado o sin stock registrado.' });
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

        // 3. Guardar en Historial
        const totalVenta = precio_venta * cantidad;
        await db.query(
            'INSERT INTO historial_ventas (producto_id, cantidad, precio_unitario, total_venta, user_id) VALUES ($1, $2, $3, $4, $5)',
            [producto_id, cantidad, precio_venta, totalVenta, userId]
        );

        res.json({ message: 'Venta registrada.', nueva_cantidad: update.rows[0].cantidad });

    } catch (error) {
        console.error('Error en scan-out:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
});

// ---------------------------------------------------------------------
// 5. ELIMINAR PRODUCTO (DELETE /products/:id)
// 🛑 SÓLO ADMIN.
// Protegido: Si tiene ventas, no deja borrar (integridad de datos).
// ---------------------------------------------------------------------
router.delete('/products/:id', authenticateToken, checkAdminRole, logActivity('Eliminación de Producto', 'productos'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('BEGIN');

        // 1. Eliminar del INVENTARIO primero
        await db.query('DELETE FROM inventario WHERE producto_id = $1', [id]);

        // 2. Eliminar del PRODUCTOS
        // Si falla aquí es porque tiene ventas históricas (Foreign Key Constraint)
        const result = await db.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        await db.query('COMMIT');
        res.json({ message: 'Producto eliminado correctamente.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al eliminar producto:', error);
        
        // Error código 23503: Violación de llave foránea (tiene historial)
        if (error.code === '23503') {
            return res.status(400).json({ error: 'No se puede eliminar: El producto tiene historial de ventas. (El sistema lo ocultará si el stock llega a 0).' });
        }
        res.status(500).json({ error: 'Error interno al eliminar.' });
    }
});

module.exports = router;