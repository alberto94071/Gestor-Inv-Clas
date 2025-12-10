// src/components/ScannerComponent.jsx
import React, { useState } from 'react';
import API from '../api/axiosInstance.js';

const ScannerComponent = ({ fetchInventory, getToken }) => {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async (type) => {
    // type puede ser 'scan-in' (entrada) o 'scan-out' (salida/venta)
    if (!codigoBarras) return;

    setLoading(true);
    setMensaje(null);
    
    try {
      const token = getToken();
      if (!token) throw new Error("No autenticado.");

      const response = await API.post(`/inventory/${type}`, {
        codigo_barras: codigoBarras,
        cantidad: 1, // Por simplicidad, siempre sumamos/restamos 1 por escaneo
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMensaje({ 
        text: response.data.message + ` Nueva Cantidad: ${response.data.nueva_cantidad}`, 
        type: 'success' 
      });
      
      setCodigoBarras('');
      
      // Actualiza la lista de inventario después del cambio
      fetchInventory(); 

    } catch (err) {
      const errorMsg = err.response?.data?.error || `Error de red al procesar el escaneo.`;
      setMensaje({ text: errorMsg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-interface" style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '20px', borderRadius: '5px' }}>
      <h3>🛒 Lector de Código de Barras (Simulación)</h3>
      <input
        type="text"
        placeholder="Escanea o escribe el Código de Barras"
        value={codigoBarras}
        onChange={(e) => setCodigoBarras(e.target.value)}
        disabled={loading}
        style={{ padding: '8px', marginRight: '10px', width: '300px' }}
      />
      
      <button 
        onClick={() => handleScan('scan-in')} 
        disabled={loading || !codigoBarras}
        style={{ backgroundColor: '#28a745', color: 'white', border: 'none', padding: '10px', marginRight: '5px', cursor: 'pointer' }}
      >
        ➕ Entrada (Añadir Stock)
      </button>
      
      <button 
        onClick={() => handleScan('scan-out')} 
        disabled={loading || !codigoBarras}
        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none', padding: '10px', cursor: 'pointer' }}
      >
        ➖ Salida (Vender)
      </button>

      {loading && <p style={{ marginTop: '10px' }}>Procesando...</p>}
      {mensaje && (
        <p style={{ color: mensaje.type === 'error' ? 'red' : 'green', marginTop: '10px', fontWeight: 'bold' }}>
          {mensaje.text}
        </p>
      )}
    </div>
  );
};

export default ScannerComponent;