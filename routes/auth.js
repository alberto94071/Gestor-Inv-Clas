// gestor-inventario-ropa/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Usamos bcryptjs para la encriptación
const db = require('../db/db');

// Ruta para el inicio de sesión
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. Buscar el usuario por email
        // 🛑 CRÍTICO: Usamos 'usuarios' aquí para coincidir con el nombre de tu tabla
        const result = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const user = result.rows[0];

        // 2. Verificar la contraseña encriptada
        const match = await bcrypt.compare(password, user.password_hash);
        
        if (!match) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 3. Generar el Token de Acceso (JWT)
        // 🛑 CRÍTICO: Incluimos el 'rol' y el 'nombre' en el token (payload)
        const token = jwt.sign(
            { 
                userId: user.id, 
                rol: user.rol, 
                nombre: user.nombre 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' } // El token expira en 1 hora
        );
        
        // 4. Enviar el token y los datos del usuario de vuelta al Frontend
        res.json({ 
            token, 
            user: { 
                id: user.id,
                nombre: user.nombre, 
                rol: user.rol 
            } 
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor durante la autenticación.' });
    }
});

module.exports = router;