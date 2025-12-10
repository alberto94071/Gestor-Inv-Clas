// gestor-inventario-ropa/middleware/logMiddleware.js
const db = require('../db/db');

/**
 * Middleware para registrar acciones importantes en la base de datos.
 * @param {string} accion - Descripción de la acción realizada (ej: 'Creacion de Producto').
 * @param {string} entidad_afectada - Tabla o recurso afectado (ej: 'productos').
 */
const logActivity = (accion, entidad_afectada) => {
    return async (req, res, next) => {
        // Asumimos que req.user tiene id, nombre y rol gracias a auth.js
        const { userId, nombre, rol } = req.user;
        
        try {
            await db.query(
                'INSERT INTO log_actividad (user_id, username, rol, accion, entidad_afectada) VALUES ($1, $2, $3, $4, $5)',
                [userId, nombre, rol, accion, entidad_afectada]
            );
        } catch (error) {
            console.error('Error al registrar actividad en el Log:', error);
            // El error del log no debe detener la ejecución de la ruta
        }
        
        next(); // Continuar con la ruta original
    };
};

module.exports = logActivity;