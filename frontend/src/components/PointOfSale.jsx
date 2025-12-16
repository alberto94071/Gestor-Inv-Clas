// src/components/PointOfSale.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import API from '../api/axiosInstance'; 
import './Ticket.css';

// Función auxiliar fuera del componente para evitar errores de sintaxis
const formatCurrency = (amount) => {
    return `Q${Number(amount).toFixed(2)}`;
};

const PointOfSale = () => {
    // Definición correcta de estados
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    
    // Obtenemos el nombre del cajero
    const userName = localStorage.getItem('userName') || 'Cajero General';
    const inputRef = useRef(null);

    // Cálculos
    const total = cart.reduce((acc, item) => acc + (item.precio_venta * item.qty), 0);
    const grandTotal = total; 

    // 1. Cargar inventario al iniciar
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
                setError("Error al conectar con el inventario.");
            }
        };
        loadInventory();
        if(inputRef.current) inputRef.current.focus();
    }, []);

    // 2. Función de Impresión (Optimizada para Niimbot K3 - 80mm)
    const handlePrintTicket = () => {
        const ticketElement = document.getElementById('seccion-ticket');
        if (!ticketElement) return;

        const printWindow = window.open('', '_blank');
        
        // Estilos definidos como texto para evitar errores con Vite
        const styleTicket = `
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
        `;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Ticket - ${userName}</title>
                    ${styleTicket}
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

    // 3. Cobrar (Checkout)
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            
            // Procesar cada item
            for (const item of cart) {
                await API.post('/inventory/scan-out', {
                    codigo_barras: item.codigo_barras,
                    cantidad: item.qty
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            
            // Imprimir
            handlePrintTicket();

            setSuccessMsg("¡Venta registrada con éxito!");
            setCart([]); 
            
            // Recargar inventario para actualizar stocks
            const response = await API.get('/inventory/inventory', { headers: { Authorization: `Bearer ${token}` }});
            setInventory(response.data);

        } catch (err) {
            console.error("Error Checkout:", err);
            const msg = err.response?.data?.error || "Error al procesar la venta.";
            setError(msg);
        } finally {
            setLoading(false);
            if(inputRef.current) inputRef.current.focus();
        }
    };

    // 4. Atajos de teclado
    const handleKeyDown = (event) => {
        // Permitir escribir en otros inputs si no es el escáner
        if (document.activeElement !== inputRef.current && (document.activeElement.type === 'text' || document.activeElement.type === 'number')) {
            return;
        }

        if (event.key === 'F2') {
            event.preventDefault(); 
            if (inputRef.current) inputRef.current.focus();
        }
        if (event.key === 'F9') {
            event.preventDefault(); 
            handleCheckout(); 
        }
    };

    // 5. Lógica del Carrito
    const addProductToCart = (code) => {
        setError(null);
        setSuccessMsg(null);
        const product = inventory.find(p => p.codigo_barras === code);
        
        if (!product) { 
            setError("Producto no encontrado."); 
            return; 
        }
        if (product.cantidad <= 0) { 
            setError(`¡Sin stock de ${product.nombre}!`); 
            return; 
        }

        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (existingItem.qty + 1 > product.cantidad) { 
                setError(`Stock insuficiente (Máx: ${product.cantidad}).`); 
                return; 
            }
            setCart(cart.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));
    
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


    // --- RENDERIZADO ---
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
            
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50', flexShrink: 0 }}>
                🛒 Punto de Venta
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', pb: 1 }}>
                
                {/* 🟢 COLUMNA IZQUIERDA (Escáner y Lista Reciente) */}
                <Paper elevation={3} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TextField
                        inputRef={inputRef}
                        autoFocus fullWidth
                        label="Escanear Código de Barras (F2)" variant="outlined"
                        value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleScan}
                        sx={{ mb: 2 }}
                    />

                    {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
                    {successMsg && <Alert severity="success" sx={{ mb: 1 }}>{successMsg}</Alert>}
                    
                    <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1 }}>Productos en carrito:</Typography>
                    
                    {/* Lista visual rápida */}
                    <Box sx={{ mt: 1, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                        {cart.slice().reverse().map((item, index) => (
                            <Box key={index} sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.imagen_url} variant="rounded" sx={{ width: 40, height: 40 }}>{item.nombre.charAt(0)}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography fontWeight="bold" color="green">{item.nombre}</Typography>
                                    <Typography variant="caption">{item.marca} - {item.talla}</Typography>
                                </Box>
                                <Typography fontWeight="bold">{formatCurrency(item.precio_venta)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>

                {/* 🔵 COLUMNA DERECHA (Tabla Detallada y Totales) */}
                <Paper elevation={3} sx={{ p: 2, width: '45%', minWidth: '400px', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', overflow: 'hidden' }}>
                    <Typography variant="h6" sx={{ borderBottom: '1px solid #ccc', pb: 1, flexShrink: 0 }}>Detalle de Venta</Typography>

                    <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ bgcolor: '#f8f9fa' }}>Prod</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8f9fa' }}>Cant</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8f9fa' }}>Total</TableCell>
                                    <TableCell sx={{ bgcolor: '#f8f9fa' }}></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {cart.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar src={item.imagen_url} sx={{ width: 30, height: 30 }} />
                                                {item.nombre}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{item.qty}</TableCell>
                                        <TableCell>{formatCurrency(item.precio_venta * item.qty)}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {cart.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} align="center" sx={{ py: 5, color: '#aaa' }}>
                                            <ShoppingCartIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                                            <Typography>Carrito vacío</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Totales y Botón */}
                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '2px dashed #ccc', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h4" fontWeight="bold">TOTAL:</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">{formatCurrency(grandTotal)}</Typography>
                        </Box>
                        <Button 
                            variant="contained" 
                            color="success" 
                            fullWidth 
                            size="large" 
                            onClick={handleCheckout} 
                            disabled={loading || cart.length === 0} 
                            sx={{ py: 2, fontSize: '1.2rem' }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit"/> : 'COBRAR (F9)'}
                        </Button>
                    </Box>
                </Paper>
            </Box>

            {/* --- TICKET TÉRMICO OCULTO (Solo texto para imprimir rápido) --- */}
            <div id="seccion-ticket" style={{ display: 'none' }}>
                <div className="text-center">
                    <h2 style={{ margin: 0 }}>POTTER'S STORE</h2>
                    <p className="info-extra">San Pedro Sacatepéquez, Guate</p>
                    <div className="divider"></div>
                    <p className="info-extra">Atiende: {userName}</p>
                    <p className="info-extra">Ticket: #{Date.now().toString().slice(-6)}</p>
                    <p className="info-extra">{new Date().toLocaleString('es-GT')}</p>
                </div>
                
                <div className="divider"></div>
                
                <table>
                    <thead>
                        <tr>
                            <th align="left">DESC</th>
                            <th align="center">CANT</th>
                            <th align="right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cart.map((item) => (
                            <tr key={item.id}>
                                <td style={{fontSize: '11px'}}>{item.nombre.toUpperCase().substring(0, 15)}</td>
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
                </div>
            </div>
        </Box>
    );
};

export default PointOfSale;