import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar, InputAdornment, Tooltip, Snackbar
} from '@mui/material';
import { 
    Delete, RemoveCircleOutline, AddCircleOutline, 
    ShoppingCart, Print, RemoveShoppingCart // Icono para cancelar
} from '@mui/icons-material';
import API from '../api/axiosInstance'; 

// Librerías para QR y Renderizado
import QRCode from 'react-qr-code';
import { createRoot } from 'react-dom/client';

// Helper moneda
const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

const PointOfSale = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    
    // Guardar última venta para re-imprimir
    const [lastSaleCart, setLastSaleCart] = useState(null);
    const [lastTicketId, setLastTicketId] = useState(null);

    const inputRef = useRef(null);

    // Total Dinámico
    const total = cart.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);

    // --- 1. CARGA INICIAL Y GESTIÓN DE MEMORIA ---
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

    // Al iniciar: Cargar Inventario + Recuperar Carrito Guardado + Fusionar lo nuevo
    useEffect(() => {
        loadInventory();
        focusInput();

        // A. Recuperar lo que ya tenías en el POS (Persistencia)
        const savedCart = localStorage.getItem('pos_persistent_cart');
        let finalCart = savedCart ? JSON.parse(savedCart) : [];

        // B. Revisar si vienen productos nuevos desde el Inventario (F3)
        const incomingTempCart = localStorage.getItem('pos_cart_temp');
        
        if (incomingTempCart) {
            try {
                const newItems = JSON.parse(incomingTempCart);
                if (Array.isArray(newItems) && newItems.length > 0) {
                    
                    // FUSIÓN INTELIGENTE:
                    newItems.forEach(newItem => {
                        const existingIndex = finalCart.findIndex(item => item.id === newItem.id);
                        if (existingIndex >= 0) {
                            // Si ya existe, sumamos la cantidad
                            finalCart[existingIndex].qty += newItem.qty;
                        } else {
                            // Si no existe, lo agregamos
                            finalCart.push(newItem);
                        }
                    });
                    
                    setSuccessMsg("Productos agregados desde el Inventario");
                    // Limpiamos la memoria temporal (F3), pero mantenemos la persistente
                    localStorage.removeItem('pos_cart_temp');
                }
            } catch (e) {
                console.error("Error al fusionar carritos", e);
            }
        }

        // Guardamos el resultado final en el estado
        setCart(finalCart);

    }, []);

    // --- 2. AUTO-GUARDADO (Persistencia) ---
    // Cada vez que cambies algo en el carrito, se guarda solo
    useEffect(() => {
        localStorage.setItem('pos_persistent_cart', JSON.stringify(cart));
    }, [cart]);

    const focusInput = () => {
        setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
    };

    // --- 3. LÓGICA DEL CARRITO ---

    const addProductToCart = (code) => {
        setError(null);
        setSuccessMsg(null);
        const product = inventory.find(p => p.codigo_barras === code);
        
        if (!product) { setError("Producto no encontrado."); return; }
        if (product.cantidad <= 0) { setError(`¡Sin stock de ${product.nombre}!`); return; }

        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
            updateQuantity(existingItem.id, existingItem.qty + 1, product.cantidad);
        } else {
            setCart([...cart, { ...product, qty: 1 }]);
        }
    };

    // Modificar cantidad con botones (+/-)
    const updateQuantity = (id, newQty, maxStock) => {
        if (newQty < 1) return;
        if (newQty > maxStock) { setError(`Stock insuficiente. Máx: ${maxStock}`); return; }
        setError(null);
        setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
        focusInput();
    };

    // Modificar precio (Descuentos)
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

    // 🟢 NUEVO: CANCELAR VENTA (LIMPIAR TODO)
    const handleCancelSale = () => {
        if (cart.length === 0) return;
        if (window.confirm("¿Estás seguro de cancelar esta venta y limpiar el carrito?")) {
            setCart([]); // Limpia visualmente
            localStorage.removeItem('pos_persistent_cart'); // Limpia memoria
            setSuccessMsg("Venta cancelada.");
            focusInput();
        }
    };

    // --- 4. PROCESAR VENTA ---
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
                    precio_venta: item.precio_venta 
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            
            const currentCart = [...cart];
            const ticketId = Date.now();
            
            setLastSaleCart(currentCart);
            setLastTicketId(ticketId);

            await handlePrintTicket(currentCart, ticketId);

            setSuccessMsg("¡Venta registrada con éxito!");
            
            // 🟢 Al cobrar con éxito, ahí sí limpiamos todo
            setCart([]); 
            localStorage.removeItem('pos_persistent_cart');
            loadInventory();

        } catch (err) {
            const msg = err.response?.data?.error || "Error al procesar la venta.";
            setError(msg);
        } finally {
            setLoading(false);
            focusInput();
        }
    };

    // --- 5. IMPRESIÓN (DISEÑO PDF) ---
    const handlePrintTicket = async (cartToPrint = cart, ticketId = Date.now()) => {
        if (!cartToPrint || cartToPrint.length === 0) return;

        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};

            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Permite ventanas emergentes para imprimir.");

            const totalPrint = cartToPrint.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);

            const html = `
                <html>
                <head>
                    <title>Ticket ${ticketId}</title>
                    <style>
                        @page { size: 80mm auto; margin: 0; }
                        body { width: 72mm; margin: 0 auto; padding: 5mm 2mm; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; }
                        .center { text-align: center; } .bold { font-weight: bold; }
                        .dashed-top { border-top: 1px dashed #000; } .dashed-bottom { border-bottom: 1px dashed #000; }
                        .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
                        th { text-align: left; border-bottom: 1px dashed #000; border-top: 1px dashed #000; padding: 5px 0; font-size: 11px; }
                        td { vertical-align: top; font-size: 11px; padding: 4px 0; }
                        .footer { margin-top: 15px; font-size: 10px; text-align: center; }
                        .qr-box { display: flex; justify-content: center; margin-top: 10px; }
                    </style>
                </head>
                <body>
                    <div class="center bold" style="font-size: 14px; margin-bottom: 5px;">${config.nombre_empresa || "POTTER'S STORE"}</div>
                    <div class="center">Comprobante de Compra</div>
                    <div class="center">Ticket ID: ${ticketId}</div>
                    <br/>
                    <div class="info-row"><span>Fecha: ${new Date().toLocaleDateString('es-GT')}</span></div>
                    <div class="info-row"><span>Hora: ${new Date().toLocaleTimeString('es-GT')}</span></div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 45%;">DESCRIPCIÓN</th>
                                <th style="width: 15%; text-align: center;">CANT.</th>
                                <th style="width: 20%; text-align: right;">P.UNIT</th>
                                <th style="width: 20%; text-align: right;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cartToPrint.map(item => `
                                <tr>
                                    <td>${item.nombre.toUpperCase()}</td>
                                    <td style="text-align: center;">${item.qty}</td>
                                    <td style="text-align: right;">Q${Number(item.precio_venta).toFixed(2)}</td>
                                    <td style="text-align: right;">Q${(item.precio_venta * item.qty).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <div class="dashed-top"></div>
                    <div style="margin-top: 5px;">
                        <div class="info-row bold" style="font-size: 13px;">
                            <span>TOTAL:</span>
                            <span>Q${totalPrint.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="dashed-bottom" style="margin-top: 5px;"></div>

                    <div class="footer">
                        ${config.mensaje_final || "¡Gracias por su compra!"}<br/>
                        ${config.direccion ? `Visitenos en ${config.direccion}` : ''}<br/>
                        ${config.whatsapp ? `Tel: ${config.whatsapp}` : ''}<br/>
                        ${config.instagram_url ? `IG: @${config.nombre_empresa}` : ''}
                        ${config.instagram_url ? '<div class="qr-box"><div id="qr-code"></div></div>' : ''}
                    </div>
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            if (config.instagram_url) {
                printWindow.onload = () => {
                    const container = printWindow.document.getElementById('qr-code');
                    if (container) {
                        const root = createRoot(container);
                        root.render(<QRCode value={config.instagram_url} size={80} />);
                    }
                    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 800);
                };
            } else {
                setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
            }

        } catch (e) {
            console.error(e);
            alert("No se pudo generar el ticket.");
        }
    };

    // Atajos de Teclado
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (document.activeElement.tagName === 'INPUT' && document.activeElement !== inputRef.current) return;
            if (event.key === 'F2') { event.preventDefault(); if (inputRef.current) inputRef.current.focus(); }
            if (event.key === 'F9') { event.preventDefault(); handleCheckout(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [cart]); 

    // --- INTERFAZ GRÁFICA ---
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    🛒 Punto de Venta
                </Typography>
                
                {lastSaleCart && (
                    <Button 
                        startIcon={<Print />} 
                        onClick={() => handlePrintTicket(lastSaleCart, lastTicketId)}
                        variant="outlined" size="small" color="secondary"
                    >
                        Re-imprimir Ticket
                    </Button>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', pb: 1 }}>
                
                {/* 🟢 COLUMNA IZQUIERDA: Escáner y Lista Resumen */}
                <Paper elevation={3} sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <TextField
                        inputRef={inputRef}
                        autoFocus fullWidth
                        label="Escanear Código (Enter o F2)" variant="outlined"
                        value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={handleScan}
                        sx={{ mb: 2 }}
                    />
                    
                    {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
                    {successMsg && <Alert severity="success" sx={{ mb: 1 }}>{successMsg}</Alert>}
                    
                    {/* Lista rápida visual (Sólo lectura) */}
                    <Box sx={{ mt: 1, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                        {cart.slice().reverse().map((item, index) => (
                            <Box key={index} sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.imagen_url} variant="rounded" sx={{ width: 40, height: 40 }}>{item.nombre.charAt(0)}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography fontWeight="bold" color="green">{item.nombre}</Typography>
                                    <Typography variant="caption" display="block">
                                        {item.qty} x Q{item.precio_venta}
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
                                        
                                        {/* CANTIDAD EDITABLE (+/-) */}
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

                                        {/* PRECIO EDITABLE */}
                                        <TableCell align="center">
                                            <TextField 
                                                type="number" variant="standard"
                                                value={item.precio_venta}
                                                onChange={(e) => updatePrice(item.id, e.target.value)}
                                                InputProps={{
                                                    startAdornment: <InputAdornment position="start" sx={{mr:0}}><Typography variant="caption">Q</Typography></InputAdornment>,
                                                    disableUnderline: true,
                                                    style: { fontWeight: 'bold', color: '#2e7d32', fontSize: '14px' }
                                                }}
                                                sx={{ width: '70px' }}
                                                onClick={(e) => e.target.select()}
                                            />
                                        </TableCell>

                                        <TableCell align="right">
                                            {formatCurrency(item.precio_venta * item.qty)}
                                        </TableCell>

                                        <TableCell>
                                            <Tooltip title="Eliminar del carrito">
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

                    {/* TOTALES Y ACCIONES */}
                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '2px dashed #ccc', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 2 }}>
                            <Typography variant="h4" fontWeight="bold">TOTAL:</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">{formatCurrency(total)}</Typography>
                        </Box>
                        
                        {/* Botón COBRAR */}
                        <Button 
                            variant="contained" color="success" fullWidth size="large" 
                            onClick={handleCheckout} disabled={loading || cart.length === 0} 
                            sx={{ py: 1.5, fontSize: '1.2rem', fontWeight: 'bold', mb: 1, boxShadow: 3 }}
                        >
                            {loading ? <CircularProgress size={28} color="inherit"/> : 'COBRAR (F9)'}
                        </Button>

                        {/* 🟢 Botón CANCELAR VENTA */}
                        <Button 
                            variant="outlined" color="error" fullWidth 
                            onClick={handleCancelSale} disabled={cart.length === 0}
                            startIcon={<RemoveShoppingCart />}
                            sx={{ fontWeight: 'bold', border: '2px solid' }}
                        >
                            CANCELAR VENTA
                        </Button>
                    </Box>
                </Paper>
            </Box>
        </Box>
    );
};

export default PointOfSale;