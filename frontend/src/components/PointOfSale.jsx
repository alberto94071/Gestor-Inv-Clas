// src/components/PointOfSale.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import API from '../api/axiosInstance'; 
import './Ticket.css';

const formatCurrency = (amount) => {
    return `Q${Number(amount).toFixed(2)}`;
};

const PointOfSale = () => {
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    
    // Obtenemos el nombre del cajero desde el almacenamiento local
    const userName = localStorage.getItem('userName') || 'Cajero General';
    const inputRef = useRef(null);

    const total = cart.reduce((acc, item) => acc + (item.precio_venta * item.qty), 0);
    const grandTotal = total; 

    useEffect(() => {
        const loadInventory = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await API.get('/inventory/inventory', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInventory(response.data);
            } catch (err) {
                console.error("Error cargando inventario POS:", err);
                setError("No se pudo cargar el inventario. Verifique conexión.");
            }
        };
        loadInventory();
        if(inputRef.current) inputRef.current.focus();
    }, []);

    // 2. Función para generar el PDF (Recibo POTTER'S STORE)
    const generateReceipt = (saleDetails, total) => {
        
        // --- DATOS DEL NEGOCIO ---
        const BUSINESS_NAME = "POTTER'S STORE";
        const LOGO_URL = 'data:image/jpeg;base64,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'; // 🛑 Pega la URL de tu logo aquí 🛑
        const CONTACT_INFO = '6a Av. 1-41 Zona 2, URBANA, SAN PEDRO SACATEPEQUEZ  | Tel: 5555-5555 | IG: @POTTER\'S STORE';
        // ---------------------------------------------
        
        const currentDate = new Date().toLocaleDateString();
        const currentTime = new Date().toLocaleTimeString();
        
        let receiptContent = `
            <div style="font-family: Arial, sans-serif; padding: 20px; width: 100%; box-sizing: border-box;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">
                    <div style="text-align: left;">
                        <img src="${LOGO_URL}" alt="Logo" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover;">
                    </div>
                    <div style="text-align: right;">
                        <h2 style="margin: 0; color: #2c3e50;">${BUSINESS_NAME}</h2>
                        <p style="margin: 5px 0 0 0; font-size: 12px; color: #7f8c8d;">Recibo de Venta Oficial</p>
                    </div>
                </div>

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket - ${userName}</title>
                    <style>
                        @page { size: 80mm auto; margin: 0; }
                        body { 
                            width: 72mm; 
                            margin: 0 auto; 
                            padding: 3mm; 
                            font-family: 'Courier New', Courier, monospace;
                            font-size: 13px;
                            color: #000;
                        }
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .divider { border-top: 1px dashed #000; margin: 6px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                        th { border-bottom: 1px solid #000; font-size: 11px; }
                        td { padding: 3px 0; }
                        .info-extra { font-size: 11px; margin-bottom: 2px; }
                        .total-label { font-size: 16px; font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${ticketElement.innerHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    // 3. Cobrar (Checkout) - MEJORADO
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            
            for (const item of cart) {
                await API.post('/inventory/scan-out', {
                    codigo_barras: item.codigo_barras,
                    cantidad: item.qty
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            
            handlePrintTicket();

            setSuccessMsg("¡Venta completada!");
            setCart([]); 
            
            const response = await API.get('/inventory/inventory', { headers: { Authorization: `Bearer ${token}` }});
            setInventory(response.data);

        } catch (err) {
            console.error("Error Checkout:", err);
            // 🛑 AQUÍ ESTÁ EL CAMBIO CLAVE: Capturamos el mensaje real del backend
            const serverMsg = err.response?.data?.error || "Error al procesar la venta. Verifique conexión.";
            setError(serverMsg);
        } finally {
            setLoading(false);
            // Enfocar de nuevo para seguir vendiendo
            if(inputRef.current) inputRef.current.focus();
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'F2') {
            event.preventDefault(); 
            if (inputRef.current) inputRef.current.focus();
        }
        if (event.key === 'F9') {
            event.preventDefault(); 
            handleCheckout(); 
        }
    };

    const addProductToCart = (code) => {
        setError(null);
        const product = inventory.find(p => p.codigo_barras === code);
        if (!product) { setError("Producto no encontrado."); return; }
        if (product.cantidad <= 0) { setError(`¡Sin stock de ${product.nombre}!`); return; }

        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            if (existingItem.qty + 1 > product.cantidad) { setError(`Stock insuficiente.`); return; }
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const handleScan = (e) => {
        if (e.key === 'Enter') {
            addProductToCart(barcode);
            setBarcode(''); 
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart, inventory, loading]); 

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                🛒 POS Potter's Store
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden' }}>
                
                {/* INTERFAZ POS */}
                <Paper elevation={3} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <TextField
                        inputRef={inputRef}
                        autoFocus fullWidth
                        label="Escanear Producto..."
                        value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleScan}
                        sx={{ mb: 2 }}
                    />
                    {error && <Alert severity="error">{error}</Alert>}
                    {successMsg && <Alert severity="success">{successMsg}</Alert>}
                    
                    <Box sx={{ mt: 2, flexGrow: 1, overflowY: 'auto' }}>
                        {cart.slice().reverse().map((item, index) => (
                            <Box key={index} sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
                                <Typography>{item.nombre}</Typography>
                                <Typography fontWeight="bold">{formatCurrency(item.precio_venta)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>

                {/* TICKET EN PANTALLA */}
                <Paper elevation={3} sx={{ p: 2, width: '400px', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa' }}>
                    <TableContainer sx={{ flexGrow: 1 }}>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Prod</TableCell><TableCell>Cant</TableCell><TableCell>Total</TableCell><TableCell></TableCell></TableRow></TableHead>
                            <TableBody>
                                {cart.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>{item.nombre}</TableCell>
                                        <TableCell>{item.qty}</TableCell>
                                        <TableCell>{formatCurrency(item.precio_venta * item.qty)}</TableCell>
                                        <TableCell><IconButton color="error" onClick={() => setCart(cart.filter(i => i.id !== item.id))}><DeleteIcon/></IconButton></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h5" align="right">Total: {formatCurrency(grandTotal)}</Typography>
                        <Button variant="contained" color="success" fullWidth size="large" onClick={handleCheckout} disabled={cart.length === 0} sx={{ mt: 2 }}>COBRAR (F9)</Button>
                    </Box>
                </Paper>
            </Box>

            {/* TICKET FÍSICO OCULTO */}
            <div id="seccion-ticket" style={{ display: 'none' }}>
                <div className="text-center">
                    <h2 style={{ margin: 0 }}>POTTER'S STORE</h2>
                    <p className="info-extra">San Pedro Sacatepéquez, Guate</p>
                    <div className="divider"></div>
                    <p className="info-extra">Atendido por: {userName}</p>
                    <p className="info-extra">Ticket: #{Date.now().toString().slice(-6)}</p>
                    <p className="info-extra">{new Date().toLocaleString('es-GT')}</p>
                </div>
                
                <div className="divider"></div>
                
                <table>
                    <thead>
                        <tr>
                            <th align="left">PRODUCTO</th>
                            <th align="center">CANT</th>
                            <th align="right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item) => (
                            <tr key={item.id}>
                                <td style={{fontSize: '11px'}}>{item.nombre.toUpperCase()}</td>
                                <td align="center">{item.qty}</td>
                                <td align="right">Q{(item.precio_venta * item.qty).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                <div className="divider"></div>
                
                <div className="text-right total-label">
                    TOTAL: {formatCurrency(grandTotal)}
                </div>
                
                <div className="text-center" style={{ marginTop: '15px', fontSize: '10px' }}>
                    <p>*** ¡Gracias por su compra! ***</p>
                    <p>No se aceptan cambios sin ticket</p>
                </div>
            </div>
        </Box>
    );
};

export default PointOfSale;