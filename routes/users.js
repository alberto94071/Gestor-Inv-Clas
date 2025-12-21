const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/auth');
const checkAdminRole = require('../middleware/adminMiddleware');

// 1. OBTENER TODOS LOS USUARIOS (GET /api/users)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // 🟢 CORRECCIÓN: Eliminamos 'fecha_creacion' de la consulta
        const result = await db.query(
            'SELECT id, nombre, email, rol FROM usuarios ORDER BY id DESC'
        );
        return res.json(result.rows);
    } catch (err) {
        console.error("Error al obtener usuarios:", err.message);
        return res.status(500).json({ 
            error: "Error al obtener la lista de usuarios",
            detalle: err.message 
        });
    }
});

// 2. REGISTRAR NUEVO USUARIO (POST /api/users/register)
router.post('/register', authenticateToken, checkAdminRole, async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Nombre, email y contraseña son obligatorios" });
    }

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 🟢 Insertamos solo las columnas que sabemos que existen
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, hashedPassword, rol || 'cajero']
        );

        return res.status(201).json({ 
            message: "Usuario creado exitosamente", 
            usuario: result.rows[0] 
        });
    } catch (err) {
        console.error("Error al registrar usuario:", err);
        if (err.code === '23505') {
            return res.status(400).json({ error: "El correo electrónico ya está registrado" });
        }
        return res.status(500).json({ error: "Error interno al registrar usuario" });
    }
});

// 3. ACTUALIZAR USUARIO (PUT /api/users/:id)
// backend/routes/users.js

router.put('/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    const { nombre, email, password, rol } = req.body;

    try {
        let query;
        let params;

        // Si se envió una contraseña (no está vacía), la encriptamos y actualizamos
        if (password && password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            
            query = 'UPDATE usuarios SET nombre=$1, email=$2, password=$3, rol=$4 WHERE id=$5';
            params = [nombre, email, hashedPassword, rol, id];
        } else {
            // Si no se envió contraseña, actualizamos solo lo demás
            query = 'UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4';
            params = [nombre, email, rol, id];
        }

        const result = await db.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuario no encontrado en la base de datos." });
        }

        return res.json({ message: "Usuario actualizado correctamente" });

    } catch (err) {
        console.error("Error al actualizar usuario:", err.message);
        return res.status(500).json({ error: "Error interno del servidor", detalle: err.message });
    }
});

// 4. ELIMINAR USUARIO (DELETE /api/users/:id)
router.delete('/:id', authenticateToken, checkAdminRole, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        return res.json({ message: "Usuario eliminado correctamente" });
    } catch (err) {
        console.error("Error al eliminar usuario:", err);
        return res.status(500).json({ error: "Error interno al eliminar usuario" });
    }
});

module.exports = router;