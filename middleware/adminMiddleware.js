// gestor-inventario-ropa/middleware/adminMiddleware.js

// 🛑 IMPORTANTE: Este middleware ASUME que el rol ya fue cargado en req.user 
// por el middleware 'auth.js'.

const checkAdminRole = (req, res, next) => {
    // Si el usuario no está logueado, auth.js ya lo bloquearía (401/403)
    if (req.user && req.user.rol === 'admin') {
        next(); // Es admin, continúa
    } else {
        res.status(403).json({ error: 'Acceso denegado. Solo administradores pueden realizar esta acción.' });
    }
};

module.exports = checkAdminRole;