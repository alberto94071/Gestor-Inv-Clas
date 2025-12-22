const express = require('express');
const router = express.Router();
const db = require('../db/db'); 
const authenticateToken = require('../middleware/auth');
const checkAdminRole = require('../middleware/adminMiddleware');
const logActivity = require('../middleware/logMiddleware');
const { generateUniqueBarcode } = require('../utils/barcodeGenerator');

// =====================================================================
// 1. REGISTRAR PRODUCTO
// =====================================================================
router.post('/products', authenticateToken, logActivity('Creación de Producto', 'productos'), async (req, res) => {
    const { 
        nombre, marca, descripcion, precio_venta, 
        talla, color, codigo_barras, imagen_url, stock_inicial 
    } = req.body;

    if (!nombre || !precio_venta) {
        return res.status(400).json({ error: 'Nombre y Precio de Venta son obligatorios.' });
    }

    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';
    const finalCode = codigoLimpio || generateUniqueBarcode();

    let cantidadInicial = 1;
    if (stock_inicial !== undefined && stock_inicial !== '' && stock_inicial !== null) {
        const parsed = parseInt(stock_inicial);
        if (!isNaN(parsed)) cantidadInicial = parsed;
    }

    try {
        await db.query('BEGIN');

        const productResult = await db.query(
            `INSERT INTO productos 
            (nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [nombre, marca, descripcion, precio_venta, talla, color, finalCode, imagen_url || null]
        );
        const newProductId = productResult.rows[0].id;

        await db.query(
            'INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2)',
            [newProductId, cantidadInicial]
        );

        await db.query('COMMIT');
        return res.status(201).json({ 
            message: 'Producto registrado con éxito.', 
            id: newProductId,
            stock: cantidadInicial
        });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al registrar:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El código de barras ya existe.' });
        }
        return res.status(500).json({ error: 'Error al registrar el producto.' });
    }
});

// =====================================================================
// 2. CONSULTAR INVENTARIO
// =====================================================================
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, p.nombre, p.marca, p.descripcion, p.precio_venta, 
                p.talla, p.color, p.codigo_barras, p.imagen_url, p.fecha_creacion,
                COALESCE(i.cantidad, 0) as cantidad
            FROM productos p
            LEFT JOIN inventario i ON p.id = i.producto_id
            ORDER BY p.id DESC; 
        `;
        const result = await db.query(query);
        return res.json(result.rows);
    } catch (error) {
        console.error('Error inventory:', error);
        return res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

// =====================================================================
// 3. EDITAR PRODUCTO
// =====================================================================
router.put('/products/:id', authenticateToken, checkAdminRole, logActivity('Edición de Producto', 'productos'), async (req, res) => {
    const { id } = req.params;
    const { nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url } = req.body;

    try {
        const result = await db.query(
            `UPDATE productos 
             SET nombre=$1, marca=$2, descripcion=$3, precio_venta=$4, talla=$5, color=$6, codigo_barras=$7, imagen_url=$8
             WHERE id=$9 RETURNING *`,
            [nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url || null, id]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: "Producto no encontrado" });
        
        return res.json({ message: "Producto actualizado correctamente", producto: result.rows[0] });
    } catch (err) {
        console.error("Error al editar:", err);
        return res.status(500).json({ error: "Error al actualizar el producto" });
    }
});

// =====================================================================
// 4. SUMAR STOCK
// =====================================================================
router.post('/add-stock', authenticateToken, async (req, res) => {
    const { producto_id, cantidad } = req.body;

    if (!producto_id || cantidad === undefined) return res.status(400).json({ error: "Datos insuficientes" });

    try {
        const check = await db.query('SELECT * FROM inventario WHERE producto_id = $1', [producto_id]);

        let result;
        if (check.rows.length > 0) {
            result = await db.query(
                'UPDATE inventario SET cantidad = cantidad + $1 WHERE producto_id = $2 RETURNING cantidad',
                [cantidad, producto_id]
            );
        } else {
            result = await db.query(
                'INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2) RETURNING cantidad',
                [producto_id, cantidad]
            );
        }

        return res.json({ message: "Stock actualizado", nuevo_stock: result.rows[0].cantidad });
    } catch (err) {
        console.error("Error stock:", err);
        return res.status(500).json({ error: "Error interno" });
    }
});

// =====================================================================
// 5. REGISTRAR VENTA (scan-out)
// =====================================================================
router.post('/scan-out', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad = 1, precio_venta } = req.body;
    const userId = req.user ? req.user.userId : null; 
    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';

    try {
        await db.query('BEGIN');

        const checkQuery = `
            SELECT i.producto_id, i.cantidad, p.precio_venta as precio_base, p.nombre 
            FROM inventario i
            JOIN productos p ON i.producto_id = p.id
            WHERE p.codigo_barras = $1
        `;
        const check = await db.query(checkQuery, [codigoLimpio]);

        if (check.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        const { producto_id, cantidad: stockActual, precio_base, nombre } = check.rows[0];

        if (stockActual < cantidad) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: `Stock insuficiente de ${nombre}.` });
        }

        const precioFinal = precio_venta ? parseFloat(precio_venta) : parseFloat(precio_base);

        const update = await db.query(
            'UPDATE inventario SET cantidad = cantidad - $1 WHERE producto_id = $2 RETURNING cantidad',
            [cantidad, producto_id]
        );

        if (userId) {
            const totalVenta = precioFinal * cantidad;
            await db.query(
                'INSERT INTO historial_ventas (producto_id, cantidad, precio_unitario, total_venta, user_id, fecha_venta) VALUES ($1, $2, $3, $4, $5, NOW())',
                [producto_id, cantidad, precioFinal, totalVenta, userId]
            );
        }

        await db.query('COMMIT');
        return res.json({ message: 'Venta registrada.', nueva_cantidad: update.rows[0].cantidad });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error en scan-out:', error);
        return res.status(500).json({ error: 'Error al procesar la venta.' });
    }
});

// =====================================================================
// 6. ELIMINAR PRODUCTO
// =====================================================================
router.delete('/products/:id', authenticateToken, checkAdminRole, logActivity('Eliminación de Producto', 'productos'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('BEGIN');
        await db.query('DELETE FROM inventario WHERE producto_id = $1', [id]);
        
        const result = await db.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

        if (result.rowCount === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }

        await db.query('COMMIT');
        return res.json({ message: 'Producto eliminado correctamente.' });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error delete:', error);
        
        if (error.code === '23503') {
            return res.status(400).json({ error: 'No se puede eliminar: El producto tiene historial de ventas.' });
        }
        return res.status(500).json({ error: 'Error interno al eliminar.' });
    }
});

// =====================================================================
// 7. REPORTES Y CONFIGURACIÓN
// =====================================================================

router.get('/config/ticket', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM configuracion LIMIT 1');
        return res.json(result.rows[0] || {});
    } catch (error) {
        return res.json({}); 
    }
});

router.post('/config/ticket', authenticateToken, checkAdminRole, async (req, res) => {
    const { nombre_empresa, direccion, mensaje_final, whatsapp, instagram_url, logo_url, tipo_papel } = req.body;
    try {
        const check = await db.query('SELECT id FROM configuracion LIMIT 1');
        if (check.rows.length > 0) {
            await db.query(`
                UPDATE configuracion SET nombre_empresa=$1, direccion=$2, mensaje_final=$3, whatsapp=$4, instagram_url=$5, logo_url=$6, tipo_papel=$7`,
                [nombre_empresa, direccion, mensaje_final, whatsapp, instagram_url, logo_url, tipo_papel]
            );
        } else {
            await db.query(`
                INSERT INTO configuracion (nombre_empresa, direccion, mensaje_final, whatsapp, instagram_url, logo_url, tipo_papel)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [nombre_empresa, direccion, mensaje_final, whatsapp, instagram_url, logo_url, tipo_papel]
            );
        }
        return res.json({ message: 'Configuración guardada' });
    } catch (error) { 
        console.error(error);
        return res.status(500).json({ error: 'Error guardando configuración.' }); 
    }
});

// =====================================================================
// 8. HISTORIAL DE VENTAS (ACTUALIZADO Y BLINDADO)
// =====================================================================
router.get('/sales-history', authenticateToken, async (req, res) => {
    try {
        // Usamos comillas para FORZAR los nombres exactos y evitar problemas de minúsculas
        const query = `
            SELECT 
                h.id,
                h.fecha_venta as "fecha_hora", 
                h.cantidad,
                h.precio_unitario as "precio_unitario",
                h.total_venta as "totalVenta",
                p.nombre as producto,
                p.codigo_barras as codigo,
                -- COALESCE asegura que si el usuario no existe, diga 'Sistema'
                COALESCE(u.nombre, 'Sistema') as vendedor
            FROM historial_ventas h
            JOIN productos p ON h.producto_id = p.id
            LEFT JOIN usuarios u ON h.user_id = u.id
            ORDER BY h.fecha_venta DESC
        `;
        
        const result = await db.query(query);
        return res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener historial:", err);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Error del servidor al cargar historial" });
        }
    }
});

// =====================================================================
// 9. RUTAS PARA ADMIN TOOLS (Soluciona el error de pantalla blanca)
// =====================================================================

// Reporte de productos estancados
router.get('/reports/stagnant', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        // Asumiendo que existe la columna fecha_creacion, si no la tienes, esta consulta devolverá vacío sin fallar
        const query = `
            SELECT nombre, cantidad, fecha_creacion 
            FROM productos 
            WHERE fecha_creacion < NOW() - INTERVAL '3 months' 
            AND cantidad > 0
            ORDER BY fecha_creacion ASC
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (err) {
        // Si falla por falta de columna, devolvemos array vacío para no romper el front
        console.error("Error reporte:", err.message);
        res.json([]); 
    }
});

// Limpieza de historial antiguo
router.delete('/sales/cleanup', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        await db.query("DELETE FROM historial_ventas WHERE fecha_venta < NOW() - INTERVAL '1 month'");
        res.json({ message: "Limpieza completada" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al limpiar base de datos" });
    }
});

module.exports = router;