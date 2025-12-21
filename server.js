const express = require('express');
const dotenv = require('dotenv');
const db = require('./db/db');
const cors = require('cors'); 
const reportRoutes = require('./routes/reports');
const usersRoutes = require('./routes/users'); // Importación de rutas de usuarios

// --- Cargar variables de entorno ---
dotenv.config();
const PORT = process.env.PORT || 3000;

// --- Inicializar la aplicación ---
const app = express();

// --- 1. Configuración de CORS ---
app.use(cors({
    origin: 'https://gestor-inv-clas.pages.dev',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- Middlewares ---
app.use(express.json()); 

// --- 2. Conexión a la Base de Datos ---
db.query('SELECT 1')
  .then(() => {
    console.log('✅ Conexión exitosa a PostgreSQL!');
  })
  .catch((err) => {
    console.error('❌ Error al conectar a PostgreSQL:', err);
    process.exit(1); 
  });


// --- 3. Rutas de la API ---
const authRoutes = require('./routes/auth');
const inventoryRoutes = require('./routes/inventory');

// Aplicar las rutas con el prefijo /api
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);

// 🟢 CORRECCIÓN AQUÍ: Cambiamos 'Users' (mayúscula) por 'users' (minúscula)
// Esto debe coincidir exactamente con lo que pide tu frontend
app.use('/api/users', usersRoutes); 

// --- Manejo de la Raíz ---
app.get('/', (req, res) => {
    res.send('Servidor de Gestión de Inventario de Ropa (Backend activo)');
});

// --- 4. Iniciar el Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor Express corriendo en el puerto: ${PORT}`);
});