// frontend/src/components/Remate.jsx
import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination
} from '@mui/material';
import { Sell } from '@mui/icons-material';

const MONTH_FILTERS = [3, 6, 12];

const getAgeBadgeStyle = (meses) => {
    if (meses >= 12) return { bgcolor: '#ffebee', color: '#c62828' }; // rojo
    if (meses >= 6) return { bgcolor: '#fff3e0', color: '#ef6c00' }; // naranja
    return { bgcolor: '#fff8e1', color: '#f9a825' }; // amarillo
};

const Remate = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [mesesFiltro, setMesesFiltro] = useState(3);
    const [mesesPersonalizados, setMesesPersonalizados] = useState('');

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    const fetchStagnant = async (meses) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/inventory/reports/stagnant', {
                params: { meses },
                headers: { Authorization: `Bearer ${token}` }
            });
            setProducts(Array.isArray(res.data) ? res.data : []);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Error al cargar el reporte de productos antiguos.');
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchStagnant(mesesFiltro); setPage(0); }, [mesesFiltro]);

    const handleCustomMeses = (e) => {
        if (e.key === 'Enter') {
            const val = parseInt(mesesPersonalizados);
            if (!isNaN(val) && val > 0) setMesesFiltro(val);
        }
    };

    const handleChangePage = (event, newPage) => setPage(newPage);
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const getOptimizedImageUrl = (url, width = 100) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        const parts = url.split('/upload/');
        return `${parts[0]}/upload/w_${width},c_limit,f_auto,q_auto/${parts[1]}`;
    };

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    const visibleProducts = products.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <Sell fontSize="large" color="warning" />
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    Remate de Productos Antiguos
                </Typography>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                {MONTH_FILTERS.map((m) => (
                    <Chip
                        key={m}
                        label={`+${m} meses`}
                        color={mesesFiltro === m ? 'primary' : 'default'}
                        onClick={() => { setMesesFiltro(m); setMesesPersonalizados(''); }}
                        sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                    />
                ))}
                <TextField
                    size="small"
                    label="Meses personalizados"
                    type="number"
                    value={mesesPersonalizados}
                    onChange={(e) => setMesesPersonalizados(e.target.value)}
                    onKeyDown={handleCustomMeses}
                    sx={{ width: 180 }}
                />
            </Paper>

            <Paper sx={{ width: '100%', mb: 2, borderRadius: 3, overflow: 'hidden' }} elevation={3}>
                <TableContainer sx={{ maxHeight: '65vh' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Antigüedad</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleProducts.map((product) => {
                                const badgeStyle = getAgeBadgeStyle(product.meses_en_stock);
                                return (
                                    <TableRow key={product.id} hover sx={{ height: 90 }}>
                                        <TableCell>
                                            <Avatar
                                                src={getOptimizedImageUrl(product.imagen_url, 140)}
                                                variant="rounded"
                                                sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd' }}
                                            >
                                                {product.nombre.charAt(0)}
                                            </Avatar>
                                        </TableCell>
                                        <TableCell><Typography fontWeight="bold" variant="body2">{product.nombre}</Typography></TableCell>
                                        <TableCell>{product.marca}</TableCell>
                                        <TableCell align="right">
                                            {product.precio_oferta ? (
                                                <Box>
                                                    <Typography variant="body2" sx={{ textDecoration: 'line-through', color: '#999' }}>
                                                        Q{Number(product.precio_venta).toFixed(2)}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'green', fontWeight: 'bold' }}>
                                                        Q{Number(product.precio_oferta).toFixed(2)}
                                                    </Typography>
                                                </Box>
                                            ) : (
                                                <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                    Q{Number(product.precio_venta).toFixed(2)}
                                                </Typography>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={`${product.meses_en_stock} meses en stock`}
                                                sx={{ fontWeight: 'bold', ...badgeStyle }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip label={product.cantidad} color={product.cantidad < 5 ? 'error' : 'success'} sx={{ fontWeight: 'bold' }} />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {visibleProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                        No hay productos con esa antigüedad.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={products.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página"
                />
            </Paper>
        </Container>
    );
};

export default Remate;
