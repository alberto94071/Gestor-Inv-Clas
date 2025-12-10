// gestor-inventario-ropa/utils/barcodeGenerator.js

const { customAlphabet } = require('nanoid');

// Crea un generador de IDs de 12 dígitos usando solo números
// EAN-13 requiere 13 dígitos, pero generamos 12 únicos y el checksum lo calcula el lector o el software.
const nanoid = customAlphabet('0123456789', 12); 

const generateUniqueBarcode = () => {
    return nanoid();
};

module.exports = { generateUniqueBarcode };