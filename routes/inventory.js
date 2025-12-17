// gestor-inventario-ropa/routes/inventory.js
const express = require('express');
const router = express.Router();
const db = require('../db/db'); // Asegúrate que esta ruta sea correcta según tu estructura
const authenticateToken = require('../middleware/auth'); 
const checkAdminRole = require('../middleware/adminMiddleware'); 
const logActivity = require('../middleware/logMiddleware');
const { generateUniqueBarcode } = require('../utils/barcodeGenerator');

// ---------------------------------------------------------------------
// 1. REGISTRAR PRODUCTO (POST /products)
// CORREGIDO: Ahora acepta imagen_url y usa transacciones
// ---------------------------------------------------------------------
router.post('/products', authenticateToken, logActivity('Creación de Producto', 'productos'), async (req, res) => {
    // 🟢 AQUÍ ESTABA EL ERROR: Agregamos 'imagen_url' al destructuring
    const { 
        nombre, marca, descripcion, precio_venta, 
        talla, color, codigo_barras, stock_inicial, imagen_url 
    } = req.body;

    if (!nombre || !precio_venta) {
        return res.status(400).json({ error: 'Nombre y Precio de Venta son obligatorios.' });
    }

    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';
    const finalCode = codigoLimpio || generateUniqueBarcode();

    try {
        await db.query('BEGIN');

        // A. Insertar Producto (Incluyendo imagen_url)
        // Usamos (imagen_url || null) para evitar errores si no envían foto
        const productResult = await db.query(
            `INSERT INTO productos 
            (nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [nombre, marca, descripcion, precio_venta, talla, color, finalCode, imagen_url || null]
        );
        const newProductId = productResult.rows[0].id;

        // B. Insertar en tabla INVENTARIO
        let cantidad = 0;
        if (stock_inicial) {
            cantidad = parseInt(stock_inicial);
            if (isNaN(cantidad)) cantidad = 0; 
        }
        
        await db.query(
            'INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2)',
            [newProductId, cantidad]
        );

        await db.query('COMMIT');
        res.status(201).json({ message: 'Producto registrado con éxito', producto: productResult.rows[0] });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error al registrar producto:', error);
        
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El código de barras ya existe.' });
        }
        res.status(500).json({ error: 'Error al registrar el producto.' });
    }
});

// ---------------------------------------------------------------------
// 2. CONSULTAR INVENTARIO (GET /inventory)
// CORREGIDO: Ahora devuelve también la imagen_url
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
                p.imagen_url, -- 🟢 Agregado para que se vea la foto en la tabla
                COALESCE(i.cantidad, 0) as cantidad
            FROM productos p
            LEFT JOIN inventario i ON p.id = i.producto_id
            ORDER BY 
                CASE WHEN COALESCE(i.cantidad, 0) > 0 THEN 0 ELSE 1 END,
                p.id DESC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener inventario:', error);
        res.status(500).json({ error: 'Error al obtener el inventario' });
    }
});

// ---------------------------------------------------------------------
// 3. EDITAR PRODUCTO (PUT /products/:id) - NUEVA FUNCIONALIDAD
// Permite modificar datos y foto, manteniendo el ID
// ---------------------------------------------------------------------
router.put('/products/:id', authenticateToken, checkAdminRole, logActivity('Edición de Producto', 'productos'), async (req, res) => {
    const { id } = req.params;
    const { nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url } = req.body;

    try {
        // Actualizamos la tabla productos
        const result = await db.query(
            `UPDATE productos 
             SET nombre=$1, marca=$2, descripcion=$3, precio_venta=$4, talla=$5, color=$6, codigo_barras=$7, imagen_url=$8
             WHERE id=$9 RETURNING *`,
            [nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url || null, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        
        res.json({ message: "Producto actualizado correctamente", producto: result.rows[0] });
    } catch (err) {
        console.error("Error al editar:", err);
        res.status(500).json({ error: "Error al actualizar el producto" });
    }
});

// ---------------------------------------------------------------------
// 4. SUMAR STOCK (POST /add-stock)
// Adaptado para usar tu tabla 'inventario' separada
// ---------------------------------------------------------------------
router.post('/add-stock', authenticateToken, async (req, res) => {
    const { producto_id, cantidad } = req.body;

    if (!producto_id || !cantidad) {
        return res.status(400).json({ error: "Datos insuficientes" });
    }

    try {
        // En tu sistema, el stock está en la tabla 'inventario', no en 'productos'
        // Primero verificamos si existe registro en inventario
        const check = await db.query('SELECT * FROM inventario WHERE producto_id = $1', [producto_id]);

        let result;
        if (check.rows.length > 0) {
            // Si existe, actualizamos
            result = await db.query(
                'UPDATE inventario SET cantidad = cantidad + $1 WHERE producto_id = $2 RETURNING cantidad',
                [cantidad, producto_id]
            );
        } else {
            // Si es un producto "huérfano" (sin registro en inventario), lo creamos
            result = await db.query(
                'INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2) RETURNING cantidad',
                [producto_id, cantidad]
            );
        }

        res.json({ message: "Stock actualizado correctamente", nuevo_stock: result.rows[0].cantidad });
    } catch (err) {
        console.error("Error al actualizar stock:", err);
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// ---------------------------------------------------------------------
// 5. SCAN-IN (Mantenemos por compatibilidad si lo usas en otro lado)
// ---------------------------------------------------------------------
router.post('/scan-in', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad = 1 } = req.body;
    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';

    try {
        const prodQuery = await db.query('SELECT id FROM productos WHERE codigo_barras = $1', [codigoLimpio]);
        
        if (prodQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        const producto_id = prodQuery.rows[0].id;

        const update = await db.query(
            'UPDATE inventario SET cantidad = cantidad + $1 WHERE producto_id = $2 RETURNING cantidad',
            [cantidad, producto_id]
        );

        if (update.rows.length > 0) {
            return res.json({ message: 'Stock agregado.', nueva_cantidad: update.rows[0].cantidad });
        } else {
            await db.query('INSERT INTO inventario (producto_id, cantidad) VALUES ($1, $2)', [producto_id, cantidad]);
            return res.json({ message: 'Stock inicializado y agregado.', nueva_cantidad: cantidad });
        }
    } catch (error) {
        console.error('Error en scan-in:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
});

// ---------------------------------------------------------------------
// 6. SALIDA DE STOCK / VENTA (POST /scan-out)
// Resta de la tabla inventario
// ---------------------------------------------------------------------
// backend/routes/inventory.js (Solo la parte de scan-out)

// --- 6. REGISTRAR VENTA (Salida de Stock - POS) ---
router.post('/scan-out', authenticateToken, async (req, res) => {
    // 🟢 CAMBIO: Ahora recibimos 'precio_venta' desde el frontend (opcional)
    const { codigo_barras, cantidad = 1, precio_venta } = req.body;
    
    const userId = req.user ? req.user.userId : null; 
    const codigoLimpio = codigo_barras ? codigo_barras.trim() : '';

    try {
        await db.query('BEGIN');

        // 1. Verificar existencia y stock
        // Traemos el precio de la BD solo como referencia o respaldo
        const checkQuery = `
            SELECT i.producto_id, i.cantidad, p.precio_venta as precio_base, p.nombre
            FROM inventario i
            JOIN productos p ON i.producto_id = p.id
            WHERE p.codigo_barras = $1
        `;
        const check = await db.query(checkQuery, [codigoLimpio]);

        if (check.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: 'Producto no encontrado o sin stock.' });
        }

        const { producto_id, cantidad: stockActual, precio_base, nombre } = check.rows[0];

        if (stockActual < cantidad) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: `Stock insuficiente de ${nombre}. Disponible: ${stockActual}` });
        }

        // 2. Definir el precio final: Si enviaste uno (descuento), usa ese. Si no, usa el de la BD.
        const precioFinal = precio_venta ? parseFloat(precio_venta) : parseFloat(precio_base);

        // 3. Restar inventario
        const update = await db.query(
            'UPDATE inventario SET cantidad = cantidad - $1 WHERE producto_id = $2 RETURNING cantidad',
            [cantidad, producto_id]
        );

        // 4. Guardar historial con el PRECIO FINAL REAL
        if (userId) {
            const totalVenta = precioFinal * cantidad;
            await db.query(
                'INSERT INTO historial_ventas (producto_id, cantidad, precio_unitario, total_venta, user_id) VALUES ($1, $2, $3, $4, $5)',
                [producto_id, cantidad, precioFinal, totalVenta, userId]
            );
        }

        await db.query('COMMIT');
        res.json({ message: 'Venta registrada.', nueva_cantidad: update.rows[0].cantidad });

    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error en scan-out:', error);
        res.status(500).json({ error: 'Error interno al procesar venta.' });
    }
});

// ---------------------------------------------------------------------
// 7. ELIMINAR PRODUCTO (DELETE /products/:id)
// Protegido por checkAdminRole
// ---------------------------------------------------------------------
router.delete('/products/:id', authenticateToken, checkAdminRole, logActivity('Eliminación de Producto', 'productos'), async (req, res) => {
    const { id } = req.params;

    try {
        await db.query('BEGIN');
        // Primero borramos del inventario
        await db.query('DELETE FROM inventario WHERE producto_id = $1', [id]);
        // Luego borramos el producto
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
        
        if (error.code === '23503') {
            return res.status(400).json({ error: 'No se puede eliminar: El producto tiene historial de ventas.' });
        }
        res.status(500).json({ error: 'Error interno al eliminar.' });
    }
});

module.exports = router;