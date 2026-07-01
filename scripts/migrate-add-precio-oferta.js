// scripts/migrate-add-precio-oferta.js
require('dotenv').config();
const db = require('../db/db');

async function run() {
    try {
        await db.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_oferta NUMERIC(10,2) NULL');
        console.log('✅ Columna precio_oferta agregada (o ya existía).');
    } catch (err) {
        console.error('❌ Error al migrar:', err);
        process.exitCode = 1;
    } finally {
        await db.pool.end();
    }
}

run();
