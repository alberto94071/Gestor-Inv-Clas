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
    const displayRef = `REF-${new Date(row.fecha || row.fecha_hora).getTime().toString().slice(-6)}`;

    // Fallback: Si el backend no manda vendedor, intenta buscarlo o pone 'Sistema'
    const vendedorNombre = row.vendedor || 'Sistema';

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
                                {new Date(row.fecha || row.fecha_hora).toLocaleDateString('es-GT')}
                            </Typography>
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 3 }}>
                            {new Date(row.fecha || row.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
                        {/* Soporte para mayúsculas o minúsculas según venga del backend */}
                        {formatCurrency(row.totalVenta || row.totalventa)}
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
                                            <TableCell align="right">{formatCurrency(item.precioUnitario || item.precio_unitario)}</TableCell>
                                            <TableCell align="right">
                                                {formatCurrency((item.precioUnitario || item.precio_unitario) * item.cantidad)}
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
            console.log("Datos:", response.data);
            setSalesData(processSalesSmartly(response.data));
        } catch (err) {
            setError("No se pudo cargar el historial.");
        } finally {
            setLoading(false);
        }
    };

    const processSalesSmartly = (flatItems) => {
        if (!flatItems || flatItems.length === 0) return [];
        // Normalizamos fecha_hora vs fecha para que no falle el sort
        const sortedItems = [...flatItems].sort((a, b) => 
            new Date(b.fecha_hora || b.fecha_venta).getTime() - new Date(a.fecha_hora || a.fecha_venta).getTime()
        );
        
        const groups = [];
        let currentGroup = null;

        for (const item of sortedItems) {
            const dateStr = item.fecha_hora || item.fecha_venta;
            const itemTime = new Date(dateStr).getTime();
            
            // Soporte para nombres de columnas variables (minúsculas o camelCase)
            const precio = Number(item.precio_unitario || item.precioUnitario);
            const totalItem = Number(item.totalventa || item.totalVenta || (precio * item.cantidad));
            const vendedor = item.vendedor || 'Sistema';

            if (currentGroup) {
                const groupTime = new Date(currentGroup.fecha).getTime();
                const diffSeconds = Math.abs(groupTime - itemTime) / 1000;

                // Agrupamos si es < 10 seg Y mismo vendedor
                if (diffSeconds <= 10 && vendedor === currentGroup.vendedor) {
                    currentGroup.items.push({
                        producto: item.producto,
                        cantidad: item.cantidad,
                        precioUnitario: precio,
                    });
                    currentGroup.totalVenta += (precio * item.cantidad);
                    continue; 
                }
            }

            currentGroup = {
                id: item.id,
                fecha: dateStr,
                vendedor: vendedor,
                totalVenta: (precio * item.cantidad),
                items: [{
                    producto: item.producto,
                    cantidad: item.cantidad,
                    precioUnitario: precio,
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

            // --- CSS 80mm CORREGIDO PARA LOGO ---
            const estilos80mm = `
                <style>
                    @page { size: 80mm auto; margin: 0; }
                    body { 
                        width: 72mm; 
                        margin: 0 auto; 
                        padding: 5px 2px; 
                        font-family: monospace; 
                        font-size: 12px; 
                        color: #000; 
                    }
                    .center { text-align: center; } 
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 5px 0; }
                    .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                    
                    /* CSS DEL LOGO AJUSTADO */
                    #logo-img { 
                        display: block; 
                        margin: 0 auto 5px auto; 
                        max-width: 80%;   /* Evita que se salga del papel */
                        height: auto; 
                        object-fit: contain;
                    }
                </style>
            `;

            const contenido80mm = `
                <div class="center">
                    ${config.logo_url 
                        ? `<img id="logo-img" src="${config.logo_url}" alt="LOGO" />` 
                        : '<div class="bold">[SIN LOGO]</div>'
                    }
                    <div class="bold" style="font-size: 14px; margin-top: 5px;">${config.nombre_empresa || "TIENDA"}</div>
                    <div style="font-size: 10px;">${config.direccion || ''}</div>
                </div>
                <div class="divider"></div>
                <div class="info-row"><span>FECHA:</span> <span>${new Date(saleRow.fecha).toLocaleDateString()}</span></div>
                <div class="info-row"><span>REF:</span> <span>${displayRef}</span></div>
                
                <div class="info-row bold"><span>VENDEDOR:</span> <span>${saleRow.vendedor || 'Sistema'}</span></div>
                
                <div class="divider"></div>
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr><th align="left">PROD</th><th align="right">TOT</th></tr></thead>
                    <tbody>
                        ${saleRow.items.map(item => `
                            <tr>
                                <td>${item.producto.substring(0,18)} <br/> <small>x${item.cantidad}</small></td>
                                <td align="right" valign="top">Q${(item.precioUnitario * item.cantidad).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="divider"></div>
                <div class="info-row bold" style="font-size: 14px;"><span>TOTAL:</span> <span>Q${totalPrint.toFixed(2)}</span></div>
                <div class="center" style="margin-top: 15px;">${config.mensaje_final || "GRACIAS"}</div>
            `;

            // Estilos carta (resumidos para no ocupar espacio innecesario, pero funcionales)
            const estilosCarta = `<style>body{font-family:sans-serif;padding:20px;}.header{display:flex;justify-content:space-between;border-bottom:2px solid #000;padding-bottom:10px;}img{max-width:150px;}</style>`;
            const contenidoCarta = `
                <div class="header">
                    ${config.logo_url ? `<img src="${config.logo_url}" />` : '<h1>LOGO</h1>'}
                    <div><h1>Recibo</h1></div>
                </div>
                <h3>Empresa: ${config.nombre_empresa}</h3>
                <p>Vendedor: ${saleRow.vendedor || 'Sistema'}</p>
                <p>Total: Q${totalPrint.toFixed(2)}</p>
                `;

            printWindow.document.write(`
                <html>
                    <head>
                        <title>Imprimir Ticket</title>
                        ${esCarta ? estilosCarta : estilos80mm}
                    </head>
                    <body>
                        ${esCarta ? contenidoCarta : contenido80mm}
                    </body>
                </html>
            `);
            printWindow.document.close();

            // --- LÓGICA DE CARGA DE IMAGEN (CLAVE PARA EL LOGO) ---
            const logoEl = printWindow.document.getElementById('logo-img');
            const is80mm = !esCarta;

            if (is80mm && logoEl && config.logo_url) {
                // Si es 80mm y hay logo, esperamos a que cargue
                logoEl.onload = () => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                };
                logoEl.onerror = () => {
                    // Si falla la imagen, imprimimos igual sin bloquear
                    printWindow.print();
                    printWindow.close();
                };
                // Forzar impresión si tarda más de 2 segundos (seguridad)
                setTimeout(() => {
                    if (!printWindow.closed) {
                        printWindow.print();
                        printWindow.close();
                    }
                }, 2000);
            } else {
                // Si es carta o no hay logo, imprimimos normal
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                    printWindow.close();
                }, 500);
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