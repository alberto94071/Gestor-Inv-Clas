// gestor-inventario-ropa/middleware/auth.js
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Extrae solo el TOKEN (después de 'Bearer ')
    const token = authHeader && authHeader.split(' ')[1]; 

    // 1. No hay token (401)
    if (token == null) {
        return res.status(401).json({ error: 'No hay token, permiso denegado.' });
    }

    // 2. Verificar el token
    // La línea que fallaba está dentro de esta función asíncrona:
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        // 3. Token Inválido o Expirado (403)
        if (err) {
            console.error("JWT Verification Error:", err.message);
            // Puede ser un error de expiración (JsonWebTokenError: jwt expired)
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }
        
        // 4. Token Válido: Adjuntar la información del usuario a la petición
        // Esto es la información que pusimos en el payload (id, rol, nombre)
        req.user = user; 
        
        // 5. Continuar a la ruta solicitada
        next();
    });
};

module.exports = authenticateToken;