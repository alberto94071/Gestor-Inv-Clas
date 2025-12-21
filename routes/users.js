// backend/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcrypt');
const authenticateToken = require('../middleware/auth');
const checkAdminRole = require('../middleware/adminMiddleware');
const logActivity = require('../middleware/logMiddleware');

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

// 2. REGISTRAR USUARIO
router.post('/register', 
    authenticateToken, 
    checkAdminRole, 
    (req, res, next) => {
        // Pasamos el nombre del nuevo usuario al log
        req.targetName = req.body.nombre;
        next();
    },
    logActivity('Registro de Nuevo Usuario', 'usuarios'),
    async (req, res) => {
        const { nombre, email, password, rol } = req.body;
        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const result = await db.query(
                'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
                [nombre, email, hashedPassword, rol || 'cajero']
            );
            return res.status(201).json({ message: "Usuario creado", usuario: result.rows[0] });
        } catch (err) {
            return res.status(500).json({ error: "Error al registrar" });
        }
    }
);

// 3. ACTUALIZAR USUARIO
router.put('/:id', 
    authenticateToken, 
    checkAdminRole, 
    async (req, res, next) => {
        // Buscamos el nombre actual antes de que se cambie para el log
        const user = await db.query('SELECT nombre FROM usuarios WHERE id = $1', [req.params.id]);
        req.targetName = user.rows[0]?.nombre || 'ID: ' + req.params.id;
        next();
    },
    logActivity('Edición de Usuario', 'usuarios'),
    async (req, res) => {
        const { id } = req.params;
        const { nombre, email, password, rol } = req.body;
        try {
            let query, params;
            if (password && password.trim() !== "") {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);
                query = 'UPDATE usuarios SET nombre=$1, email=$2, password_hash=$3, rol=$4 WHERE id=$5';
                params = [nombre, email, hashedPassword, rol, id];
            } else {
                query = 'UPDATE usuarios SET nombre=$1, email=$2, rol=$3 WHERE id=$4';
                params = [nombre, email, rol, id];
            }
            await db.query(query, params);
            return res.json({ message: "Usuario actualizado" });
        } catch (err) {
            return res.status(500).json({ error: "Error al actualizar" });
        }
    }
);

// 4. ELIMINAR USUARIO
router.delete('/:id', 
    authenticateToken, 
    checkAdminRole, 
    async (req, res, next) => {
        // Buscamos el nombre antes de borrarlo
        const user = await db.query('SELECT nombre FROM usuarios WHERE id = $1', [req.params.id]);
        req.targetName = user.rows[0]?.nombre || 'ID: ' + req.params.id;
        next();
    },
    logActivity('Eliminación de Usuario', 'usuarios'),
    async (req, res) => {
        try {
            await db.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
            return res.json({ message: "Usuario eliminado" });
        } catch (err) {
            return res.status(500).json({ error: "Error al eliminar" });
        }
    }
);

module.exports = router;