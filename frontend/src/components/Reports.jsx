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

// --- ICONOS PARA EL RECIBO PROFESIONAL ---
const ICON_TIKTOK = "https://cdn-icons-png.flaticon.com/512/3046/3046121.png";
const ICON_FB = "https://cdn-icons-png.flaticon.com/512/124/124010.png";
const ICON_IG = "https://cdn-icons-png.flaticon.com/512/2111/2111463.png";

const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

// --- COMPONENTE FILA ---
const Row = ({ row, onReprint }) => {
    const [open, setOpen] = useState(false);
    const displayRef = `REF-${new Date(row.fecha).getTime().toString().slice(-6)}`;

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: open ? '#f8f9fa' : 'inherit' }}>
                <TableCell>
                    <IconButton size="small" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">
                    <Box display="flex" flexDirection="column">
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarMonth fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                                {new Date(row.fecha).toLocaleDateString()}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 3 }}>
                            {new Date(row.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Chip label={displayRef} size="small" variant="outlined" sx={{fontFamily: 'monospace', fontSize: '0.7rem'}} />
                </TableCell>
                <TableCell>
                     <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        {row.vendedor}
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
                                🛒 Artículos en esta venta:
                            </Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Producto</TableCell>
                                        <TableCell align="right">Cant.</TableCell>
                                        <TableCell align="right">P. Unit.</TableCell>
                                        <TableCell align="right">Subtotal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell sx={{fontWeight:'bold'}}>{item.producto}</TableCell>
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

    const processSalesSmartly = (flatItems) => {
        if (!flatItems || flatItems.length === 0) return [];
        const sortedItems = [...flatItems].sort((a, b) => 
            new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime()
        );
        const groups = [];
        let currentGroup = null;

        for (const item of sortedItems) {
            const itemTime = new Date(item.fecha_hora).getTime();
            if (currentGroup) {
                const groupTime = new Date(currentGroup.fecha).getTime();
                const diffSeconds = Math.abs(groupTime - itemTime) / 1000;

                if (diffSeconds <= 10 && item.vendedor === currentGroup.vendedor) {
                    currentGroup.items.push({
                        producto: item.producto,
                        cantidad: item.cantidad,
                        precioUnitario: item.precio_unitario,
                    });
                    currentGroup.totalVenta += (Number(item.precio_unitario) * Number(item.cantidad));
                    continue; 
                }
            }

            currentGroup = {
                id: item.id,
                fecha: item.fecha_hora,
                vendedor: item.vendedor || 'Sistema',
                totalVenta: (Number(item.precio_unitario) * Number(item.cantidad)),
                items: [{
                    producto: item.producto,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio_unitario,
                }]
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
            const qrUrl = config.instagram_url 
                ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(config.instagram_url)}`
                : '';

            // --- AQUÍ ESTÁN TODOS LOS ESTILOS QUE HACÍAN FALTA ---
            const estilosCarta = `
                <style>
                @page { size: letter portrait; margin: 0.8cm; }
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
                .logo-circle { width: 100px; height: 100px; border: 2px solid #333; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                .logo-circle img { width: 100%; height: 100%; object-fit: cover; }
                .title-receipt { font-family: 'Brush Script MT', cursive; font-size: 60px; color: #000; margin: 0; line-height: 1; text-align: right; }
                .business-name { text-align: center; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; margin: 10px 0 30px 0; font-weight: 400; }
                .info-bar { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; font-weight: bold; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 2px solid #000; }
                th { border: 1px solid #000; padding: 12px; text-align: center; background: #fff; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
                td { border: 1px solid #000; padding: 12px; font-size: 14px; vertical-align: middle; }
                .col-desc { text-align: left; }
                .col-center { text-align: center; }
                .col-right { text-align: right; }
                .total-row.final { display: flex; justify-content: space-between; border-top: 2px solid #000; border-bottom: 2px solid #000; font-weight: bold; font-size: 20px; margin-top: 5px; padding: 10px 0; }
                .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: center; }
                .stamp { width: 150px; height: 150px; background-color: #333 !important; color: #fff !important; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: 'Brush Script MT', cursive; font-size: 40px; transform: rotate(-10deg); box-shadow: 0 0 0 5px #fff, 0 0 0 8px #333; }
                .socials { text-align: right; font-size: 18px; line-height: 2.5; }
                .social-item { display: flex; align-items: center; justify-content: flex-end; gap: 15px; }
                .social-icon { width: 28px; height: 28px; }
                .qr-img { width: 70px; height: 70px; vertical-align: middle; margin-left: 10px; }
                </style>
            `;

            const contenidoCarta = `
                <div class="header">
                    <div class="logo-circle">
                        ${config.logo_url ? `<img src="${config.logo_url}" />` : `<span>LOGO</span>`}
                    </div>
                    <div><h1 class="title-receipt">Recibo (Copia)</h1></div>
                </div>
                <div class="business-name">${config.nombre_empresa || "NOMBRE EMPRESA"}</div>
                <div class="info-bar">
                    <span>${displayRef}</span>
                    <span>Vendedor: ${saleRow.vendedor}</span>
                    <span>Fecha: ${new Date(saleRow.fecha).toLocaleDateString('es-GT')}</span>
                </div>
                <table>
                    <thead>
                        <tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Total</th></tr>
                    </thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td class="col-desc">${item.producto}</td>
                                <td class="col-center">${item.cantidad}</td>
                                <td class="col-center">Q${item.precioUnitario.toFixed(2)}</td>
                                <td class="col-right">Q${(item.precioUnitario * item.cantidad).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="display: flex; justify-content: flex-end;">
                    <div style="width: 40%;">
                        <div class="total-row final"><span>TOTAL</span><span>Q${totalPrint.toFixed(2)}</span></div>
                    </div>
                </div>
                <div class="footer">
                    <div class="stamp">¡Gracias!</div>
                    <div class="socials">
                        <div class="social-item"><span>@potters_store</span><img src="${ICON_TIKTOK}" class="social-icon"/></div>
                        <div class="social-item"><span>Potter's store</span><img src="${ICON_FB}" class="social-icon"/></div>
                        <div class="social-item">${qrUrl ? `<img src="${qrUrl}" class="qr-img"/>` : ''}<span>@potters_store_</span><img src="${ICON_IG}" class="social-icon"/></div>
                    </div>
                </div>
                <div style="text-align:center; margin-top:50px; font-size:24px; font-weight:bold; text-transform:uppercase;">${config.mensaje_final || "GRACIAS POR SU COMPRA"}</div>
            `;

            const estilos80mm = `
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { width: 72mm; margin: 0 auto; padding: 4mm 2mm; font-family: 'Courier New', monospace; font-size: 11px; color: #000; }
                    .center { text-align: center; } .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    img.logo-print { width: 40mm; height: auto; display: block; margin: 0 auto 5px auto; filter: grayscale(100%); }
                </style>
            `;

            const contenido80mm = `
                <div class="center">
                    ${config.logo_url ? `<img src="${config.logo_url}" class="logo-print" id="p-logo" />` : ''}
                    <div class="bold" style="font-size: 14px;">${config.nombre_empresa}</div>
                    <div style="font-size: 9px;">${config.direccion || ''}</div>
                </div>
                <div class="divider"></div>
                <div class="info-row"><span>FECHA:</span> <span>${new Date(saleRow.fecha).toLocaleDateString()}</span></div>
                <div class="info-row"><span>REF:</span> <span>${displayRef}</span></div>
                <div class="info-row"><span>VENDEDOR:</span> <span>${saleRow.vendedor}</span></div>
                <div class="divider"></div>
                <table style="width:100%;">
                    <thead><tr><th align="left">DESC</th><th align="center">CANT</th><th align="right">TOT</th></tr></thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td>${item.producto.substring(0,18)}</td>
                                <td align="center">${item.cantidad}</td>
                                <td align="right">Q${(item.precioUnitario * item.cantidad).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="info-row bold" style="font-size: 12px;"><span>TOTAL:</span> <span>Q${totalPrint.toFixed(2)}</span></div>
                <div class="center bold" style="margin-top: 15px;">${config.mensaje_final || "¡GRACIAS!"}</div>
            `;

            printWindow.document.write(`<html><head>${esCarta ? estilosCarta : estilos80mm}</head><body>${esCarta ? contenidoCarta : contenido80mm}</body></html>`);
            printWindow.document.close();

            const img = printWindow.document.querySelector('img');
            if (img) {
                img.onload = () => { printWindow.print(); printWindow.close(); };
                setTimeout(() => { if(!printWindow.closed) { printWindow.print(); printWindow.close(); } }, 2500);
            } else {
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
            }
        } catch (e) { alert("Error al imprimir."); }
    };

    return (
        <Paper sx={{ width: '100%', p: 3, borderRadius: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>📜 Historial de Ventas</Typography>
            {loading ? <CircularProgress /> : (
                <TableContainer sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width="40px" />
                                <TableCell>Fecha y Hora</TableCell>
                                <TableCell>Ref. Interna</TableCell>
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