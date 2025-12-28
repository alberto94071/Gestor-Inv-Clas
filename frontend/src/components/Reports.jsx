import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Collapse, 
    Button, Chip, CircularProgress, Alert, Avatar 
} from '@mui/material';
import { 
    KeyboardArrowDown, KeyboardArrowUp, Print, 
    CalendarMonth, Person, Tag, BrandingWatermark
} from '@mui/icons-material';
import API from '../api/axiosInstance'; 

// --- UTILIDADES ---
const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

// 1. OPTIMIZADOR DE IMÁGENES
const getOptimizedUrl = (url) => {
    if (!url) return ''; 
    // Si es de Cloudinary, pedimos la versión pequeña (100x100)
    if (url.includes('cloudinary') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/');
    }
    return url;
};

// 2. FORMATEADOR DE HORA (FUERZA BRUTA -6 HORAS) 🇬🇹
// Igual que en Auditoría, para garantizar que salga bien.
const formatDateTime = (fecha) => {
    if (!fecha) return '---';
    
    // Convertimos a objeto fecha
    const fechaObj = new Date(fecha);
    
    // RESTA MANUAL DE 6 HORAS
    // Si el servidor dice 12:00 (UTC), le quitamos 6 para que sea 06:00 (Guate)
    fechaObj.setHours(fechaObj.getHours() - 6);

    return fechaObj.toLocaleString('es-GT', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

// --- ICONOS REDES ---
const ICON_TIKTOK = "https://cdn-icons-png.flaticon.com/512/3046/3046121.png";
const ICON_FB = "https://cdn-icons-png.flaticon.com/512/124/124010.png";
const ICON_IG = "https://cdn-icons-png.flaticon.com/512/2111/2111463.png";
const ICON_WP = "https://cdn-icons-png.flaticon.com/512/733/733585.png";

// --- COMPONENTE FILA ---
const Row = ({ row, onReprint }) => {
    const [open, setOpen] = useState(false);
    
    // Usamos la función de resta manual para mostrar en pantalla
    const fechaVisual = formatDateTime(row.fecha);
    
    // Para la referencia interna
    const fechaObj = new Date(row.fecha); 
    const displayRef = `REF-${fechaObj.getTime().toString().slice(-6)}`;
    const vendedorNombre = row.vendedor || 'Sistema';

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? '#f8f9fa' : 'inherit' }}>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                
                {/* COLUMNA FECHA Y HORA */}
                <TableCell>
                    <Box display="flex" flexDirection="column">
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarMonth fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                                {fechaVisual.split(',')[0]}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 3 }}>
                            {fechaVisual.split(',')[1]}
                        </Typography>
                    </Box>
                </TableCell>

                <TableCell>
                    <Chip label={displayRef} size="small" variant="outlined" sx={{fontFamily: 'monospace', fontSize: '0.7rem'}} />
                </TableCell>
                <TableCell>
                     <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        <Typography variant="body2" fontWeight="bold">
                            {vendedorNombre}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell align="right">
                    <Chip label={`${row.items.length} ítems`} size="small" color="primary" />
                </TableCell>
                <TableCell align="right">
                    <Typography fontWeight="bold" color="green">
                        {formatCurrency(row.totalVenta)}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Button 
                        variant="contained" 
                        size="small" 
                        color="inherit"
                        startIcon={<Print />}
                        onClick={() => onReprint(row, displayRef)}
                        sx={{ fontSize: '0.7rem' }}
                    >
                        Imprimir
                    </Button>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, padding: 2, backgroundColor: '#fff', borderRadius: 2, border: '1px solid #eee' }}>
                            <Typography variant="subtitle2" gutterBottom sx={{fontWeight:'bold', color: '#555'}}>
                                Detalle de Productos:
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell width="60px">Img</TableCell>
                                        <TableCell>Producto / Código / Marca</TableCell>
                                        <TableCell align="right">Cant.</TableCell>
                                        <TableCell align="right">P. Unit.</TableCell>
                                        <TableCell align="right">Subtotal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.items.map((item, index) => (
                                        <TableRow key={index}>
                                            {/* IMAGEN DEL PRODUCTO */}
                                            <TableCell>
                                                <Avatar 
                                                    src={getOptimizedUrl(item.imagen_url)} 
                                                    variant="rounded" 
                                                    sx={{ width: 45, height: 45, bgcolor: '#eee' }}
                                                >
                                                    P
                                                </Avatar>
                                            </TableCell>
                                            
                                            {/* DETALLES: NOMBRE, CÓDIGO, MARCA */}
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="bold">{item.producto}</Typography>
                                                
                                                <Box display="flex" flexWrap="wrap" gap={1} mt={0.5}>
                                                    {/* CÓDIGO */}
                                                    {(item.codigo || item.codigo_barras) && (
                                                        <Chip 
                                                            icon={<Tag style={{fontSize: 12}} />} 
                                                            label={item.codigo || item.codigo_barras} 
                                                            size="small" 
                                                            sx={{height: 20, fontSize: '0.65rem', bgcolor: '#e3f2fd'}} 
                                                        />
                                                    )}
                                                    {/* MARCA */}
                                                    {item.marca && (
                                                        <Chip 
                                                            icon={<BrandingWatermark style={{fontSize: 12}} />}
                                                            label={item.marca} 
                                                            size="small" 
                                                            sx={{height: 20, fontSize: '0.65rem'}} 
                                                        />
                                                    )}
                                                    {/* TALLA */}
                                                    {item.talla && (
                                                        <Chip label={`T: ${item.talla}`} size="small" variant="outlined" sx={{height: 20, fontSize: '0.65rem'}} />
                                                    )}
                                                    {/* COLOR */}
                                                    {item.color && (
                                                        <Chip label={item.color} size="small" variant="outlined" sx={{height: 20, fontSize: '0.65rem'}} />
                                                    )}
                                                </Box>
                                            </TableCell>

                                            <TableCell align="right">{item.cantidad}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.precio_unitario)}</TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(Number(item.precio_unitario) * Number(item.cantidad))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const Reports = () => {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchSales();
    }, []);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await API.get('/inventory/sales-history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSalesData(processSalesSmartly(response.data));
        } catch (err) {
            setError("No se pudo cargar el historial.");
        } finally {
            setLoading(false);
        }
    };

    // ALGORITMO DE AGRUPACIÓN (Ahora captura código, marca e imagen)
    const processSalesSmartly = (flatItems) => {
        if (!flatItems || flatItems.length === 0) return [];
        
        const sortedItems = [...flatItems].sort((a, b) => {
            const dateA = new Date(a.fecha_hora || a.fecha_venta || new Date());
            const dateB = new Date(b.fecha_hora || b.fecha_venta || new Date());
            return dateB - dateA;
        });
        
        const groups = [];
        let currentGroup = null;

        for (const item of sortedItems) {
            const rawDate = item.fecha_hora || item.fecha_venta || new Date().toISOString();
            const itemTime = new Date(rawDate).getTime();

            const precio = Number(item.precio_unitario || item.precioUnitario);
            const totalItem = Number(item.totalVenta || item.totalventa || (precio * item.cantidad));
            const vendedor = item.vendedor; 

            // Objeto con los datos del ítem (para no repetir código)
            const itemData = {
                producto: item.producto,
                cantidad: item.cantidad,
                precio_unitario: precio,
                imagen_url: item.imagen_url,      // <--- Captura imagen
                marca: item.marca,                // <--- Captura marca
                codigo: item.codigo || item.codigo_barras, // <--- Captura código
                talla: item.talla,
                color: item.color
            };

            if (currentGroup) {
                const groupTime = new Date(currentGroup.fecha).getTime();
                const diffSeconds = Math.abs(groupTime - itemTime) / 1000;

                if (diffSeconds <= 10 && vendedor === currentGroup.vendedor) {
                    currentGroup.items.push(itemData);
                    currentGroup.totalVenta += totalItem;
                    continue; 
                }
            }

            currentGroup = {
                id: item.id,
                fecha: rawDate,
                vendedor: vendedor,
                totalVenta: totalItem,
                items: [itemData]
            };
            groups.push(currentGroup);
        }
        return groups;
    };

    const handleReprint = async (saleRow, displayRef) => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};
            const esCarta = (config.tipo_papel || '').toLowerCase() === 'carta';

            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Permite las ventanas emergentes.");

            const totalPrint = saleRow.totalVenta;
            
            // Usamos la función de resta manual para la impresión también
            const fechaVisual = formatDateTime(saleRow.fecha); 
            
            const qrUrl = config.instagram_url 
                ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.instagram_url)}`
                : '';

            const estilos80mm = `
                <style>
                    @page { size: 80mm auto; margin: 0mm; }
                    body { 
                        width: 72mm; 
                        margin: 0 auto; 
                        padding: 5px 2px; 
                        font-family: 'Courier New', monospace; 
                        font-size: 12px; 
                        color: #000; 
                    }
                    .center { text-align: center; } 
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 11px; }
                    
                    #logo-img { display: block; margin: 5px auto; width: 40mm; height: auto; object-fit: contain; }
                    .socials-container { margin-top: 10px; padding-top: 5px; border-top: 1px dotted #000; }
                    .social-item-mini { display: flex; align-items: center; justify-content: center; margin-bottom: 3px; font-size: 10px; }
                    .social-icon-mini { width: 14px; height: 14px; margin-right: 5px; }
                    .qr-mini { width: 35mm; height: 35mm; margin: 5px auto 0 auto; display: block; }
                    .wp-icon { width: 12px; height: 12px; vertical-align: middle; margin-right: 4px; }
                </style>
            `;

            const contenido80mm = `
                <div class="center">
                    ${config.logo_url ? `<img id="logo-img" src="${config.logo_url}" alt="LOGO" />` : ''}
                    <div class="bold" style="font-size: 15px; margin-top: 5px;">${config.nombre_empresa || "TU TIENDA"}</div>
                    <div style="font-size: 10px; margin-top: 4px;">${config.direccion || ''}</div>
                    ${config.whatsapp ? `<div style="font-size: 10px; margin-top: 2px;"><img src="${ICON_WP}" class="wp-icon"/>${config.whatsapp}</div>` : ''}
                </div>
                
                <div class="divider"></div>
                <div class="info-row"><span>FECHA:</span> <span>${fechaVisual}</span></div>
                <div class="info-row"><span>REF:</span> <span>${displayRef}</span></div>
                <div class="info-row bold" style="font-size: 12px;"><span>VENDEDOR:</span> <span>${saleRow.vendedor}</span></div>
                
                <div class="divider"></div>
                <table style="width:100%; border-collapse:collapse; font-size: 11px;">
                    <thead><tr><th align="left">PROD</th><th align="center">CANT</th><th align="right">TOTAL</th></tr></thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td style="padding-top:4px;">
                                    ${item.producto.substring(0,18)}
                                    ${item.codigo ? `<br/><span style="font-size:9px">(${item.codigo})</span>` : ''}
                                </td>
                                <td align="center" style="padding-top:4px;">${item.cantidad}</td>
                                <td align="right" style="padding-top:4px;">Q${(Number(item.precio_unitario) * Number(item.cantidad)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="info-row bold" style="font-size: 14px; margin-top: 5px;"><span>TOTAL A PAGAR:</span> <span>Q${totalPrint.toFixed(2)}</span></div>
                
                <div class="socials-container center">
                    <div class="bold" style="font-size: 11px; margin-bottom: 4px;">¡SÍGUENOS!</div>
                    <div class="social-item-mini"><img src="${ICON_IG}" class="social-icon-mini"/> <span>@potters_store_</span></div>
                    <div class="social-item-mini"><img src="${ICON_FB}" class="social-icon-mini"/> <span>Potter's store</span></div>
                    <div class="social-item-mini"><img src="${ICON_TIKTOK}" class="social-icon-mini"/> <span>@potters_store</span></div>
                    
                    ${qrUrl ? `<div style="margin-top: 8px;"><img src="${qrUrl}" class="qr-mini"/><div style="font-size: 9px;">Escanea para Instagram</div></div>` : ''}
                </div>

                <div class="divider"></div>
                <div class="center bold" style="margin-top: 10px; font-size: 12px;">${config.mensaje_final || "¡GRACIAS POR SU COMPRA!"}</div>
                <div class="center" style="font-size: 9px; margin-top: 5px;">Documento no contable</div>
            `;

             const estilosCarta = `
                <style>
                @page { size: letter portrait; margin: 0.8cm; }
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                .logo-circle { width: 100px; height: 100px; border: 2px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .logo-circle img { width: 100%; height: 100%; object-fit: cover; }
                .title-receipt { font-family: 'Brush Script MT', cursive; font-size: 60px; color: #000; margin: 0; line-height: 1; text-align: right; }
                .business-name { text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 10px 0 10px 0; font-weight: 400; }
                .contact-info-carta { text-align: center; font-size: 12px; margin-bottom: 20px; color: #666; }
                .info-bar { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; font-weight: bold; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { padding: 12px; text-align: left; background: #f8f9fa; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; border-bottom: 2px solid #333; }
                td { padding: 12px; font-size: 14px; vertical-align: middle; border-bottom: 1px solid #eee; }
                .total-row.final { display: flex; justify-content: flex-end; gap: 20px; font-weight: bold; font-size: 24px; margin-top: 20px; padding: 10px 0; color: #333; }
                .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; padding-top: 30px; }
                .stamp { width: 130px; height: 130px; border: 4px solid #333;color: #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Courier New', cursive; font-weight:bold; font-size: 24px; transform: rotate(-15deg); opacity: 0.8; }
                .socials { text-align: right; font-size: 16px; line-height: 2; }
                .social-item { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
                .social-icon { width: 24px; height: 24px; }
                .qr-img-carta { width: 80px; height: 80px; margin-left: 15px; border: 1px solid #ddd; padding: 2px; }
                </style>
            `;

            const contenidoCarta = `
                <div class="header">
                    <div class="logo-circle">
                        ${config.logo_url ? `<img src="${config.logo_url}" />` : `<span>LOGO</span>`}
                    </div>
                    <div><h1 class="title-receipt">Recibo de Venta</h1></div>
                </div>
                <div class="business-name">${config.nombre_empresa || "TU EMPRESA"}</div>
                <div class="contact-info-carta">
                    ${config.direccion || ''} ${config.whatsapp ? ` | 📞 ${config.whatsapp}` : ''}
                </div>
                <div class="info-bar">
                    <span>Ref: ${displayRef}</span>
                    <span>Vendedor: ${saleRow.vendedor}</span>
                    <span>Fecha: ${fechaVisual}</span>
                </div>
                <table>
                    <thead>
                        <tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit</th><th style="text-align:right">Total</th></tr>
                    </thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td>
                                    ${item.producto} 
                                    ${item.marca ? `(${item.marca})` : ''}
                                    ${item.codigo ? `[${item.codigo}]` : ''}
                                </td>
                                <td style="text-align:center">${item.cantidad}</td>
                                <td style="text-align:right">Q${Number(item.precio_unitario).toFixed(2)}</td>
                                <td style="text-align:right">Q${(Number(item.precio_unitario) * Number(item.cantidad)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                 <div class="total-row final">
                    <span>TOTAL A PAGAR:</span>
                    <span>Q${totalPrint.toFixed(2)}</span>
                </div>
                <div class="footer">
                    <div class="stamp">PAGADO</div>
                    <div style="display:flex; align-items:center;">
                        <div class="socials">
                            <div class="social-item"><span>@potters_store_</span><img src="${ICON_IG}" class="social-icon"/></div>
                            <div class="social-item"><span>Potter's store</span><img src="${ICON_FB}" class="social-icon"/></div>
                            <div class="social-item"><span>@potters_store</span><img src="${ICON_TIKTOK}" class="social-icon"/></div>
                        </div>
                        ${qrUrl ? `<img src="${qrUrl}" class="qr-img-carta"/>` : ''}
                    </div>
                </div>
                <div style="text-align:center; margin-top:40px; font-size:18px; font-weight:bold; color:#555;">${config.mensaje_final || "¡Gracias por tu preferencia!"}</div>
            `;

            printWindow.document.write(`<html><head><title>Ticket</title>${esCarta ? estilosCarta : estilos80mm}</head><body>${esCarta ? contenidoCarta : contenido80mm}</body></html>`);
            printWindow.document.close();

            // ==========================================================
            // LOGICA PARA ESPERAR QUE CARGUEN LAS IMAGENES ANTES DE IMPRIMIR
            // ==========================================================
            const waitForImagesAndPrint = () => {
                const images = printWindow.document.getElementsByTagName('img');
                const checkImages = () => {
                    let allLoaded = true;
                    for (let i = 0; i < images.length; i++) {
                        if (!images[i].complete) {
                            allLoaded = false;
                            break;
                        }
                    }
                    if (allLoaded) {
                        printWindow.focus();
                        printWindow.print();
                        printWindow.close();
                    } else {
                        setTimeout(checkImages, 100);
                    }
                };
                setTimeout(() => {
                    if (!printWindow.closed) { 
                        printWindow.print(); 
                        printWindow.close(); 
                    }
                }, 4000);
                checkImages();
            };

            waitForImagesAndPrint();

        } catch (e) { alert("Error al imprimir."); console.error(e); }
    };

    return (
        <Paper sx={{ width: '100%', p: 3, borderRadius: 3, boxShadow: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#333', borderBottom: '2px solid #eee', pb: 2 }}>
                📜 Historial de Ventas
            </Typography>
            {loading ? (
                <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box>
            ) : error ? (
                <Alert severity="error">{error}</Alert>
            ) : (
                <TableContainer sx={{ maxHeight: '70vh' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow sx={{ '& th': { backgroundColor: '#f5f5f5', fontWeight: 'bold' } }}>
                                <TableCell width="40px" />
                                <TableCell>Fecha y Hora (Guate)</TableCell>
                                <TableCell>Ref.</TableCell>
                                <TableCell>Vendedor</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {salesData.map((row) => <Row key={row.id} row={row} onReprint={handleReprint} />)}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default Reports;
