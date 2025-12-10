// gestor-inventario-ropa/routes/reports.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const authenticateToken = require('../middleware/auth'); 
const checkAdminRole = require('../middleware/adminMiddleware'); // Middleware para restringir a solo Admin

// ---------------------------------------------------------------------
// 1. DASHBOARD STATS (GET /dashboard-stats)
// Permite que CAJERO y ADMIN vean las ventas de hoy y la gráfica semanal.
// ---------------------------------------------------------------------
router.get('/dashboard-stats', authenticateToken, async (req, res) => {
    try {
        // 1. Ventas de Hoy
        const ventasHoy = await db.query(`
            SELECT SUM(total_venta) as total 
            FROM historial_ventas 
            WHERE fecha_venta >= CURRENT_DATE
        `);

        // 2. Productos con Stock Bajo (Menos de 5 unidades)
        const stockBajo = await db.query(`
            SELECT COUNT(*) as total 
            FROM inventario 
            WHERE cantidad < 5
        `);

        // 3. Gráfica: Ventas de los últimos 7 días
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
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
});

// ---------------------------------------------------------------------
// 2. HISTORIAL DE VENTAS COMPLETO (GET /history)
// RUTA PROTEGIDA: SÓLO ADMIN. Incluye el nombre del vendedor.
// ---------------------------------------------------------------------
router.get('/history', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const query = `
            SELECT 
                h.id,
                h.cantidad,
                h.precio_unitario,
                h.total_venta,
                TO_CHAR(h.fecha_venta, 'DD-MM-YYYY HH24:MI') as fecha,
                p.nombre ,   
                p.codigo_barras,
                u.nombre AS nombre_vendedor     
            FROM historial_ventas h
            JOIN productos p ON h.producto_id = p.id
            JOIN usuarios u ON h.user_id = u.id 
            ORDER BY h.fecha_venta DESC;
        `;
        const result = await db.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener historial de ventas:', error);
        res.status(500).json({ error: 'Error al obtener el historial de ventas' });
    }
});

// ---------------------------------------------------------------------
// 3. CONSULTAR LOG DE ACTIVIDAD (SÓLO ADMIN)
// ---------------------------------------------------------------------
router.get('/audit-log', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM log_actividad ORDER BY fecha_registro DESC');
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener el Log de Auditoría:', error);
        res.status(500).json({ error: 'Error al obtener el Log de Auditoría' });
    }
});


module.exports = router;