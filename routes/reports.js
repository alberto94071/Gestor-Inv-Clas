// gestor-inventario-ropa/routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const authenticateToken = require('../middleware/auth'); 
const checkAdminRole = require('../middleware/adminMiddleware');

// ---------------------------------------------------------------------
// 1. DASHBOARD STATS
// ---------------------------------------------------------------------
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        const ventasHoy = await db.query(`
            SELECT SUM(total_venta) as total 
            FROM historial_ventas 
            WHERE fecha_venta >= CURRENT_DATE
        `);

        const stockBajo = await db.query(`
            SELECT COUNT(*) as total 
            FROM inventario 
            WHERE cantidad < 5
        `);

        const ventasSemana = await db.query(`
            SELECT 
                TO_CHAR(fecha_venta, 'Dy') as name, 
                SUM(total_venta) as ventas
            FROM historial_ventas
            WHERE fecha_venta >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY 1, DATE_TRUNC('day', fecha_venta)
            ORDER BY DATE_TRUNC('day', fecha_venta) ASC
        `);

        res.json({
            ventasHoy: ventasHoy.rows[0].total || 0,
            stockBajo: stockBajo.rows[0].total || 0,
            grafica: ventasSemana.rows
        });

    } catch (error) {
        console.error('Error stats:', error);
        res.status(500).json({ error: 'Error estadísticas' });
    }
});

// ---------------------------------------------------------------------
// 2. HISTORIAL DE VENTAS COMPLETO (GET /history)
// CORREGIDO: Ahora incluye imagen, marca, código y fecha correcta.
// ---------------------------------------------------------------------
router.get('/history', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const query = `
            SELECT 
                h.id,
                h.cantidad,
                h.precio_unitario,
                h.total_venta,
                h.fecha_venta,  -- 🟢 IMPORTANTE: Enviamos la fecha pura para que React reste las 6 horas
                p.nombre as producto, -- 🟢 Alias 'producto' para que coincida con tu Frontend
                p.codigo_barras as codigo, -- 🟢 Alias 'codigo'
                p.imagen_url,   -- 🟢 NUEVO: Necesario para mostrar la foto
                p.marca,        -- 🟢 NUEVO: Necesario para mostrar la marca
                p.talla,        -- 🟢 NUEVO: Para mostrar talla
                p.color,        -- 🟢 NUEVO: Para mostrar color
                u.nombre AS vendedor      
            FROM historial_ventas h
            JOIN productos p ON h.producto_id = p.id
            JOIN usuarios u ON h.user_id = u.id 
            ORDER BY h.fecha_venta DESC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error historial:', error);
        res.status(500).json({ error: 'Error historial ventas' });
    }
});

// ---------------------------------------------------------------------
// 3. CONSULTAR LOG DE ACTIVIDAD
// ---------------------------------------------------------------------
router.get('/audit-log', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        // Asegúrate que la tabla se llame 'log_actividad' en tu BD
        const result = await db.query('SELECT * FROM log_actividad ORDER BY fecha_registro DESC LIMIT 100');
        res.json(result.rows);
    } catch (error) {
        console.error('Error audit:', error);
        res.status(500).json({ error: 'Error log auditoría' });
    }
});

module.exports = router;
