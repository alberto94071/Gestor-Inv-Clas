import React, { useState, useEffect } from 'react';
import { 
    Box, Paper, Typography, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, IconButton, Collapse, 
    Button, Chip, CircularProgress, Alert 
} from '@mui/material';
import { 
    KeyboardArrowDown, KeyboardArrowUp, Print, 
    CalendarMonth, Person
} from '@mui/icons-material';
import API from '../api/axiosInstance'; 

// --- CONFIGURACIÓN DE ICONOS (Imágenes directas para impresión segura) ---
const ICON_TIKTOK = "https://cdn-icons-png.flaticon.com/512/3046/3046121.png";
const ICON_FB = "https://cdn-icons-png.flaticon.com/512/124/124010.png";
const ICON_IG = "https://cdn-icons-png.flaticon.com/512/2111/2111463.png";

// Helper para moneda
const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

// --- COMPONENTE DE FILA (ROW) ---
const Row = ({ row, onReprint }) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            {/* Fila Principal (Resumen de Venta) */}
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? '#f8f9fa' : 'inherit' }}>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Box display="flex" alignItems="center" gap={1}>
                        <CalendarMonth fontSize="small" color="action" />
                        {new Date(row.fecha).toLocaleDateString()} {new Date(row.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </Box>
                </TableCell>
                <TableCell>
                     <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        {row.vendedor}
                    </Box>
                </TableCell>
                <TableCell align="right">
                    <Chip label={`${row.items.length} ítems`} size="small" color={open ? "primary" : "default"} variant="outlined"/>
                </TableCell>
                <TableCell align="right">
                    <Typography fontWeight="bold" color="green">
                        {formatCurrency(row.totalVenta)}
                    </Typography>
                </TableCell>
                <TableCell align="center">
                    <Button 
                        variant="outlined" 
                        size="small" 
                        color="secondary"
                        startIcon={<Print />}
                        onClick={() => onReprint(row)}
                    >
                        Re-imprimir
                    </Button>
                </TableCell>
            </TableRow>

            {/* Fila Desplegable (Detalle de Productos) */}
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, padding: 2, backgroundColor: '#fff', borderRadius: 2, boxShadow: 1 }}>
                            <Typography variant="subtitle2" gutterBottom component="div" sx={{fontWeight:'bold', color: '#555'}}>
                                📦 Detalle de Artículos Vendidos
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Producto</TableCell>
                                        <TableCell>Código</TableCell>
                                        <TableCell align="right">Cantidad</TableCell>
                                        <TableCell align="right">Precio Unit.</TableCell>
                                        <TableCell align="right">Total</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell component="th" scope="row" sx={{fontWeight:'bold'}}>
                                                {item.producto}
                                            </TableCell>
                                            <TableCell>{item.codigo}</TableCell>
                                            <TableCell align="right">{item.cantidad}</TableCell>
                                            <TableCell align="right">{formatCurrency(item.precioUnitario)}</TableCell>
                                            <TableCell align="right">
                                                {formatCurrency(item.cantidad * item.precioUnitario)}
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

// --- COMPONENTE PRINCIPAL ---
const Reports = () => {
    const [salesData, setSalesData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 1. Cargar datos del servidor
    useEffect(() => {
        const fetchSales = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('authToken');
                const response = await API.get('/inventory/sales-history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Agrupar datos (Backend a veces manda lista plana)
                const grouped = groupSalesData(response.data);
                setSalesData(grouped);

            } catch (err) {
                console.error(err);
                setError("No se pudo cargar el historial.");
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, []);

    // Función de agrupación
    const groupSalesData = (flatItems) => {
        const groups = {};
        flatItems.forEach(item => {
            // Clave única por venta
            const key = item.ticket_id || `${item.fecha_hora}_${item.vendedor}`;
            
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    fecha: item.fecha_hora || item.created_at, 
                    vendedor: item.vendedor,
                    totalVenta: 0,
                    items: []
                };
            }
            
            groups[key].items.push({
                producto: item.producto,
                codigo: item.codigo,
                cantidad: item.cantidad,
                precioUnitario: item.precio_unitario,
            });

            groups[key].totalVenta += (item.precio_unitario * item.cantidad); 
        });
        return Object.values(groups).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    };

    // --- FUNCIÓN DE RE-IMPRESIÓN (Igualada al POS) ---
    const handleReprint = async (saleRow) => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};

            const esCarta = (config.tipo_papel || '').toLowerCase() === 'carta';
            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Permite ventanas emergentes para imprimir.");

            // Mapeamos los datos del historial al formato de impresión
            const cartToPrint = saleRow.items.map(i => ({
                nombre: i.producto,
                qty: i.cantidad,
                precio_venta: i.precioUnitario
            }));

            const ticketId = saleRow.id.toString().substring(0, 15);
            const totalPrint = saleRow.totalVenta;

             // QR como imagen directa (Más estable para imprimir)
            const qrUrl = config.instagram_url 
            ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.instagram_url)}`
            : '';

            // --- ESTILOS (Optimizados para imprimir fondo negro) ---
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
                
                /* Estilo del sello corregido para que salga negro al imprimir */
                .stamp-container { text-align: center; }
                .stamp { 
                    width: 150px; height: 150px; 
                    background-color: #333 !important; 
                    color: #fff !important; 
                    border-radius: 50%; display: flex; align-items: center; justify-content: center; 
                    font-family: 'Brush Script MT', cursive; font-size: 40px; 
                    transform: rotate(-10deg); 
                    box-shadow: 0 0 0 5px #fff, 0 0 0 8px #333; 
                    -webkit-print-color-adjust: exact; 
                    print-color-adjust: exact; 
                }
                
                .socials { text-align: right; font-size: 18px; line-height: 2.5; }
                .social-item { display: flex; align-items: center; justify-content: flex-end; gap: 15px; }
                .social-icon { width: 28px; height: 28px; object-fit: contain; } 
                .qr-img { margin-left: 15px; border: 2px solid #333; padding: 2px; background: #fff; width: 70px; height: 70px; display: inline-block; vertical-align: middle; }
                .footer-large-msg { margin-top: 50px; text-align: center; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
            `;

            // --- HTML CARTA ---
            const contenidoCarta = `
                <div class="header">
                    <div class="logo-circle">
                        ${config.logo_url ? `<img src="${config.logo_url}" />` : `<span>LOGO</span>`}
                    </div>
                    <div>
                        <h1 class="title-receipt">Recibo (Copia)</h1>
                    </div>
                </div>
                <div class="business-name">${config.nombre_empresa || "NOMBRE EMPRESA"}</div>
                <div class="info-bar">
                    <span>Ref: ${ticketId}</span>
                    <span>Fecha Original: ${new Date(saleRow.fecha).toLocaleDateString('es-GT')}</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 50%">Descripción</th>
                            <th style="width: 10%">Cant.</th>
                            <th style="width: 20%">Precio</th>
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
                    <div class="stamp-container"><div class="stamp">¡Gracias!</div></div>
                    <div class="socials">
                        <div class="social-item"><span>@potters_store</span><img src="${ICON_TIKTOK}" class="social-icon"/></div>
                        <div class="social-item"><span>Potter's store</span><img src="${ICON_FB}" class="social-icon"/></div>
                        <div class="social-item">${qrUrl ? `<img src="${qrUrl}" class="qr-img"/>` : ''}<span>@potters_store_</span><img src="${ICON_IG}" class="social-icon"/></div>
                    </div>
                </div>
                <div class="footer-large-msg">${config.mensaje_final || "GRACIAS POR SU COMPRA"}</div>
            `;

            // --- ESTILOS 80MM ---
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

            // --- HTML 80MM ---
            const contenido80mm = `
                <div class="center bold" style="font-size: 14px; margin-bottom: 5px;">${config.nombre_empresa || "POTTER'S STORE"}</div>
                <div class="center">Copia de Comprobante</div>
                <div class="center">Ref: ${ticketId}</div>
                <br/>
                <div class="info-row"><span>Fecha: ${new Date(saleRow.fecha).toLocaleDateString('es-GT')}</span></div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 45%;">DESC</th>
                            <th style="width: 15%; text-align: center;">CANT</th>
                            <th style="width: 20%; text-align: right;">P.U</th>
                            <th style="width: 20%; text-align: right;">TOT</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${cartToPrint.map(item => `
                            <tr>
                                <td>${item.nombre.substring(0,15)}</td>
                                <td style="text-align: center;">${item.qty}</td>
                                <td style="text-align: right;">${Number(item.precio_venta).toFixed(0)}</td>
                                <td style="text-align: right;">${(item.precio_venta * item.qty).toFixed(2)}</td>
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
                <div class="footer-large-msg-80">${config.mensaje_final || "GRACIAS"}</div>
            `;

            // INYECCIÓN FINAL
            const html = `<html><head><title>Copia ${ticketId}</title><style>${esCarta ? estilosCarta : estilos80mm}</style></head><body>${esCarta ? contenidoCarta : contenido80mm}</body></html>`;
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Damos 1 segundo para cargar imagenes antes de imprimir
            setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 1000);

        } catch (e) {
            console.error(e);
            alert("Error al regenerar el ticket.");
        }
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', p: 2 }}>
            <Typography variant="h5" gutterBottom component="div" sx={{ fontWeight: 'bold', mb: 3, color: '#2c3e50' }}>
                📜 Historial de Ventas
            </Typography>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && (
                <TableContainer sx={{ maxHeight: '80vh' }}>
                    <Table stickyHeader aria-label="collapsible table">
                        <TableHead>
                            <TableRow>
                                <TableCell />
                                <TableCell>Fecha y Hora</TableCell>
                                <TableCell>Vendedor</TableCell>
                                <TableCell align="right">Ítems</TableCell>
                                <TableCell align="right">Total Venta</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {salesData.map((row) => (
                                <Row key={row.id} row={row} onReprint={handleReprint} />
                            ))}
                            {salesData.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">No hay ventas registradas aún.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default Reports;