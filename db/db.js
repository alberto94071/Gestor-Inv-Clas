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

        // Insert default categories
        console.log('Verificando categorías por defecto...');
        const defaultCats = [
            {
                nombre: 'Playeras / Camisas',
                generos: '["Hombre", "Mujer", "Niño", "Niña", "Unisex"]',
                tallas: '{"Hombre": ["S", "M", "L", "XL"], "Mujer": ["XS", "S", "M", "L", "XL"], "Unisex": ["S", "M", "L"], "Niño": ["2", "4", "6", "8", "10", "12", "14"], "Niña": ["2", "4", "6", "8", "10", "12", "14"]}'
            },
            {
                nombre: 'Pantalones / Jeans',
                generos: '["Hombre", "Mujer", "Niño", "Niña"]',
                tallas: '{"Hombre": ["28", "30", "32", "34", "36", "38"], "Mujer": ["0", "2", "4", "6", "8", "10", "12"], "Niño": ["2", "4", "6", "8", "10", "12", "14"], "Niña": ["2", "4", "6", "8", "10", "12", "14"]}'
            },
            {
                nombre: 'Calzado / Tenis',
                generos: '["Hombre", "Mujer", "Niño", "Niña", "Unisex"]',
                tallas: '{"Hombre": ["38", "39", "40", "41", "42", "43", "44"], "Mujer": ["35", "36", "37", "38", "39", "40"], "Unisex": ["36", "37", "38", "39", "40"], "Niño": ["20", "22", "24", "26", "28", "30", "32"], "Niña": ["20", "22", "24", "26", "28", "30", "32"]}'
            },
            {
                nombre: 'Vestidos / Faldas',
                generos: '["Mujer", "Niña"]',
                tallas: '{"Mujer": ["XS", "S", "M", "L", "XL"], "Niña": ["2", "4", "6", "8", "10", "12", "14"]}'
            },
            {
                nombre: 'Sudaderas / Suéteres',
                generos: '["Hombre", "Mujer", "Niño", "Niña", "Unisex"]',
                tallas: '{"Hombre": ["S", "M", "L", "XL"], "Mujer": ["XS", "S", "M", "L", "XL"], "Unisex": ["S", "M", "L", "XL"], "Niño": ["4", "6", "8", "10", "12", "14"], "Niña": ["4", "6", "8", "10", "12", "14"]}'
            },
            {
                nombre: 'Accesorios',
                generos: '["Hombre", "Mujer", "Unisex"]',
                tallas: '{"Hombre": ["Unitalla"], "Mujer": ["Unitalla"], "Unisex": ["Unitalla"]}'
            }
        ];

        for (const cat of defaultCats) {
            const exists = await pool.query('SELECT 1 FROM configuracion_categorias WHERE nombre = $1', [cat.nombre]);
            if (exists.rows.length === 0) {
                await pool.query(
                    'INSERT INTO configuracion_categorias (nombre, generos, tallas) VALUES ($1, $2, $3)',
                    [cat.nombre, cat.generos, cat.tallas]
                );
            }
        }
        console.log('✅ Categorías por defecto verificadas/insertadas.');

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