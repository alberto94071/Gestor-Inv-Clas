import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar, InputAdornment, Tooltip
} from '@mui/material';
import { 
    Delete, RemoveCircleOutline, AddCircleOutline, 
    ShoppingCart, Print 
} from '@mui/icons-material';
import API from '../api/axiosInstance'; 

// Librerías para el QR y renderizado del ticket
import QRCode from 'react-qr-code';
import { createRoot } from 'react-dom/client';

// Función para formatear dinero
const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

const PointOfSale = () => {
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    
    // Estado para guardar la última venta y permitir re-impresión
    const [lastSaleCart, setLastSaleCart] = useState(null);

    const inputRef = useRef(null);

    // Calculamos el total dinámico (Precio Modificado * Cantidad)
    const total = cart.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);

    // --- 1. CARGA INICIAL ---
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
        focusInput();
    }, []);

    const focusInput = () => {
        setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
        }, 100);
    };

    // --- 2. LÓGICA DEL CARRITO ---

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
            updateQuantity(existingItem.id, existingItem.qty + 1, product.cantidad);
        } else {
            // Agregamos usando el precio original de base
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    // 🟢 CAMBIAR CANTIDAD (+ / -)
    const updateQuantity = (id, newQty, maxStock) => {
        if (newQty < 1) return;
        if (newQty > maxStock) {
            setError(`Stock insuficiente. Máx: ${maxStock}`);
            return;
        }
        setError(null);
        setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
        focusInput();
    };

    // 🟢 CAMBIAR PRECIO (Descuentos)
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

    // --- 3. PROCESAR VENTA ---
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            
            // Enviar cada ítem al backend con su precio final y cantidad
            for (const item of cart) {
                await API.post('/inventory/scan-out', {
                    codigo_barras: item.codigo_barras,
                    cantidad: item.qty,
                    precio_venta: item.precio_venta 
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            
            // Guardamos esta venta como "última" para re-imprimir
            const currentCart = [...cart];
            setLastSaleCart(currentCart);

            // Imprimir
            await handlePrintTicket(currentCart);

            setSuccessMsg("¡Venta registrada con éxito!");
            setCart([]); 
            loadInventory(); // Recargar stock actualizado

        } catch (err) {
            const msg = err.response?.data?.error || "Error al procesar la venta.";
            setError(msg);
        } finally {
            setLoading(false);
            focusInput();
        }
    };

    // --- 4. IMPRESIÓN PROFESIONAL (Ticket Configurable) ---
    const handlePrintTicket = async (cartToPrint = cart) => {
        if (!cartToPrint || cartToPrint.length === 0) return;

        try {
            const token = localStorage.getItem('authToken');
            // Obtener configuración (Logo, Papel, Mensaje)
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};

            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert("Permite ventanas emergentes para imprimir.");
                return;
            }

            // Detectar tipo de papel
            const tipoPapel = config.tipo_papel || '80mm';
            const isStandard = tipoPapel === 'carta' || tipoPapel === 'oficio';

            // Calcular total del carrito a imprimir
            const totalPrint = cartToPrint.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);

            // CSS Dinámico
            const css = `
                @page { 
                    size: ${tipoPapel === 'oficio' ? 'legal' : (tipoPapel === 'carta' ? 'letter' : '80mm auto')}; 
                    margin: ${isStandard ? '1.5cm' : '0'}; 
                }
                body { 
                    width: ${isStandard ? '100%' : '72mm'}; 
                    margin: 0 auto; 
                    padding: ${isStandard ? '0' : '5mm'}; 
                    font-family: 'Courier New', monospace; 
                    font-size: ${isStandard ? '14px' : '12px'};
                    color: #000;
                }
                .header { text-align: center; margin-bottom: 15px; }
                .logo { max-width: ${isStandard ? '120px' : '60px'}; display: block; margin: 0 auto 5px auto; }
                .title { font-size: 1.2em; font-weight: bold; margin: 5px 0; }
                .info { font-size: 0.9em; margin: 2px 0; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; border-bottom: 1px dashed #000; }
                th { border-bottom: 1px dashed #000; text-align: left; padding: 5px 0; }
                td { padding: 5px 0; vertical-align: top; }
                
                .totals { margin-top: 10px; text-align: right; }
                .total-line { font-size: 1.2em; font-weight: bold; margin-top: 5px; }
                
                .footer { margin-top: 20px; text-align: center; font-size: 0.9em; }
                .qr-container { display: flex; justify-content: center; margin-top: 15px; }
            `;

            const html = `
                <html>
                <head><title>Ticket de Venta</title><style>${css}</style></head>
                <body>
                    <div class="header">
                        ${config.logo_url ? `<img src="${config.logo_url}" class="logo" />` : ''}
                        <div class="title">${config.nombre_empresa || "Mi Tienda"}</div>
                        <div class="info">${config.direccion || ""}</div>
                        <div class="info">WhatsApp: ${config.whatsapp || "---"}</div>
                        <div class="info">${new Date().toLocaleString()}</div>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Desc</th>
                                <th align="center">Cant</th>
                                <th align="right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cartToPrint.map(item => `
                                <tr>
                                    <td>
                                        ${item.nombre} <br/>
                                        <small>${item.marca} - ${item.talla}</small>
                                    </td>
                                    <td align="center">${item.qty}</td>
                                    <td align="right">Q${(item.precio_venta * item.qty).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="totals">
                        <div class="total-line">TOTAL: Q${totalPrint.toFixed(2)}</div>
                    </div>

                    <div class="footer">
                        <p>${config.mensaje_final || "¡Gracias por su compra!"}</p>
                        ${config.instagram_url ? '<div id="qr-code"></div>' : ''}
                        ${config.instagram_url ? '<p style="font-size:10px">¡Síguenos en Instagram!</p>' : ''}
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            // Renderizar QR (React en ventana externa)
            if (config.instagram_url) {
                printWindow.onload = () => {
                    const container = printWindow.document.getElementById('qr-code');
                    if (container) {
                        const root = createRoot(container);
                        root.render(<QRCode value={config.instagram_url} size={isStandard ? 100 : 80} />);
                    }
                    // Esperar un poco a que el QR se pinte antes de imprimir
                    setTimeout(() => {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    }, 800);
                };
            } else {
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }

        } catch (e) {
            console.error(e);
            alert("No se pudo generar el ticket.");
        }
    };

    // Atajos de teclado
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Evitar conflictos si se está escribiendo el precio
            if (document.activeElement.tagName === 'INPUT' && document.activeElement !== inputRef.current) return;

            if (event.key === 'F2') { event.preventDefault(); if (inputRef.current) inputRef.current.focus(); }
            if (event.key === 'F9') { event.preventDefault(); handleCheckout(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]); 


    // --- RENDERIZADO ---
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    🛒 Punto de Venta
                </Typography>
                {lastSaleCart && (
                    <Button 
                        startIcon={<Print />} 
                        onClick={() => handlePrintTicket(lastSaleCart)}
                        variant="outlined" size="small"
                    >
                        Re-imprimir Último
                    </Button>
                )}
            </Box>

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
                    
                    {/* Lista rápida visual */}
                    <Box sx={{ mt: 1, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                        {cart.slice().reverse().map((item, index) => (
                            <Box key={index} sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.imagen_url} variant="rounded" sx={{ width: 40, height: 40 }}>{item.nombre.charAt(0)}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography fontWeight="bold" color="green">{item.nombre}</Typography>
                                    <Typography variant="caption">
                                        {item.qty} x {formatCurrency(item.precio_venta)}
                                    </Typography>
                                </Box>
                                <Typography fontWeight="bold">{formatCurrency(item.precio_venta * item.qty)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>

                {/* 🔵 COLUMNA DERECHA: Tabla Editable */}
                <Paper elevation={3} sx={{ p: 2, width: '55%', minWidth: '550px', display: 'flex', flexDirection: 'column', bgcolor: '#f8f9fa', overflow: 'hidden' }}>
                    <Typography variant="h6" sx={{ borderBottom: '1px solid #ccc', pb: 1, flexShrink: 0 }}>Detalle de Venta</Typography>

                    <TableContainer sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        <Table size="small" stickyHeader>
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold' }}>Cant.</TableCell>
                                    <TableCell align="center" sx={{ fontWeight: 'bold', width: '100px' }}>Precio</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {cart.map((item) => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Avatar src={item.imagen_url} sx={{ width: 30, height: 30 }} />
                                                <Box>
                                                    <Typography variant="body2" fontWeight="bold">{item.nombre}</Typography>
                                                    <Typography variant="caption" color="textSecondary">{item.marca} - {item.talla}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        
                                        {/* 1. CANTIDAD EDITABLE (+/-) */}
                                        <TableCell align="center">
                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                <IconButton size="small" onClick={() => updateQuantity(item.id, item.qty - 1, item.cantidad)} color="primary">
                                                    <RemoveCircleOutline />
                                                </IconButton>
                                                <Typography sx={{ mx: 1, fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.qty}</Typography>
                                                <IconButton size="small" onClick={() => updateQuantity(item.id, item.qty + 1, item.cantidad)} color="primary">
                                                    <AddCircleOutline />
                                                </IconButton>
                                            </Box>
                                        </TableCell>

                                        {/* 2. PRECIO EDITABLE (Descuentos) */}
                                        <TableCell align="center">
                                            <TextField 
                                                type="number" 
                                                variant="standard"
                                                value={item.precio_venta}
                                                onChange={(e) => updatePrice(item.id, e.target.value)}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start" sx={{mr:0}}><Typography variant="caption">Q</Typography></InputAdornment>,
                                                    disableUnderline: true,
                                                    style: { fontWeight: 'bold', color: '#2e7d32', fontSize: '14px' }
                                                }}
                                                sx={{ width: '70px' }}
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatCurrency(item.precio_venta * item.qty)}
                                        </TableCell>

                                        <TableCell>
                                            <Tooltip title="Quitar">
                                                <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}>
                                                    <Delete />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {cart.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: '#aaa' }}>
                                            <ShoppingCart sx={{ fontSize: 50, opacity: 0.3 }} />
                                            <Typography>Carrito vacío. Escanea productos.</Typography>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* TOTALES */}
                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '2px dashed #ccc', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 2 }}>
                            <Typography variant="h4" fontWeight="bold">TOTAL:</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">{formatCurrency(total)}</Typography>
                        </Box>
                        <Button 
                            variant="contained" color="success" fullWidth size="large" 
                            onClick={handleCheckout} disabled={loading || cart.length === 0} 
                            sx={{ py: 2, fontSize: '1.4rem', fontWeight: 'bold', boxShadow: 3 }}
                        >
                            {loading ? <CircularProgress size={28} color="inherit"/> : 'COBRAR (F9)'}
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default PointOfSale;