const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/auth');
const checkAdminRole = require('../middleware/adminMiddleware');

// 1. OBTENER USUARIOS
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, nombre, email, rol FROM usuarios ORDER BY id DESC'
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener usuarios:", err.message);
        return res.status(500).json({ error: "Error al obtener la lista" });
    }
});

// 2. REGISTRAR USUARIO (POST)
router.post('/register', authenticateToken, checkAdminRole, async (req, res) => {
    const { nombre, email, password, rol } = req.body;
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Datos incompletos" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 🟢 CORRECCIÓN: Usamos 'password_hash' en lugar de 'password'
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, hashedPassword, rol || 'cajero']
        );

        return res.status(201).json({ message: "Usuario creado", usuario: result.rows[0] });
    } catch (err) {
        console.error("Error al registrar:", err.message);
        return res.status(500).json({ error: "Error al registrar usuario" });
    }
});

// 3. ACTUALIZAR USUARIO (PUT)
router.put('/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;

    try {
        let query;
        let params;

        if (password && password.trim() !== "") {
            // Si el admin envía contraseña nueva, la encriptamos
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            // 🟢 CORRECCIÓN: Actualizamos la columna 'password_hash'
            query = 'UPDATE usuarios SET nombre=$1, email=$2, password_hash=$3, rol=$4 WHERE id=$5';
            params = [nombre, email, hashedPassword, rol, id];
        } else {
            // Si no hay contraseña nueva, solo actualizamos los demás datos
            query = 'UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4';
            params = [nombre, email, rol, id];
        }

        const result = await db.query(query, params);
        if (result.rowCount === 0) return res.status(404).json({ error: "Usuario no encontrado" });

        return res.json({ message: "Usuario actualizado correctamente" });
    } catch (err) {
        console.error("Error al actualizar:", err.message);
        return res.status(500).json({ error: "No se pudo actualizar la contraseña", detalle: err.message });
    }
});

// 4. ELIMINAR USUARIO
router.delete('/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM usuarios WHERE id = $1', [id]);
        return res.json({ message: "Usuario eliminado" });
    } catch (err) {
        return res.status(500).json({ error: "Error al eliminar" });
    }
});

module.exports = router;