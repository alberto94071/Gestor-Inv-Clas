import React, { useState, useEffect, useRef } from 'react';
import { 
    Box, Paper, Typography, TextField, Button, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    IconButton, Alert, CircularProgress, Avatar, InputAdornment, Tooltip, Snackbar
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

const PointOfSale = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [cart, setCart] = useState([]);
    const [barcode, setBarcode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    
    // Guardar última venta
    const [lastSaleCart, setLastSaleCart] = useState(null);
    const [lastTicketId, setLastTicketId] = useState(null);

    const inputRef = useRef(null);

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

    useEffect(() => {
        loadInventory();
        focusInput();
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

    // --- IMPRESIÓN (CORREGIDA) ---
    const handlePrintTicket = async (cartToPrint = cart, ticketId = Date.now()) => {
        if (!cartToPrint || cartToPrint.length === 0) return;

        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};

            const esCarta = (config.tipo_papel || '').toLowerCase() === 'carta';
            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Permite ventanas emergentes para imprimir.");

            const totalPrint = cartToPrint.reduce((acc, item) => acc + (Number(item.precio_venta) * item.qty), 0);

            // Generamos la URL del QR directamente como imagen (API pública segura)
            // Esto asegura que se imprima sin scripts complejos
            const qrUrl = config.instagram_url 
                ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.instagram_url)}`
                : '';

            // ================= ESTILOS CARTA (CORREGIDO PARA IMPRESIÓN) =================
            const estilosCarta = `
                @page { size: letter portrait; margin: 0.8cm; }
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                .logo-circle { width: 100px; height: 100px; border: 2px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .logo-circle img { width: 100%; height: 100%; object-fit: cover; }
                .title-receipt { font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 60px; color: #000; margin: 0; line-height: 1; text-align: right; }
                .business-name { text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 10px 0 30px 0; font-weight: 400; }
                .info-bar { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; font-weight: bold; }
                
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; }
                th { border: 1px solid #000; padding: 12px; text-align: center; background: #fff; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
                td { border: 1px solid #000; padding: 12px; font-size: 14px; vertical-align: middle; }
                .col-desc { text-align: left; }
                .col-center { text-align: center; }
                .col-right { text-align: right; }

                .bottom-section { display: flex; justify-content: flex-end; margin-top: 10px; }
                .totals-box { width: 40%; }
                .total-row.final { display: flex; justify-content: space-between; border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 20px; margin-top: 5px; padding: 10px 0; }

                .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: center; }
                
                /* CORRECCIÓN: Forzamos la impresión del fondo negro */
                .stamp-container { text-align: center; }
                .stamp { 
                    width: 150px; height: 150px; 
                    background-color: #333 !important; /* Importante */
                    color: #fff !important; 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                    font-family: 'Brush Script MT', cursive; 
                    font-size: 40px; 
                    transform: rotate(-10deg);
                    box-shadow: 0 0 0 5px #fff, 0 0 0 8px #333;
                    -webkit-print-color-adjust: exact; /* Para Chrome/Edge */
                    print-color-adjust: exact; /* Estándar */
                }
                
                .socials { text-align: right; font-size: 18px; line-height: 2.5; }
                .social-item { display: flex; align-items: center; justify-content: flex-end; gap: 15px; }
                .social-icon { width: 28px; height: 28px; object-fit: contain; } 
                .qr-img { margin-left: 15px; border: 2px solid #333; padding: 2px; background: #fff; width: 70px; height: 70px; display: inline-block; vertical-align: middle; }

                .footer-large-msg { margin-top: 50px; text-align: center; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            `;

            const contenidoCarta = `
                <div class="header">
                    <div class="logo-circle">
                        ${config.logo_url ? `<img src="${config.logo_url}" />` : `<span>LOGO</span>`}
                    </div>
                    <div>
                        <h1 class="title-receipt">Recibo</h1>
                    </div>
                </div>

                <div class="business-name">
                    ${config.nombre_empresa || "NOMBRE DE TU NEGOCIO"}
                </div>

                <div class="info-bar">
                    <span>Nº Orden: ${ticketId}</span>
                    <span>Fecha: ${new Date().toLocaleDateString('es-GT')}</span>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%">Descripción del Artículo</th>
                            <th style="width: 10%">Cant.</th>
                            <th style="width: 20%">Precio Unit.</th>
                            <th style="width: 20%">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cartToPrint.map(item => `
                            <tr>
                                <td class="col-desc">${item.nombre}</td>
                                <td class="col-center">${item.qty}</td>
                                <td class="col-center">Q${Number(item.precio_venta).toFixed(2)}</td>
                                <td class="col-right">Q${(item.precio_venta * item.qty).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        <tr><td style="height: 30px;"></td><td></td><td></td><td></td></tr>
                    </tbody>
                </table>

                <div class="bottom-section">
                    <div class="totals-box">
                        <div class="total-row final">
                            <span>TOTAL</span>
                            <span>Q${totalPrint.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                <div class="footer">
                    <div class="stamp-container">
                        <div class="stamp">¡Gracias!</div>
                    </div>
                    
                    <div class="socials">
                        <div class="social-item">
                            <span>@potters_store</span>
                            <img src="${ICON_TIKTOK}" class="social-icon" alt="TikTok"/>
                        </div>
                        <div class="social-item">
                            <span>Potter's store</span>
                            <img src="${ICON_FB}" class="social-icon" alt="Facebook"/>
                        </div>
                        <div class="social-item">
                             ${qrUrl ? `<img src="${qrUrl}" class="qr-img" alt="QR" />` : ''}
                            <span>@potters_store_</span>
                            <img src="${ICON_IG}" class="social-icon" alt="Instagram"/>
                        </div>
                    </div>
                </div>

                 <div class="footer-large-msg">
                    ${config.mensaje_final || "¡GRACIAS POR SU COMPRA!"}
                 </div>
            `;

            // ================= ESTILOS 80MM (Térmico) =================
            const estilos80mm = `
                @page { size: 80mm auto; margin: 0; }
                body { width: 72mm; margin: 0 auto; padding: 5mm 2mm; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; }
                .center { text-align: center; } .bold { font-weight: bold; }
                .dashed-top { border-top: 1px dashed #000; } .dashed-bottom { border-bottom: 1px dashed #000; }
                .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 10px; }
                th { text-align: left; border-bottom: 1px dashed #000; border-top: 1px dashed #000; padding: 5px 0; font-size: 11px; }
                td { vertical-align: top; font-size: 11px; padding: 4px 0; }
                .footer-contact { margin-top: 15px; font-size: 10px; text-align: center; }
                .footer-large-msg-80 { margin-top: 20px; text-align: center; font-size: 16px; font-weight: bold; text-transform: uppercase; }
            `;

            const contenido80mm = `
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

                <div class="footer-contact">
                    ${config.direccion ? `Visitenos en ${config.direccion}` : ''}<br/>
                    ${config.whatsapp ? `Tel: ${config.whatsapp}` : ''}
                </div>

                <div class="footer-large-msg-80">
                    ${config.mensaje_final || "¡GRACIAS POR SU COMPRA!"}
                </div>
            `;

            // ================= INYECCIÓN FINAL =================
            const html = `
                <html>
                <head>
                    <title>Ticket ${ticketId}</title>
                    <style>
                        ${esCarta ? estilosCarta : estilos80mm}
                    </style>
                </head>
                <body>
                    ${esCarta ? contenidoCarta : contenido80mm}
                </body>
                </html>
            `;

            printWindow.document.write(html);
            printWindow.document.close();

            // Esperamos a que las imágenes carguen antes de imprimir
            setTimeout(() => { 
                printWindow.focus(); 
                printWindow.print(); 
                printWindow.close(); 
            }, 1000); // Damos 1 segundo para cargar QR e iconos

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