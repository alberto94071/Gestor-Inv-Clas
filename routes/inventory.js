const express = require('express');
const router = express.Router();
const db = require('../db'); // Asegúrate que esta ruta apunte a tu conexión de BD
const authenticateToken = require('../middleware/authMiddleware'); // O '../middleware/auth' según tu estructura

// --- 1. OBTENER INVENTARIO COMPLETO ---
router.get('/inventory', authenticateToken, async (req, res) => {
    try {
        // Ordenamos por ID descendente para ver los nuevos primero
        const result = await db.query('SELECT * FROM productos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al obtener inventario" });
    }
});

// --- 2. CREAR PRODUCTO (Corregido: Imagen opcional) ---
router.post('/products', authenticateToken, async (req, res) => {
    // 🟢 CORRECCIÓN AQUÍ: Agregamos 'imagen_url' al destructuring para evitar el ReferenceError
    const { nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url } = req.body;

    // Validación básica
    if (!nombre || !precio_venta) {
        return res.status(400).json({ error: "Nombre y Precio son obligatorios" });
    }

    try {
        await db.query('BEGIN');

        // Generar código automático si viene vacío
        let finalCode = codigo_barras;
        if (!finalCode || finalCode.trim() === '') {
            finalCode = `GEN-${Date.now().toString().slice(-6)}`;
        }

        // Insertar en la base de datos
        // Usamos (imagen_url || null) para permitir que se guarde sin foto
        const result = await db.query(
            `INSERT INTO productos 
            (nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url, cantidad) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0) RETURNING id`,
            [nombre, marca, descripcion, precio_venta, talla, color, finalCode, imagen_url || null]
        );

        await db.query('COMMIT');
        res.status(201).json({ 
            message: "Producto registrado exitosamente", 
            id: result.rows[0].id,
            codigo: finalCode
        });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error("Error al crear producto:", err);
        // Manejo de error de código duplicado
        if (err.code === '23505') { 
            return res.status(400).json({ error: "El código de barras ya existe." });
        }
        res.status(500).json({ error: "Error interno del servidor" });
    }
});

// --- 3. EDITAR PRODUCTO (PUT) ---
router.put('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { nombre, marca, descripcion, precio_venta, talla, color, codigo_barras, imagen_url } = req.body;

    try {
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

// --- 4. ELIMINAR PRODUCTO ---
router.delete('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM productos WHERE id = $1', [id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }
        res.json({ message: "Producto eliminado correctamente" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "No se pudo eliminar el producto" });
    }
});

// --- 5. SUMAR STOCK (Ingreso de Mercadería) ---
router.post('/add-stock', authenticateToken, async (req, res) => {
    const { producto_id, cantidad } = req.body;

    if (!producto_id || !cantidad || cantidad <= 0) {
        return res.status(400).json({ error: "Datos inválidos para sumar stock" });
    }

    try {
        const result = await db.query(
            'UPDATE productos SET cantidad = cantidad + $1 WHERE id = $2 RETURNING *',
            [cantidad, producto_id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        res.json({ message: "Stock actualizado", nuevo_stock: result.rows[0].cantidad });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Error al actualizar stock" });
    }
});

// --- 6. REGISTRAR VENTA (Salida de Stock - POS) ---
router.post('/scan-out', authenticateToken, async (req, res) => {
    const { codigo_barras, cantidad } = req.body;
    
    try {
        await db.query('BEGIN');

        // 1. Verificar existencia y stock
        const check = await db.query('SELECT id, cantidad, nombre FROM productos WHERE codigo_barras = $1', [codigo_barras]);
        
        if (check.rows.length === 0) {
            await db.query('ROLLBACK');
            return res.status(404).json({ error: "Producto no encontrado" });
        }

        const producto = check.rows[0];

        if (producto.cantidad < cantidad) {
            await db.query('ROLLBACK');
            return res.status(400).json({ error: `Stock insuficiente de ${producto.nombre}. Disponible: ${producto.cantidad}` });
        }

        // 2. Restar inventario
        await db.query('UPDATE productos SET cantidad = cantidad - $1 WHERE id = $2', [cantidad, producto.id]);

        // 3. (Opcional) Guardar en historial de ventas aquí si tienes la tabla 'ventas'

        await db.query('COMMIT');
        res.json({ message: "Venta registrada" });

    } catch (err) {
        await db.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: "Error al procesar la venta" });
    }
});

module.exports = router;