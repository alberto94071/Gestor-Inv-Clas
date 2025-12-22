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
                <TableCell>
                    <Box display="flex" flexDirection="column">
                        <Box display="flex" alignItems="center" gap={1}>
                            <CalendarMonth fontSize="small" color="action" />
                            <Typography variant="body2" fontWeight="bold">
                                {new Date(row.fecha).toLocaleDateString('es-GT')}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 3 }}>
                            {new Date(row.fecha).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>
                    <Chip label={displayRef} size="small" variant="outlined" sx={{fontFamily: 'monospace', fontSize: '0.7rem'}} />
                </TableCell>
                <TableCell>
                     <Box display="flex" alignItems="center" gap={1}>
                        <Person fontSize="small" color="action" />
                        {/* Aquí mostramos lo que viene del backend */}
                        <Typography variant="body2" fontWeight="bold">{row.vendedor}</Typography>
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
                                            <TableCell align="right">{formatCurrency(item.cantidad * item.precioUnitario)}</TableCell>
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
            console.log("DATOS RECIBIDOS DEL SERVER:", response.data); // 🔍 DIAGNÓSTICO EN CONSOLA
            setSalesData(processSalesSmartly(response.data));
        } catch (err) {
            setError("No se pudo cargar el historial.");
        } finally {
            setLoading(false);
        }
    };

    const processSalesSmartly = (flatItems) => {
        if (!flatItems || flatItems.length === 0) return [];
        const sortedItems = [...flatItems].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora));
        const groups = [];
        let currentGroup = null;

        for (const item of sortedItems) {
            const itemTime = new Date(item.fecha_hora).getTime();
            if (currentGroup) {
                const groupTime = new Date(currentGroup.fecha).getTime();
                const diffSeconds = Math.abs(groupTime - itemTime) / 1000;
                // Agrupamos si el tiempo es cercano Y el vendedor es el mismo
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
            console.log("INTENTANDO IMPRIMIR FILA:", saleRow); // 🔍 VERIFICAR SI TIENE VENDEDOR AQUÍ
            
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            const config = res.data || {};
            const esCarta = (config.tipo_papel || '').toLowerCase() === 'carta';

            const printWindow = window.open('', '_blank');
            if (!printWindow) return alert("Permite las ventanas emergentes.");

            const totalPrint = saleRow.totalVenta;

            // --- ESTILOS 80MM MEJORADOS ---
            const estilos80mm = `
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { width: 72mm; margin: 0 auto; padding: 5px; font-family: monospace; font-size: 12px; color: #000; }
                    .center { text-align: center; } 
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 5px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    
                    /* Aseguramos que la imagen ocupe espacio */
                    #logo-img { 
                        display: block; 
                        margin: 0 auto 5px auto; 
                        max-width: 60mm; 
                        height: auto; 
                    }
                </style>
            `;

            const contenido80mm = `
                <div class="center">
                    ${config.logo_url ? `<img id="logo-img" src="${config.logo_url}" />` : ''}
                    <div class="bold" style="font-size: 14px; margin-top: 5px;">${config.nombre_empresa || "TIENDA"}</div>
                    <div style="font-size: 10px;">${config.direccion || ''}</div>
                </div>
                <div class="divider"></div>
                <div class="info-row"><span>FECHA:</span> <span>${new Date(saleRow.fecha).toLocaleDateString()}</span></div>
                <div class="info-row"><span>HORA:</span> <span>${new Date(saleRow.fecha).toLocaleTimeString()}</span></div>
                
                <div class="info-row bold"><span>VENDEDOR:</span> <span>${saleRow.vendedor}</span></div>
                
                <div class="divider"></div>
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr><th align="left">PROD</th><th align="right">TOT</th></tr></thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td>${item.producto.substring(0,20)} <br/> <small>x${item.cantidad}</small></td>
                                <td align="right" valign="top">Q${(item.precioUnitario * item.cantidad).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="info-row bold" style="font-size: 14px;"><span>TOTAL:</span> <span>Q${totalPrint.toFixed(2)}</span></div>
                <div class="center" style="margin-top: 15px;">${config.mensaje_final || "GRACIAS"}</div>
            `;

            // --- ESTILOS CARTA (RESUMIDO) ---
            const estilosCarta = `<style>body{font-family:sans-serif; padding:20px;} .header{display:flex;justify-content:space-between;border-bottom:2px solid #000;}</style>`;
            const contenidoCarta = `
                <div class="header"><h1>Recibo</h1></div>
                <p>Vendedor: ${saleRow.vendedor}</p>
                <h3>Total: Q${totalPrint.toFixed(2)}</h3>
            `;

            // Escribimos el contenido en la ventana
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir</title>
                        ${esCarta ? estilosCarta : estilos80mm}
                    </head>
                    <body>
                        ${esCarta ? contenidoCarta : contenido80mm}
                    </body>
                </html>
            `);
            printWindow.document.close();

            // --- LÓGICA CRÍTICA DE CARGA DE IMAGEN ---
            const logoElement = printWindow.document.getElementById('logo-img');

            if (logoElement && config.logo_url) {
                // Si hay logo, esperamos a que cargue
                console.log("Esperando carga del logo...");
                logoElement.onload = () => {
                    console.log("Logo cargado. Imprimiendo...");
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                };
                logoElement.onerror = () => {
                    console.log("Error cargando logo. Imprimiendo sin él...");
                    printWindow.print();
                    printWindow.close();
                };
                // Timeout de seguridad de 4 segundos
                setTimeout(() => {
                    if (!printWindow.closed) {
                        console.log("Tiempo de espera agotado. Forzando impresión...");
                        printWindow.print();
                        printWindow.close();
                    }
                }, 4000);
            } else {
                // Si no hay logo, imprimimos rápido
                console.log("No hay logo configurado. Imprimiendo...");
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }

        } catch (e) { 
            console.error(e);
            alert("Error al imprimir."); 
        }
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
                                <TableCell>Fecha</TableCell>
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