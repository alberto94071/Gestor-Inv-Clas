// gestor-inventario-ropa/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); // Asegúrate de tener instalado bcryptjs
const db = require('../db/db');

// ---------------------------------------------------------------------
// INICIO DE SESIÓN (POST /login)
// ---------------------------------------------------------------------
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Validación básica de entrada
    if (!email || !password) {
        return res.status(400).json({ error: 'Por favor ingrese email y contraseña.' });
    }

    try {
        // 1. Buscar el usuario en la base de datos
        // Usamos la tabla 'usuarios' (en español)
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
        // 🛑 CRÍTICO: Usamos la clave 'userId' para que coincida con lo que espera inventory.js
        const token = jwt.sign(
            { 
                userId: user.id,   // <--- ESTO ARREGLA LA VENTA
                rol: user.rol,     // <--- ESTO SIRVE PARA LOS PERMISOS
                nombre: user.nombre 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '12h' } // Token válido por 12 horas
        );
        
        // 4. Enviar respuesta al Frontend
        // Enviamos el usuario explícitamente para guardarlo en localStorage (para el botón eliminar)
        res.json({ 
            token, 
            user: { 
                id: user.id,
                nombre: user.nombre, 
                rol: user.rol,      // <--- ESTO HACE APARECER EL BOTÓN ELIMINAR
                email: user.email
            } 
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor durante la autenticación.' });
    }
});

module.exports = router;