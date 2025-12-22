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

// --- ICONOS REDES SOCIALES PARA RECIBO CARTA ---
const ICON_TIKTOK = "https://cdn-icons-png.flaticon.com/512/3046/3046121.png";
const ICON_FB = "https://cdn-icons-png.flaticon.com/512/124/124010.png";
const ICON_IG = "https://cdn-icons-png.flaticon.com/512/2111/2111463.png";

const formatCurrency = (amount) => `Q${Number(amount).toFixed(2)}`;

// --- COMPONENTE FILA (ACORDEÓN) ---
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
                <TableCell>
                    <Box display="flex" flexDirection="column">
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarMonth fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                                {new Date(row.fecha).toLocaleDateString('es-GT')}
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
                        <Typography variant="body2">{row.vendedor}</Typography>
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
                                        <TableCell>Código</TableCell>
                                        <TableCell align="right">Cant.</TableCell>
                                        <TableCell align="right">P. Unit.</TableCell>
                                        <TableCell align="right">Subtotal</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.items.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell sx={{fontWeight:'bold'}}>{item.producto}</TableCell>
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
            const processed = processSalesSmartly(response.data);
            setSalesData(processed);
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
                        codigo: item.codigo,
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
                    codigo: item.codigo,
                    cantidad: item.cantidad,
                    precioUnitario: item.precio_unitario,
                }]
            };
            groups.push(currentGroup);
        }
        return groups;
    };

    // --- FUNCIÓN DE IMPRESIÓN CORREGIDA ---
    const handleReprint = async (saleRow, displayRef) => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};
            const esCarta = (config.tipo_papel || '').toLowerCase() === 'carta';

            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Habilita las ventanas emergentes.");

            // Estilos para 80mm (Incrustados para ignorar Ticket.css)
            const estilos80mm = `
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { 
                        width: 72mm; margin: 0 auto; padding: 4mm 2mm; 
                        font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; 
                    }
                    .center { text-align: center; } .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    th { text-align: left; border-bottom: 1px dashed #000; padding: 3px 0; font-size: 10px; }
                    td { padding: 3px 0; font-size: 10px; vertical-align: top; }
                    img.logo-80 { width: 40mm; height: auto; display: block; margin: 0 auto 5px auto; filter: grayscale(100%); }
                </style>
            `;

            const contenido80mm = `
                <div class="center">
                    ${config.logo_url ? `<img src="${config.logo_url}" class="logo-80" />` : ''}
                    <div class="bold" style="font-size: 14px;">${config.nombre_empresa || "POTTER'S STORE"}</div>
                    <div style="font-size: 9px;">${config.direccion || ''}</div>
                </div>
                <div class="divider"></div>
                <div class="info-row"><span>REF:</span> <span>${displayRef}</span></div>
                <div class="info-row"><span>FECHA:</span> <span>${new Date(saleRow.fecha).toLocaleDateString()}</span></div>
                <div class="info-row"><span>VENDEDOR:</span> <span>${saleRow.vendedor}</span></div>
                <div class="divider"></div>
                <table>
                    <thead><tr><th>DESC</th><th class="center">CANT</th><th style="text-align:right">TOT</th></tr></thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td>${item.producto.substring(0,18)}</td>
                                <td class="center">${item.qty || item.cantidad}</td>
                                <td style="text-align:right">Q${((item.precio_venta || item.precioUnitario) * (item.qty || item.cantidad)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="info-row bold" style="font-size: 12px;"><span>TOTAL:</span> <span>Q${saleRow.totalVenta.toFixed(2)}</span></div>
                <div class="divider"></div>
                <div class="center bold" style="margin-top: 10px; font-size: 11px;">${config.mensaje_final || "¡GRACIAS POR SU COMPRA!"}</div>
            `;

            // Estilos para Carta
            const estilosCarta = `<style>@page { size: letter; margin: 1cm; } body { font-family: Arial, sans-serif; } .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; } .logo-carta { width: 100px; height: auto; }</style>`;
            const contenidoCarta = `
                <div class="header">
                    ${config.logo_url ? `<img src="${config.logo_url}" class="logo-carta" />` : '<div></div>'}
                    <div style="text-align: right;"><h1>RECIBO DE VENTA</h1><p>Ref: ${displayRef}</p></div>
                </div>
                <p><strong>Vendedor:</strong> ${saleRow.vendedor}</p>
                <p><strong>Fecha:</strong> ${new Date(saleRow.fecha).toLocaleString()}</p>
                <table border="1" style="width:100%; border-collapse: collapse; margin-top: 20px;">
                    <thead><tr style="background:#eee;"><th>Producto</th><th>Cant.</th><th>P. Unit</th><th>Total</th></tr></thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr><td style="padding:8px;">${item.producto}</td><td align="center">${item.cantidad}</td><td align="right">Q${item.precioUnitario.toFixed(2)}</td><td align="right">Q${(item.precioUnitario * item.cantidad).toFixed(2)}</td></tr>
                        `).join('')}
                    </tbody>
                </table>
                <h2 style="text-align: right; margin-top: 20px;">TOTAL: Q${saleRow.totalVenta.toFixed(2)}</h2>
            `;

            printWindow.document.write(`<html><head>${esCarta ? estilosCarta : estilos80mm}</head><body>${esCarta ? contenidoCarta : contenido80mm}</body></html>`);
            printWindow.document.close();

            // Esperar a que el logo cargue antes de imprimir
            const img = printWindow.document.querySelector('img');
            if (img) {
                img.onload = () => { printWindow.print(); printWindow.close(); };
                setTimeout(() => { if(!printWindow.closed) { printWindow.print(); printWindow.close(); } }, 2000);
            } else {
                setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
            }

        } catch (e) {
            console.error(e);
            alert("Error al imprimir.");
        }
    };

    return (
        <Paper sx={{ width: '100%', overflow: 'hidden', p: 3, borderRadius: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: '#1a237e' }}>📜 Historial de Ventas</Typography>
            {loading && <Box display="flex" justifyContent="center"><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}
            {!loading && !error && (
                <TableContainer sx={{ maxHeight: '75vh' }}>
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell width="40px" />
                                <TableCell>Fecha y Hora</TableCell>
                                <TableCell>Ref. Interna</TableCell>
                                <TableCell>Vendedor</TableCell>
                                <TableCell align="right">Ítems</TableCell>
                                <TableCell align="right">Total</TableCell>
                                <TableCell align="center">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {salesData.map((row) => (
                                <Row key={row.id} row={row} onReprint={handleReprint} />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default Reports;