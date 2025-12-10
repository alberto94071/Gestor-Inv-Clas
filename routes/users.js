// gestor-inventario-ropa/routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../db/db');
const bcrypt = require('bcryptjs');
const authenticateToken = require('../middleware/auth'); // Usamos el middleware
const checkAdminRole = require('../middleware/adminMiddleware');
const logActivity = require('../middleware/logMiddleware')
// ---------------------------------------------------------------------
// 1. REGISTRAR UN NUEVO USUARIO (SÓLO ADMIN)
// ---------------------------------------------------------------------
// REGISTRAR USUARIO (SÓLO ADMIN)
router.post('/register', authenticateToken, checkAdminRole, logActivity('Registro de Empleado', 'usuarios'), async (req, res) => { 
    // Nota: Deberíamos chequear el rol del usuario que hace la petición (req.user.rol === 'admin')
    // Pero por simplicidad, permitiremos el registro por ahora.
    
    const { nombre, email, password, rol = 'cajero' } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    try {
        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Guardar en DB
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password_hash, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, password_hash, rol]
        );

        res.status(201).json({ 
            message: 'Usuario registrado con éxito.', 
            user: result.rows[0] 
        });

    } catch (error) {
        if (error.code === '23505') { // Código de error de duplicado de Postgres
            return res.status(409).json({ error: 'Este correo electrónico ya está registrado.' });
        }
        console.error('Error al registrar usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;