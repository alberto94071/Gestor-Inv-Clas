// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const authenticateToken = require('../middleware/auth');
const checkAdminRole = require('../middleware/adminMiddleware');

// 🟢 NOTA: Aquí debe ser solo '/' 
// Porque en server.js ya le pusimos el prefijo '/api/users'
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Consultamos a la tabla 'usuarios' (como mencionaste antes)
        const result = await db.query('SELECT id, nombre, email, rol FROM usuarios ORDER BY id DESC');
        return res.json(result.rows);
    } catch (err) {
        console.error("Error en GET /users:", err);
        return res.status(500).json({ error: "Error al obtener usuarios de la base de datos" });
    }
});

// Ruta para registrar (sería /api/users/register)
router.post('/register', authenticateToken, checkAdminRole, async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    try {
        // Aquí iría tu lógica de bcrypt y el INSERT en la tabla usuarios
        // ...
        return res.status(201).json({ message: "Usuario creado" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// Ruta para eliminar (sería /api/users/:id)
router.delete('/:id', authenticateToken, checkAdminRole, async (req, res) => {
    try {
        await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        return res.json({ message: "Usuario eliminado" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;