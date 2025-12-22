import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar, InputAdornment, Tooltip
} from '@mui/material';
import { 
    Delete, RemoveCircleOutline, AddCircleOutline, 
    ShoppingCart, Print, RemoveShoppingCart 
} from '@mui/icons-material';
import API from '../api/axiosInstance'; 

// Helper moneda
const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

// URLs de iconos (Usamos imágenes directas para asegurar que salgan en la impresión)
const ICON_TIKTOK = "https://cdn-icons-png.flaticon.com/512/3046/3046121.png";
const ICON_FB = "https://cdn-icons-png.flaticon.com/512/124/124010.png";
const ICON_IG = "https://cdn-icons-png.flaticon.com/512/2111/2111463.png";
const ICON_WP = "https://cdn-icons-png.flaticon.com/512/733/733585.png";

const PointOfSale = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const [ticketConfig, setTicketConfig] = useState({}); // Nuevo estado para config
    
    // Guardar última venta
    const [lastSaleCart, setLastSaleCart] = useState(null);
    const [lastTicketId, setLastTicketId] = useState(null);

    const inputRef = useRef(null);

    // Obtener usuario actual
    const currentUser = localStorage.getItem('userName') || 'Cajero';

    // Total Dinámico
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

    // Nueva función para cargar la config del ticket al inicio
    const fetchTicketConfig = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            setTicketConfig(res.data || {});
        } catch (e) { console.error("Error cargando config ticket", e); }
    };

    useEffect(() => {
        loadInventory();
        fetchTicketConfig(); // Cargamos configuración
        focusInput();
        
        // Lógica de carrito persistente
        const savedCart = localStorage.getItem('pos_persistent_cart');
        let finalCart = savedCart ? JSON.parse(savedCart) : [];

        const incomingTempCart = localStorage.getItem('pos_cart_temp');
        if (incomingTempCart) {
            try {
                const newItems = JSON.parse(incomingTempCart);
                if (Array.isArray(newItems) && newItems.length > 0) {
                    newItems.forEach(newItem => {
                        const existingIndex = finalCart.findIndex(item => item.id === newItem.id);
                        if (existingIndex >= 0) {
                            finalCart[existingIndex].qty += newItem.qty;
                        } else {
                            finalCart.push(newItem);
                        }
                    });
                    setSuccessMsg("Productos agregados desde el Inventario");
                    localStorage.removeItem('pos_cart_temp');
                }
            } catch (e) { console.error(e); }
        }
        setCart(finalCart);
    }, []);

    useEffect(() => {
        localStorage.setItem('pos_persistent_cart', JSON.stringify(cart));
    }, [cart]);

    const focusInput = () => {
        setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
    };

    // --- LÓGICA DE CARRITO ---
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

    const updateQuantity = (id, newQty, maxStock) => {
        if (newQty < 1) return;
        if (newQty > maxStock) { setError(`Stock insuficiente. Máx: ${maxStock}`); return; }
        setError(null);
        setCart(cart.map(item => item.id === id ? { ...item, qty: newQty } : item));
        focusInput();
    };

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

    const handleCancelSale = () => {
        if (cart.length === 0) return;
        if (window.confirm("¿Estás seguro de cancelar esta venta?")) {
            setCart([]);
            localStorage.removeItem('pos_persistent_cart');
            setSuccessMsg("Venta cancelada.");
            focusInput();
        }
    };

    // --- PROCESAR VENTA ---
    const handleCheckout = async () => {
        if (cart.length === 0) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('authToken');
            
            // Mantenemos tu bucle original para asegurar compatibilidad
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

            // Imprimir automáticamente pasando el usuario actual
            await handlePrintTicket(currentCart, ticketId, currentUser);

            setSuccessMsg("¡Venta registrada con éxito!");
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

    // --- IMPRESIÓN (MEJORADA Y DEFINITIVA) ---
    const handlePrintTicket = async (cartToPrint = cart, ticketId = Date.now(), vendedorName = currentUser) => {
        if (!cartToPrint || cartToPrint.length === 0) return;

        try {
            // Usamos el estado ticketConfig que ya cargamos al inicio (más rápido)
            const config = ticketConfig; 
            const esCarta = (config.tipo_papel || '').toLowerCase() === 'carta';
            
            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Permite ventanas emergentes para imprimir.");

            const totalPrint = cartToPrint.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);
            const fechaActual = new Date();

            const qrUrl = config.instagram_url 
                ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.instagram_url)}`
                : '';

            // ================= ESTILOS 80MM (PROFESIONAL) =================
            const estilos80mm = `
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { 
                        width: 72mm; margin: 0 auto; padding: 5px 2px; 
                        font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; 
                    }
                    .center { text-align: center; } 
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
                    
                    /* Logo ajustado */
                    #logo-img { display: block; margin: 5px auto; width: 40mm; height: auto; object-fit: contain; }
                    
                    /* Redes Sociales y QR Mini */
                    .socials-container { margin-top: 10px; padding-top: 5px; border-top: 1px dotted #000; }
                    .social-item-mini { display: flex; align-items: center; justify-content: center; margin-bottom: 3px; font-size: 10px; }
                    .social-icon-mini { width: 14px; height: 14px; margin-right: 5px; }
                    .qr-mini { width: 35mm; height: 35mm; margin: 5px auto 0 auto; display: block; }
                    .wp-icon { width: 12px; height: 12px; vertical-align: middle; margin-right: 4px; }
                    
                    /* Tabla */
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; margin-bottom: 5px; font-size: 11px; }
                    th { text-align: left; border-bottom: 1px dashed #000; padding: 3px 0; }
                    td { vertical-align: top; padding: 3px 0; }
                </style>
            `;

            const contenido80mm = `
                <div class="center">
                    ${config.logo_url ? `<img id="logo-img" src="${config.logo_url}" alt="LOGO" />` : ''}
                    <div class="bold" style="font-size: 15px; margin-top: 5px;">${config.nombre_empresa || "POTTER'S STORE"}</div>
                    <div style="font-size: 10px; margin-top: 4px;">${config.direccion || ''}</div>
                    ${config.whatsapp ? `<div style="font-size: 10px; margin-top: 2px;"><img src="${ICON_WP}" class="wp-icon"/>${config.whatsapp}</div>` : ''}
                </div>

                <div class="divider"></div>
                <div class="info-row"><span>FECHA:</span> <span>${fechaActual.toLocaleDateString()}</span></div>
                <div class="info-row"><span>HORA:</span> <span>${fechaActual.toLocaleTimeString()}</span></div>
                <div class="info-row"><span>REF:</span> <span>REF-${ticketId.toString().slice(-6)}</span></div>
                <div class="info-row bold"><span>VENDEDOR:</span> <span>${vendedorName}</span></div>

                <div class="divider"></div>
                <table>
                    <thead><tr><th align="left">PROD</th><th align="center">CANT</th><th align="right">TOTAL</th></tr></thead>
                    <tbody>
                        ${cartToPrint.map(item => `
                            <tr>
                                <td>${item.nombre.substring(0,18)}</td>
                                <td align="center">${item.qty}</td>
                                <td align="right">Q${(Number(item.precio_venta) * item.qty).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="divider"></div>
                <div class="info-row bold" style="font-size: 14px; margin-top: 5px;"><span>TOTAL:</span> <span>Q${totalPrint.toFixed(2)}</span></div>
                
                <div class="socials-container center">
                    <div class="bold" style="font-size: 11px; margin-bottom: 4px;">¡SÍGUENOS!</div>
                    <div class="social-item-mini"><img src="${ICON_IG}" class="social-icon-mini"/> <span>@potters_store_</span></div>
                    <div class="social-item-mini"><img src="${ICON_FB}" class="social-icon-mini"/> <span>Potter's store</span></div>
                    <div class="social-item-mini"><img src="${ICON_TIKTOK}" class="social-icon-mini"/> <span>@potters_store</span></div>
                    
                    ${qrUrl ? `<div style="margin-top: 8px;"><img src="${qrUrl}" class="qr-mini"/><div style="font-size: 9px;">Escanea para Instagram</div></div>` : ''}
                </div>

                <div class="divider"></div>
                <div class="center bold" style="margin-top: 10px; font-size: 12px;">${config.mensaje_final || "¡GRACIAS!"}</div>
            `;

            // ================= ESTILOS CARTA (Resumido para POS) =================
            const estilosCarta = `<style>body{font-family:sans-serif;padding:20px;} .header{display:flex;justify-content:space-between;border-bottom:2px solid #000;}</style>`;
            const contenidoCarta = `
                <div class="header"><h1>Recibo de Venta</h1></div>
                <p><strong>Vendedor:</strong> ${vendedorName}</p>
                <p><strong>Fecha:</strong> ${fechaActual.toLocaleString()}</p>
                <table style="width:100%; margin-top:20px;">
                    <thead><tr><th align="left">Producto</th><th>Cant.</th><th align="right">Total</th></tr></thead>
                    <tbody>
                        ${cartToPrint.map(item => `<tr><td>${item.nombre}</td><td align="center">${item.qty}</td><td align="right">Q${(item.precio_venta * item.qty).toFixed(2)}</td></tr>`).join('')}
                    </tbody>
                </table>
                <h2 style="text-align:right;">Total: Q${totalPrint.toFixed(2)}</h2>
            `;

            // INYECCIÓN HTML
            const html = `<html><head><title>Ticket ${ticketId}</title><style>${esCarta ? estilosCarta : estilos80mm}</style></head><body>${esCarta ? contenidoCarta : contenido80mm}</body></html>`;

            printWindow.document.write(html);
            printWindow.document.close();

            // Espera de imágenes (Logo + QR)
            const logoEl = printWindow.document.getElementById('logo-img');
            if (!esCarta && logoEl && config.logo_url) {
                logoEl.onload = () => { printWindow.focus(); printWindow.print(); printWindow.close(); };
                logoEl.onerror = () => { printWindow.print(); printWindow.close(); };
                setTimeout(() => { if (!printWindow.closed) { printWindow.print(); printWindow.close(); } }, 2000);
            } else {
                setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 800);
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
                        onClick={() => handlePrintTicket(lastSaleCart, lastTicketId, currentUser)}
                        variant="outlined" size="small" color="secondary"
                    >
                        Re-imprimir Ticket
                    </Button>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, overflow: 'hidden', pb: 1 }}>
                {/* COLUMNA IZQUIERDA */}
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
                    
                    <Box sx={{ mt: 1, flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                        {cart.slice().reverse().map((item, index) => (
                            <Box key={index} sx={{ p: 1, borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar src={item.imagen_url} variant="rounded" sx={{ width: 40, height: 40 }}>{item.nombre.charAt(0)}</Avatar>
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography fontWeight="bold" color="green">{item.nombre}</Typography>
                                    <Typography variant="caption" display="block">{item.qty} x Q{item.precio_venta}</Typography>
                                </Box>
                                <Typography fontWeight="bold">{formatCurrency(item.precio_venta * item.qty)}</Typography>
                            </Box>
                        ))}
                    </Box>
                </Paper>

                {/* COLUMNA DERECHA */}
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
                                        <TableCell align="center">
                                            <Box display="flex" alignItems="center" justifyContent="center">
                                                <IconButton size="small" onClick={() => updateQuantity(item.id, item.qty - 1, item.cantidad)} color="primary"><RemoveCircleOutline /></IconButton>
                                                <Typography sx={{ mx: 1, fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.qty}</Typography>
                                                <IconButton size="small" onClick={() => updateQuantity(item.id, item.qty + 1, item.cantidad)} color="primary"><AddCircleOutline /></IconButton>
                                            </Box>
                                        </TableCell>
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
                                        <TableCell align="right">{formatCurrency(item.precio_venta * item.qty)}</TableCell>
                                        <TableCell>
                                            <Tooltip title="Eliminar del carrito">
                                                <IconButton size="small" color="error" onClick={() => removeFromCart(item.id)}><Delete /></IconButton>
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

                    <Box sx={{ mt: 'auto', pt: 2, borderTop: '2px dashed #ccc', flexShrink: 0 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, px: 2 }}>
                            <Typography variant="h4" fontWeight="bold">TOTAL:</Typography>
                            <Typography variant="h4" fontWeight="bold" color="primary">{formatCurrency(total)}</Typography>
                        </Box>
                        
                        <Button 
                            variant="contained" color="success" fullWidth size="large" 
                            onClick={handleCheckout} disabled={loading || cart.length === 0} 
                            sx={{ py: 1.5, fontSize: '1.2rem', fontWeight: 'bold', mb: 1, boxShadow: 3 }}
                        >
                            {loading ? <CircularProgress size={28} color="inherit"/> : 'COBRAR (F9)'}
                        </Button>

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