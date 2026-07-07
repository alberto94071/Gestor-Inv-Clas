// db/db.js
// db/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Detectamos si estamos en producción (Render) verificando si existe la variable DATABASE_URL
const isProduction = !!process.env.DATABASE_URL;

const connectionConfig = {
    // 1. Prioridad: Usar la URL completa de conexión que nos da Render
    connectionString: process.env.DATABASE_URL,
    
    // 2. SSL: Obligatorio para Render, pero lo desactivamos en local para evitar errores
    ssl: isProduction ? { rejectUnauthorized: false } : false,

    // 3. Respaldo (Fallback): Si no hay connectionString, usa tus variables locales
    // (PostgreSQL ignora esto si connectionString está presente)
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
};

const pool = new Pool(connectionConfig);

const runMigrations = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracion_categorias (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                generos JSONB NOT NULL DEFAULT '[]',
                tallas JSONB NOT NULL DEFAULT '{}'
            );
        `);
        
        await pool.query(`
            ALTER TABLE productos 
            ADD COLUMN IF NOT EXISTS categoria VARCHAR(100) DEFAULT 'Sin Categoría',
            ADD COLUMN IF NOT EXISTS genero VARCHAR(50) DEFAULT 'General';
        `);
        console.log('✅ Migraciones de base de datos verificadas y ejecutadas.');
    } catch (err) {
        console.error('❌ Error ejecutando migraciones automáticas:', err);
    }
};

pool.connect((err, client, release) => {
    if (err) {
        return console.error('❌ Error al adquirir cliente de base de datos:', err.stack);
    }
    console.log('✅ Conexión exitosa a PostgreSQL!');
    if (isProduction) {
        console.log('✅ Modo: Producción (Render)');
    } else {
        console.log('✅ Modo: Local');
    }
    runMigrations();
    release(); 
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
};