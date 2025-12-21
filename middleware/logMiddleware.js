// gestor-inventario-ropa/middleware/logMiddleware.js
const db = require('../db/db');

/**
 * Middleware para registrar acciones importantes en la base de datos.
 * @param {string} accionBase - Descripción de la acción base (ej: 'Creación de Producto').
 * @param {string} entidad_afectada - Tabla o recurso afectado (ej: 'productos').
 */
const logActivity = (accionBase, entidad_afectada) => {
    return async (req, res, next) => {
        // Interceptamos el final de la petición para asegurarnos de que la acción fue exitosa
        const originalSend = res.send;

        res.send = async function (body) {
            // Solo registramos si la respuesta es exitosa (códigos 200-299)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                    // Datos del administrador/usuario que realiza la acción
                    const { userId, nombre, rol } = req.user;

                    // 🟢 CAPTURAMOS EL DETALLE DINÁMICO
                    // Si en la ruta definimos req.logDetail (ej: el nombre del usuario borrado), lo usamos.
                    const detalle = req.logDetail ? `: ${req.logDetail}` : '';
                    const accionFinal = `${accionBase}${detalle}`;

                    await db.query(
                        'INSERT INTO log_actividad (user_id, username, rol, accion, entidad_afectada) VALUES ($1, $2, $3, $4, $5)',
                        [userId, nombre, rol, accionFinal, entidad_afectada]
                    );
                } catch (error) {
                    console.error('Error al registrar actividad en el Log:', error);
                }
            }
            // Volvemos a la función original para enviar la respuesta al cliente
            return originalSend.call(this, body);
        };

        next();
    };
};

module.exports = logActivity;