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
                setError("No se pudo cargar el inventario.");
            }
        };
        loadInventory();
        if(inputRef.current) inputRef.current.focus();
    }, []);

    // --- FUNCIÓN DE IMPRESIÓN CORREGIDA PARA EVITAR ERROR DE VITE ---
    const handlePrintTicket = () => {
        const ticketElement = document.getElementById('seccion-ticket');
        if (!ticketElement) return;

        const printWindow = window.open('', '_blank');
        
        // Definimos el CSS como texto plano para que Vite no se confunda con las llaves
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
            const serverMsg = err.response?.data?.error || "Error al procesar la venta.";
            setError(serverMsg);
        } finally {
            setLoading(false);
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
                        <Button variant="contained" color="success" fullWidth size="large" onClick={handleCheckout} disabled={cart.length === 0 || loading} sx={{ mt: 2 }}>
                            {loading ? <CircularProgress size={24} /> : 'COBRAR (F9)'}
                        </Button>
                    </Box>
                </Paper>
            </Box>

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