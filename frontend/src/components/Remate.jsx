// frontend/src/components/Remate.jsx
import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import {
    Container, Typography, CircularProgress, Alert, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Box, Chip, Avatar, TextField, TablePagination, Dialog, IconButton, Tooltip,
    Checkbox, Button, Snackbar
} from '@mui/material';
import { Sell, ArrowBack, ArrowForward, Close, ImageNotSupported } from '@mui/icons-material';

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
    const [viewImageIndex, setViewImageIndex] = useState(null);

    const [userRole, setUserRole] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkPct, setBulkPct] = useState('');
    const [applying, setApplying] = useState(false);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

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

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) setUserRole((JSON.parse(userStr).rol || '').toLowerCase());
    }, []);

    const isAdmin = userRole === 'admin';

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

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const applyDiscount = async (ids, pct) => {
        const parsedPct = parseFloat(pct);
        if (!ids.length || isNaN(parsedPct) || parsedPct <= 0 || parsedPct >= 100) {
            setToast({ open: true, msg: 'Ingresa un porcentaje válido (1-99).', severity: 'error' });
            return;
        }
        setApplying(true);
        try {
            const token = localStorage.getItem('authToken');
            await API.post('/inventory/discount', { producto_ids: ids, porcentaje: parsedPct }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento aplicado correctamente.', severity: 'success' });
            setSelectedIds([]);
            setBulkPct('');
            await fetchStagnant(mesesFiltro);
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al aplicar el descuento.', severity: 'error' });
        } finally {
            setApplying(false);
        }
    };

    const removeDiscount = async (ids) => {
        if (!ids.length) return;
        setApplying(true);
        try {
            const token = localStorage.getItem('authToken');
            await API.delete('/inventory/discount', {
                data: { producto_ids: ids },
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento eliminado.', severity: 'success' });
            setSelectedIds([]);
            await fetchStagnant(mesesFiltro);
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al quitar el descuento.', severity: 'error' });
        } finally {
            setApplying(false);
        }
    };

    const getOptimizedImageUrl = (url, width = 100) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        const parts = url.split('/upload/');
        return `${parts[0]}/upload/w_${width},c_limit,f_auto,q_auto/${parts[1]}`;
    };

    const handleNextImage = () => viewImageIndex < products.length - 1 && setViewImageIndex(viewImageIndex + 1);
    const handlePrevImage = () => viewImageIndex > 0 && setViewImageIndex(viewImageIndex - 1);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (viewImageIndex === null) return;
            if (e.key === 'ArrowRight') handleNextImage();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'Escape') setViewImageIndex(null);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewImageIndex, products]);

    const currentGalleryProduct = viewImageIndex !== null ? products[viewImageIndex] : null;

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
                                {isAdmin && <TableCell padding="checkbox" />}
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
                                const realIndex = products.indexOf(product);
                                return (
                                    <TableRow key={product.id} hover sx={{ height: 90 }}>
                                        {isAdmin && (
                                            <TableCell padding="checkbox">
                                                <Checkbox checked={selectedIds.includes(product.id)} onChange={() => toggleSelect(product.id)} />
                                            </TableCell>
                                        )}
                                        <TableCell>
                                            <Tooltip title="Ver detalle (Zoom)">
                                                <Avatar
                                                    src={getOptimizedImageUrl(product.imagen_url, 140)}
                                                    variant="rounded"
                                                    onClick={() => setViewImageIndex(realIndex)}
                                                    sx={{ width: 80, height: 80, bgcolor: '#eee', border: '1px solid #ddd', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' } }}
                                                >
                                                    {product.nombre.charAt(0)}
                                                </Avatar>
                                            </Tooltip>
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
                                    <TableCell colSpan={isAdmin ? 7 : 6} align="center" sx={{ py: 3 }}>
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

                {isAdmin && selectedIds.length > 0 && (
                    <Box sx={{ p: 2, borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff8e1' }}>
                        <Typography fontWeight="bold">{selectedIds.length} seleccionado(s)</Typography>
                        <TextField
                            size="small"
                            label="% Descuento"
                            type="number"
                            value={bulkPct}
                            onChange={(e) => setBulkPct(e.target.value)}
                            sx={{ width: 140 }}
                        />
                        <Button variant="contained" color="warning" startIcon={<Sell />} disabled={applying} onClick={() => applyDiscount(selectedIds, bulkPct)}>
                            Aplicar a {selectedIds.length} productos
                        </Button>
                        <Button variant="outlined" color="error" disabled={applying} onClick={() => removeDiscount(selectedIds)}>
                            Quitar descuento a {selectedIds.length} productos
                        </Button>
                    </Box>
                )}
            </Paper>

            <Dialog
                open={viewImageIndex !== null}
                onClose={() => setViewImageIndex(null)}
                maxWidth="lg"
                PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none', overflow: 'visible' } }}
            >
                <Box sx={{ position: 'relative', width: 'auto', maxWidth: '90vw', maxHeight: '90vh', bgcolor: 'white', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 24 }}>
                    <IconButton onClick={() => setViewImageIndex(null)} sx={{ position: 'absolute', top: 10, right: 10, zIndex: 50, bgcolor: 'rgba(0,0,0,0.1)', '&:hover': { bgcolor: 'rgba(0,0,0,0.2)' } }}>
                        <Close />
                    </IconButton>

                    {currentGalleryProduct && (
                        <>
                            <Box sx={{ width: '100%', minWidth: { xs: '300px', md: '500px' }, height: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8f9fa', position: 'relative' }}>
                                <IconButton onClick={handlePrevImage} disabled={viewImageIndex === 0} sx={{ position: 'absolute', left: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' }, display: viewImageIndex === 0 ? 'none' : 'flex' }}>
                                    <ArrowBack />
                                </IconButton>

                                {currentGalleryProduct.imagen_url ? (
                                    <img
                                        src={getOptimizedImageUrl(currentGalleryProduct.imagen_url, 1000)}
                                        alt="Detalle"
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <Box display="flex" flexDirection="column" alignItems="center" color="text.secondary">
                                        <ImageNotSupported sx={{ fontSize: 80, opacity: 0.3 }} />
                                        <Typography variant="caption">Sin Imagen</Typography>
                                    </Box>
                                )}

                                <IconButton onClick={handleNextImage} disabled={viewImageIndex === products.length - 1} sx={{ position: 'absolute', right: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'white' }, display: viewImageIndex === products.length - 1 ? 'none' : 'flex' }}>
                                    <ArrowForward />
                                </IconButton>
                            </Box>

                            <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid #eee' }}>
                                <Typography variant="h5" fontWeight="bold">{currentGalleryProduct.nombre}</Typography>
                                <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>{currentGalleryProduct.marca}</Typography>
                                <Chip label={`${currentGalleryProduct.meses_en_stock} meses en stock`} sx={{ fontWeight: 'bold', ...getAgeBadgeStyle(currentGalleryProduct.meses_en_stock) }} />
                            </Box>
                        </>
                    )}
                </Box>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={3000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Remate;
