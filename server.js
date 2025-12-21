// server.js
const express = require('express');
const dotenv = require('dotenv');
const db = require('./db/db');
const cors = require('cors'); // ¡Asegúrate de haber ejecutado: npm install cors!
const reportRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users'); // <--- AGREGAR ESTO
// --- Cargar variables de entorno ---
dotenv.config();
const PORT = process.env.PORT || 3000;

// --- Inicializar la aplicación ---
const app = express();

// --- 1. Configuración de CORS ---
// Permite que el frontend (localhost:5173) acceda a esta API (localhost:3000)
app.use(cors({
    origin: 'https://gestor-inv-clas.pages.dev',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Middlewares ---
app.use(express.json()); // Permite a Express leer cuerpos JSON

// --- 2. Conexión a la Base de Datos ---
// La conexión real se prueba en db/db.js, pero aquí verificamos al iniciar
db.query('SELECT 1')
  .then(() => {
    console.log('✅ Conexión exitosa a PostgreSQL!');
  })
  .catch((err) => {
    console.error('❌ Error al conectar a PostgreSQL:', err);
    // Termina el proceso si no se puede conectar a la base de datos
    process.exit(1); 
  });


// --- 3. Rutas de la API ---
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');

// Aplicar las rutas con el prefijo /api
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/Users', usersRoutes); // <--- AGREGAR ESTO
// --- Manejo de la Raíz ---
app.get('/', (req, res) => {
    res.send('Servidor de Gestión de Inventario de Ropa (Backend activo)');
});

// --- 4. Iniciar el Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});