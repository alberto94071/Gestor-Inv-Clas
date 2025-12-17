// src/components/PointOfSale.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar, InputAdornment
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
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
    
    const userName = localStorage.getItem('userName') || 'Cajero General';
    const inputRef = useRef(null);

    // Calculamos el total dinámicamente basado en precio modificado y cantidad
    const total = cart.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);

    // 1. Cargar inventario
    const loadInventory = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await API.get('/inventory/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInventory(response.data);
        } catch (err) {
            console.error(err);
            setError("Error al conectar con el inventario.");
        }
    };

    useEffect(() => {
        loadInventory();
        if(inputRef.current) inputRef.current.focus();
    }, []);

    // 2. Lógica del Carrito

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
            // Si ya existe, solo sumamos 1 (validando stock)
            updateQuantity(existingItem.id, existingItem.qty + 1, product.cantidad);
        } else {
            // Si es nuevo, lo agregamos con su precio original
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    // 🟢 NUEVA FUNCIÓN: Actualizar Cantidad (+ / -)
    const updateQuantity = (id, newQty, maxStock) => {
        if (newQty < 1) return; // No bajar de 1
        if (newQty > maxStock) {
            setError(`Solo hay ${maxStock} unidades disponibles.`);
            return;
        }
        setError(null);
        setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
    };

    // 🟢 NUEVA FUNCIÓN: Modificar Precio (Descuento manual)
    const updatePrice = (id, newPrice) => {
        setCart(cart.map(item => item.id === id ? { ...item, precio_venta: newPrice } : item));
    };

    const removeFromCart = (id) => setCart(cart.filter(item => item.id !== id));
    
    const handleScan = (e) => {
        if (e.key === 'Enter') {
            addProductToCart(barcode.trim());
            setBarcode(''); 
        }
    };

    // 3. Cobrar
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            
            for (const item of cart) {
                await API.post('/inventory/scan-out', {
                    codigo_barras: item.codigo_barras,
                    cantidad: item.qty,
                    precio_venta: item.precio_venta // Enviamos el precio (quizás modificado)
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            
            handlePrintTicket();
            setSuccessMsg("¡Venta registrada!");
            setCart([]); 
            loadInventory(); // Recargar stocks

        } catch (err) {
            const msg = err.response?.data?.error || "Error al procesar la venta.";
            setError(msg);
        } finally {
            setLoading(false);
            setTimeout(() => {
                if(inputRef.current) inputRef.current.focus();
            }, 100);
        }
    };

    // 4. Impresión
    const handlePrintTicket = () => {
        const ticketElement = document.getElementById('seccion-ticket');
        if (!ticketElement) return;
        const printWindow = window.open('', '_blank');
        const styleTicket = `
            <style>
                @page { size: 80mm auto; margin: 0; }
                body { width: 72mm; margin: 0 auto; padding: 3mm; font-family: 'Courier New', monospace; font-size: 13px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .divider { border-top: 1px dashed #000; margin: 6px 0; }
                table { width: 100%; border-collapse: collapse; }
                td { padding: 2px 0; }
                .total-label { font-size: 16px; font-weight: bold; }
            </style>
        `;
        printWindow.document.write(`<html><head><title>Ticket</title>${styleTicket}</head><body>${ticketElement.innerHTML}</body></html>`);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    };

    // Atajos de teclado (F2 y F9)
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (document.activeElement !== inputRef.current && 
               (document.activeElement.tagName === 'INPUT' && document.activeElement.type !== 'checkbox')) {
                return; // Si está editando precio, no capturar F2/F9 globalmente
            }
            if (event.key === 'F2') { event.preventDefault(); if (inputRef.current) inputRef.current.focus(); }
            if (event.key === 'F9') { event.preventDefault(); handleCheckout(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]); 

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50', flexShrink: 0 }}>
                🛒 Punto de Venta
            </Typography>

            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', pb: 1 }}>
                
                {/* 🟢 COLUMNA IZQUIERDA: Escáner y Resumen */}
                <Paper elevation={3} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TextField
                        inputRef={inputRef}
                        autoFocus fullWidth
                        label="Escanear Código (F2)" variant="outlined"
                        value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleScan}
                        sx={{ mb: 2 }}
                    />
                    {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
                    {successMsg && <Alert severity="success" sx={{ mb: 1 }}>{successMsg}</Alert>}
                    
                    <Box sx={{ mt: 1, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                        {cart.slice().reverse().map((item, index) => (
                            <Box key={index} sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.imagen_url} variant="rounded" sx={{ width: 40, height: 40 }}>{item.nombre.charAt(0)}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography fontWeight="bold" color="green">{item.nombre}</Typography>
                                    <Typography variant="caption">Cant: {item.qty} | Precio Final: Q{item.precio_venta}</Typography>
                                </Box>
                                <Typography fontWeight="bold">{formatCurrency(item.precio_venta * item.qty)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>

                {/* 🔵 COLUMNA DERECHA: Tabla Editable */}
                <Paper elevation={3} sx={{ p: 2, width: '55%', minWidth: '500px', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', overflow: 'hidden' }}>
                    <Typography variant="h6" sx={{ borderBottom: '1px solid #ccc', pb: 1, flexShrink: 0 }}>Detalle de Venta</Typography>

                    <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cant.</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: '100px' }}>Precio Unit.</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {cart.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar src={item.imagen_url} sx={{ width: 30, height: 30 }} />
                                                <Typography variant="body2">{item.nombre}</Typography>
                                            </Box>
                                        </TableCell>
                                        
                                        {/* 🟢 CANTIDAD CON BOTONES */}
                                        <TableCell align="center">
                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                <IconButton size="small" onClick={() => updateQuantity(item.id, item.qty - 1, item.cantidad)}>
                                                    <RemoveCircleOutlineIcon fontSize="small" />
                                                </IconButton>
                                                <Typography sx={{ mx: 1, fontWeight: 'bold' }}>{item.qty}</Typography>
                                                <IconButton size="small" onClick={() => updateQuantity(item.id, item.qty + 1, item.cantidad)}>
                                                    <AddCircleOutlineIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </TableCell>

                                        {/* 🟢 PRECIO EDITABLE */}
                                        <TableCell align="center">
                                            <TextField 
                                                type="number" 
                                                variant="standard"
                                                value={item.precio_venta}
                                                onChange={(e) => updatePrice(item.id, e.target.value)}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start">Q</InputAdornment>,
                                                    disableUnderline: true,
                                                    style: { fontWeight: 'bold', color: '#2e7d32', width: '80px' }
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatCurrency(item.precio_venta * item.qty)}
                                        </TableCell>

                                        <TableCell>
                                            <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '2px dashed #ccc', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                            <Typography variant="h4" fontWeight="bold">TOTAL:</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">{formatCurrency(total)}</Typography>
                        </Box>
                        <Button 
                            variant="contained" color="success" fullWidth size="large" 
                            onClick={handleCheckout} disabled={loading || cart.length === 0} 
                            sx={{ py: 2, fontSize: '1.2rem' }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit"/> : 'COBRAR (F9)'}
                        </Button>
                    </Box>
                </Paper>
            </Box>

            {/* Ticket Térmico */}
            <div id="seccion-ticket" style={{ display: 'none' }}>
                <div className="text-center">
                    <h2 style={{ margin: 0 }}>POTTER'S STORE</h2>
                    <div className="divider"></div>
                    <p>Atiende: {userName}</p>
                    <p>{new Date().toLocaleString('es-GT')}</p>
                </div>
                <div className="divider"></div>
                <table>
                    <thead><tr><th align="left">DESC</th><th align="center">CANT</th><th align="right">SUB</th></tr></thead>
                    <tbody>
                        {cart.map((item) => (
                            <tr key={item.id}>
                                <td style={{fontSize: '11px'}}>
                                    {item.nombre.toUpperCase().substring(0, 15)}
                                    {/* Mostrar si hubo descuento */}
                                    <br/><span style={{fontSize:'9px'}}>@ Q{Number(item.precio_venta).toFixed(2)}</span>
                                </td>
                                <td align="center">{item.qty}</td>
                                <td align="right">Q{(item.precio_venta * item.qty).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="divider"></div>
                <div className="text-right total-label">TOTAL: {formatCurrency(total)}</div>
                <div className="text-center" style={{ marginTop: '15px' }}><p>*** Gracias por su compra ***</p></div>
            </div>
        </Box>
    );
};

export default PointOfSale;