// gestor-inventario-ropa/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 
const db = require('../db/db');

// ---------------------------------------------------------------------
// INICIO DE SESIÓN (POST /login)
// ---------------------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validación básica
    if (!email || !password) {
        return res.status(400).json({ error: 'Por favor ingrese email y contraseña.' });
    }

    try {
        // 1. Buscar el usuario
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = result.rows[0];

        // 🛑 CORRECCIÓN CRÍTICA AQUÍ:
        // En la base de datos la columna se llama 'password', no 'password_hash'
        if (!user.password) {
            console.error("Error: El usuario existe pero no tiene contraseña en BD");
            return res.status(500).json({ error: 'Error de integridad de datos.' });
        }

        // 2. Verificar la contraseña
        const match = await bcrypt.compare(password, user.password);
        
        if (!match) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 3. Generar Token (JWT)
        const token = jwt.sign(
            { 
                userId: user.id,   
                rol: user.rol,     
                nombre: user.nombre 
            }, 
            process.env.JWT_SECRET || 'secreto_temporal', // Fallback por seguridad 
            { expiresIn: '12h' }
        );
        
        // 4. Respuesta
        res.json({ 
            token, 
            user: { 
                id: user.id,
                nombre: user.nombre, 
                rol: user.rol,       
                email: user.email
            } 
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

// ---------------------------------------------------------------------
// REGISTRO DE USUARIO (POST /register) - ¡NUEVO!
// Úsalo para crear tu primer Admin en Neon
// ---------------------------------------------------------------------
router.post('/register', async (req, res) => {
    const { nombre, email, password, rol } = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    try {
        // 1. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);

        // 2. Insertar en Neon
        const result = await db.query(
            'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
            [nombre, email, hash, rol || 'usuario']
        );

        res.status(201).json({ message: "Usuario creado exitosamente", user: result.rows[0] });

    } catch (error) {
        console.error("Error en registro:", error);
        if (error.code === '23505') { // Código de error PostgreSQL para "Unique violation"
            return res.status(400).json({ error: "El email ya está registrado" });
        }
        res.status(500).json({ error: "Error al crear usuario" });
    }
});

module.exports = router;
