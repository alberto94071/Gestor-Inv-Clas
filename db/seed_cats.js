const { pool } = require('./db');

const run = async () => {
    try {
        console.log('Insertando categorías por defecto...');
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
            // Check if exists
            const exists = await pool.query('SELECT * FROM configuracion_categorias WHERE nombre = $1', [cat.nombre]);
            if (exists.rows.length === 0) {
                await pool.query(
                    'INSERT INTO configuracion_categorias (nombre, generos, tallas) VALUES ($1, $2, $3)',
                    [cat.nombre, cat.generos, cat.tallas]
                );
                console.log(`✅ Insertada: ${cat.nombre}`);
            } else {
                console.log(`⚠️ Ya existe: ${cat.nombre}`);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
};

run();
