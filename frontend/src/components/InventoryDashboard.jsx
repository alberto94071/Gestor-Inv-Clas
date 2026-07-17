import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar,
    Tooltip, Snackbar, TablePagination
} from '@mui/material';
import {
    Add, Search, Delete, Edit, Close,
    ArrowBack, ArrowForward, ImageNotSupported,
    ShoppingCart, Remove, AddCircle, RemoveCircle, Sell
} from '@mui/icons-material';

import CreateProductModal from './CreateProductModal'; 

const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const badgeColors = [
    '#3f51b5', '#e91e63', '#9c27b0', '#673ab7', '#009688', '#4caf50', 
    '#ff9800', '#795548', '#607d8b', '#f44336', '#2196f3', '#ffeb3b'
];

const InventoryDashboard = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');
    
    // PAGINACIÓN
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    
    // Alertas
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });
    
    // Modales
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [modalData, setModalData] = useState(null); 
    const [confirmNewOpen, setConfirmNewOpen] = useState(false);
    const [scannedCode, setScannedCode] = useState('');
    
    // Acciones
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    
    // 🟢 MODAL DE STOCK MEJORADO
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockQuantity, setStockQuantity] = useState(''); // Cantidad a mover

    // 🟢 GALERÍA (Índice de navegación)
    const [viewImageIndex, setViewImageIndex] = useState(null);
    const [selectedTalla, setSelectedTalla] = useState(null);

    // 🟢 DESCUENTO INDIVIDUAL (REMATE)
    const [discountModalOpen, setDiscountModalOpen] = useState(false);
    const [discountTarget, setDiscountTarget] = useState(null);
    const [discountPct, setDiscountPct] = useState('');

    // Refs
    const searchInputRef = useRef(null);

    // --- OPTIMIZADOR DE IMAGENES CLOUDINARY ---
    // Esta función pide a Cloudinary una versión pequeña para la tabla
    const getOptimizedImageUrl = (url, width = 100) => {
        if (!url || !url.includes('cloudinary.com')) return url;
        // Inyectamos transformaciones f_auto (mejor formato), q_auto (mejor calidad/peso)
        const parts = url.split('/upload/');
        return `${parts[0]}/upload/w_${width},c_limit,f_auto,q_auto/${parts[1]}`;
    };

    // --- CARGAR DATOS ---
    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const rol = JSON.parse(userStr).rol || '';
                setUserRole(rol.toLowerCase());
            }

            const response = await API.get('/inventory/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInventory(response.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Error al cargar inventario.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, []);

    // Auto-focus
    useEffect(() => {
        if (!openCreateModal && !stockModalOpen && !confirmNewOpen && !deleteConfirmOpen && viewImageIndex === null) {
            setTimeout(() => { if (searchInputRef.current) searchInputRef.current.focus(); }, 100);
        }
    }, [openCreateModal, stockModalOpen, confirmNewOpen, deleteConfirmOpen, viewImageIndex]);

    // Filtrado
    const filteredInventory = inventory.filter((item) => {
        const term = searchTerm.toLowerCase();
        return (
            item.nombre.toLowerCase().includes(term) ||
            (item.codigo_barras && item.codigo_barras.includes(term)) ||
            (item.marca && item.marca.toLowerCase().includes(term))
        );
    });

    // Manejo de cambio de página
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Escáner
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() !== '') {
            const code = searchTerm.trim();
            const found = inventory.find(p => p.codigo_barras === code);
            
            if (found) {
                if (userRole === 'admin') {
                    setSelectedProduct(found);
                    setStockModalOpen(true);
                    setStockQuantity('');
                } else {
                    setToast({ 
                        open: true, 
                        msg: `Producto Encontrado: ${found.nombre} | Stock: ${found.cantidad}`, 
                        severity: 'info' 
                    });
                }
            } else {
                setScannedCode(code);
                setConfirmNewOpen(true);
            }
            setSearchTerm(''); 
        }
    };

    // --- STOCK: INGRESAR O RETIRAR ---
    const handleStockChange = async (isAdding) => {
        if (!stockQuantity || parseInt(stockQuantity) <= 0) return;
        
        const finalQuantity = isAdding ? parseInt(stockQuantity) : -parseInt(stockQuantity);

        try {
            const token = localStorage.getItem('authToken');
            await API.post(`/inventory/add-stock`, {
                producto_id: selectedProduct.id,
                cantidad: finalQuantity
            }, { headers: { Authorization: `Bearer ${token}` } });

            setToast({ open: true, msg: isAdding ? 'Stock agregado correctamente' : 'Stock retirado correctamente', severity: 'success' });
            setStockModalOpen(false);
            fetchInventory(); 
        } catch (err) { 
            setToast({ open: true, msg: 'Error al actualizar stock', severity: 'error' });
        }
    };

    // --- AGREGAR AL CARRITO (F3) ---
    const handleAddToCart = () => {
        if (viewImageIndex === null) return;
        
        // CORRECCIÓN PARA QUE FUNCIONE CON PAGINACIÓN
        // Obtenemos el producto correcto de la lista filtrada completa
        const product = filteredInventory[viewImageIndex]; 
        
        if (!product) return;

        const storedCart = localStorage.getItem('pos_cart_temp');
        let currentCart = storedCart ? JSON.parse(storedCart) : [];

        const existingIndex = currentCart.findIndex(item => item.id === product.id);
        if (existingIndex >= 0) {
            if (currentCart[existingIndex].qty + 1 > Number(product.cantidad)) {
                setToast({ open: true, msg: `Stock insuficiente. Máx: ${product.cantidad}`, severity: 'warning' });
                return;
            }
            currentCart[existingIndex].qty += 1;
            localStorage.setItem('pos_cart_temp', JSON.stringify(currentCart));
            setToast({ open: true, msg: 'Cantidad aumentada en el carrito POS', severity: 'success' });
        } else {
            const precioEfectivo = product.precio_oferta ? Number(product.precio_oferta) : Number(product.precio_venta);
            currentCart.push({ ...product, precio_venta: precioEfectivo, qty: 1 });
            localStorage.setItem('pos_cart_temp', JSON.stringify(currentCart));
            setToast({ open: true, msg: '¡Agregado al Carrito! (Ve al Punto de Venta)', severity: 'success' });
        }
    };

    // --- NAVEGACIÓN GALERÍA ---
    const handleNextImage = () => viewImageIndex < filteredInventory.length - 1 && setViewImageIndex(viewImageIndex + 1);
    const handlePrevImage = () => viewImageIndex > 0 && setViewImageIndex(viewImageIndex - 1);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (viewImageIndex === null) return; 

            if (e.key === 'ArrowRight') handleNextImage();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'Escape') setViewImageIndex(null);
            
            if (e.key === 'F3') {
                e.preventDefault();
                handleAddToCart();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewImageIndex, filteredInventory]);

    const currentGalleryProduct = viewImageIndex !== null ? filteredInventory[viewImageIndex] : null;

    // --- RESTO DE MANEJADORES ---
    const handleOpenCreate = () => { setModalData(null); setOpenCreateModal(true); };
    const handleOpenEdit = (product) => { setModalData(product); setOpenCreateModal(true); };
    const handleCreateFromScan = () => { setModalData({ codigo_barras: scannedCode }); setConfirmNewOpen(false); setOpenCreateModal(true); };
    const handleDeleteClick = (product) => { setProductToDelete(product); setDeleteConfirmOpen(true); };
    const confirmDelete = async () => {
        if (!productToDelete) return;
        try {
            const token = localStorage.getItem('authToken');
            await API.delete(`/inventory/products/${productToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDeleteConfirmOpen(false);
            setProductToDelete(null);
            fetchInventory(); 
            setToast({ open: true, msg: 'Producto eliminado', severity: 'success' });
        } catch (err) { setToast({ open: true, msg: 'No se puede eliminar (tiene ventas registradas)', severity: 'error' }); setDeleteConfirmOpen(false); }
    };

    const handleOpenDiscount = (product) => { setDiscountTarget(product); setDiscountPct(''); setDiscountModalOpen(true); };

    const handleApplyDiscount = async () => {
        const pct = parseFloat(discountPct);
        if (!discountTarget || isNaN(pct) || pct <= 0 || pct >= 100) {
            setToast({ open: true, msg: 'Ingresa un porcentaje válido (1-99).', severity: 'error' });
            return;
        }
        try {
            const token = localStorage.getItem('authToken');
            await API.post('/inventory/discount', { producto_ids: [discountTarget.id], porcentaje: pct }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento aplicado.', severity: 'success' });
            setDiscountModalOpen(false);
            fetchInventory();
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al aplicar el descuento.', severity: 'error' });
        }
    };

    const handleRemoveDiscount = async () => {
        if (!discountTarget) return;
        try {
            const token = localStorage.getItem('authToken');
            await API.delete('/inventory/discount', {
                data: { producto_ids: [discountTarget.id] },
                headers: { Authorization: `Bearer ${token}` }
            });
            setToast({ open: true, msg: 'Descuento eliminado.', severity: 'success' });
            setDiscountModalOpen(false);
            fetchInventory();
        } catch (err) {
            setToast({ open: true, msg: err.response?.data?.error || 'Error al quitar el descuento.', severity: 'error' });
        }
    };

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    // CÁLCULO DE PRODUCTOS PARA LA PÁGINA ACTUAL
    const visibleProducts = filteredInventory.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* ENCABEZADO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario
                </Typography>
                {/* 🟢 BOTÓN BLOQUEADO PARA CAJEROS */}
                <Button 
                    variant="contained" 
                    startIcon={<Add />} 
                    onClick={handleOpenCreate} 
                    disabled={userRole !== 'admin'}
                    sx={{ borderRadius: 2, px: 3 }}
                >
                    {userRole === 'admin' ? 'Nuevo Producto' : 'Solo Administrador'}
                </Button>
            </Box>

            {/* BUSCADOR */}
            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
                <Search sx={{ color: 'primary.main', mr: 1 }} />
                <TextField
                    inputRef={searchInputRef} autoFocus fullWidth variant="standard" 
                    placeholder="Escanear código o buscar..."
                    value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    onKeyDown={handleSearchKeyDown} InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {/* TABLA */}
            <Paper sx={{ width: '100%', mb: 2, borderRadius: 3, overflow: 'hidden' }} elevation={3}>
                <TableContainer sx={{ maxHeight: '65vh' }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Ingreso</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                                {userRole === 'admin' && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleProducts.map((product) => {
                                // Encontrar el índice REAL en el array completo para que la galería funcione
                                const realIndex = filteredInventory.indexOf(product);
                                
                                return (
                                <TableRow key={product.id} hover sx={{ height: 96 }}>
                                    <TableCell>
                                        <Tooltip title="Ver detalle (Zoom)">
                                            <Avatar
                                                // 🟢 AQUI USAMOS LA URL OPTIMIZADA (Miniatura)
                                                src={getOptimizedImageUrl(product.imagen_url, 140)}
                                                variant="rounded"
                                                onClick={() => setViewImageIndex(realIndex)}
                                                sx={{
                                                    width: 70, height: 70, bgcolor: '#eee', border: '1px solid #ddd', cursor: 'pointer',
                                                    transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.1)' }
                                                }}
                                            >
                                                {product.nombre.charAt(0)}
                                            </Avatar>
                                        </Tooltip>
                                    </TableCell>
                                    <TableCell><Typography fontWeight="bold" variant="body2">{product.nombre}</Typography></TableCell>
                                    <TableCell>{product.marca}</TableCell>
                                    <TableCell><Chip label={product.codigo_barras || "N/A"} size="small" variant="outlined" /></TableCell>
                                    <TableCell align="center">
                                        {product.fecha_creacion ? (
                                            <Chip 
                                                label={monthNames[new Date(product.fecha_creacion).getMonth()]} 
                                                size="small" 
                                                sx={{ 
                                                    bgcolor: badgeColors[new Date(product.fecha_creacion).getMonth()], 
                                                    color: 'white', fontWeight: 'bold', fontSize: '0.7rem'
                                                }} 
                                            />
                                        ) : '-'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {product.precio_oferta ? (
                                            <Box>
                                                <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#999', display: 'block' }}>
                                                    Q{Number(product.precio_venta).toFixed(2)}
                                                </Typography>
                                                <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                    Q{Number(product.precio_oferta).toFixed(2)}
                                                </Typography>
                                            </Box>
                                        ) : (
                                            <Typography sx={{ color: 'green', fontWeight: 'bold' }}>
                                                Q{Number(product.precio_venta).toFixed(2)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    
                                    {/* 🟢 COLUMNA DE STOCK BLINDADA */}
                                    <TableCell align="center">
                                        <Chip 
                                            label={product.cantidad} 
                                            color={product.cantidad < 5 ? "error" : "success"} 
                                            onClick={() => { 
                                                if (userRole === 'admin') {
                                                    setSelectedProduct(product); 
                                                    setStockModalOpen(true); 
                                                    setStockQuantity(''); 
                                                } else {
                                                    setToast({ 
                                                        open: true, 
                                                        msg: 'Solo el Administrador puede modificar el stock.', 
                                                        severity: 'warning' 
                                                    });
                                                }
                                            }}
                                            sx={{ 
                                                cursor: userRole === 'admin' ? 'pointer' : 'default',
                                                minWidth: '40px', 
                                                fontWeight: 'bold' 
                                            }}
                                        />
                                    </TableCell>

                                    {userRole === 'admin' && (
                                        <TableCell align="center">
                                            <IconButton color="warning" onClick={() => handleOpenDiscount(product)} size="small" sx={{ mr: 1 }}><Sell /></IconButton>
                                            <IconButton color="primary" onClick={() => handleOpenEdit(product)} size="small" sx={{ mr: 1 }}><Edit /></IconButton>
                                            <IconButton color="error" onClick={() => handleDeleteClick(product)} size="small"><Delete /></IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )})}
                            {visibleProducts.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        No se encontraron productos.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
                
                {/* 🟢 PAGINACIÓN AL PIE DE TABLA */}
                <TablePagination
                    rowsPerPageOptions={[10, 25, 50]}
                    component="div"
                    count={filteredInventory.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    labelRowsPerPage="Filas por página"
                />
            </Paper>

            {/* --- MODAL 1: REGISTRAR NUEVO --- */}
            <Dialog open={confirmNewOpen} onClose={() => setConfirmNewOpen(false)}>
                <DialogTitle>Producto no encontrado</DialogTitle>
                <DialogContent><DialogContentText>Código <strong>{scannedCode}</strong> no existe. ¿Registrar?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmNewOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleCreateFromScan} variant="contained" autoFocus disabled={userRole !== 'admin'}>Registrar</Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL 2: GESTIÓN DE STOCK --- */}
            <Dialog open={stockModalOpen} onClose={() => setStockModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Ajuste de Inventario</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="h6">{selectedProduct?.nombre}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Stock Actual: <strong>{selectedProduct?.cantidad}</strong>
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton onClick={() => setStockQuantity(prev => Math.max(0, (parseInt(prev)||0) - 1).toString())} color="error">
                                <RemoveCircle fontSize="large" />
                            </IconButton>
                            
                            <TextField
                                autoFocus 
                                type="number" 
                                placeholder="0"
                                value={stockQuantity} 
                                onChange={(e) => setStockQuantity(e.target.value)}
                                inputProps={{ style: { textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' } }}
                                sx={{ width: '100px' }}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleStockChange(true); }}
                            />
                            
                            <IconButton onClick={() => setStockQuantity(prev => ((parseInt(prev)||0) + 1).toString())} color="success">
                                <AddCircle fontSize="large" />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
                    <Button onClick={() => handleStockChange(false)} variant="outlined" color="error" startIcon={<Remove />}>
                        Retirar
                    </Button>
                    <Button onClick={() => handleStockChange(true)} variant="contained" color="success" startIcon={<Add />}>
                        Ingresar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL 3: ELIMINAR --- */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>¿Eliminar Producto?</DialogTitle>
                <DialogContent><DialogContentText>Se borrará permanentemente: <strong>{productToDelete?.nombre}</strong></DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Eliminar</Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL 5: DESCUENTO INDIVIDUAL --- */}
            <Dialog open={discountModalOpen} onClose={() => setDiscountModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Aplicar Descuento</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="h6">{discountTarget?.nombre}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Precio actual: <strong>Q{Number(discountTarget?.precio_venta || 0).toFixed(2)}</strong>
                            {discountTarget?.precio_oferta && (
                                <> — Precio oferta: <strong>Q{Number(discountTarget.precio_oferta).toFixed(2)}</strong></>
                            )}
                        </Typography>
                        <TextField
                            autoFocus
                            type="number"
                            label="% Descuento"
                            value={discountPct}
                            onChange={(e) => setDiscountPct(e.target.value)}
                            sx={{ width: '160px' }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
                    {discountTarget?.precio_oferta && (
                        <Button onClick={handleRemoveDiscount} variant="outlined" color="error">
                            Quitar Descuento
                        </Button>
                    )}
                    <Button onClick={handleApplyDiscount} variant="contained" color="warning">
                        Aplicar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL 4: GALERÍA (URL COMPLETA PARA ZOOM) --- */}
            <Dialog 
                open={viewImageIndex !== null} 
                onClose={() => setViewImageIndex(null)} 
                maxWidth="lg"
                PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none', overflow: 'visible' } }}
            >
                <Box sx={{ position: 'relative', width: 'auto', maxWidth: '90vw', maxHeight: '90vh', bgcolor: 'white', borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: 24 }}>
                    <IconButton onClick={() => { setViewImageIndex(null); setSelectedTalla(null); }} sx={{ position: 'absolute', top: 10, right: 10, zIndex: 50, bgcolor: 'rgba(0,0,0,0.1)', '&:hover':{bgcolor:'rgba(0,0,0,0.2)'} }}>
                        <Close />
                    </IconButton>

                    {currentGalleryProduct && (() => {
                        // Find all products with the same name, brand, color AND price to group sizes.
                        // El precio distingue variantes que comparten nombre (ej: Pines de Q15, Q25, Q35...)
                        const relatedProducts = inventory.filter(p =>
                            p.nombre === currentGalleryProduct.nombre &&
                            p.marca === currentGalleryProduct.marca &&
                            p.color === currentGalleryProduct.color &&
                            Number(p.precio_venta) === Number(currentGalleryProduct.precio_venta)
                        );
                        
                        // Extract unique sizes and their total quantities
                        const sizeMap = {};
                        relatedProducts.forEach(p => {
                            if (!sizeMap[p.talla]) sizeMap[p.talla] = { id: p.id, qty: 0 };
                            sizeMap[p.talla].qty += parseInt(p.cantidad || 0);
                        });
                        const availableSizes = Object.keys(sizeMap).sort();
                        
                        // Si no ha seleccionado talla y hay relacionadas, autoseleccionar la actual si tiene stock
                        if (!selectedTalla && sizeMap[currentGalleryProduct.talla] && sizeMap[currentGalleryProduct.talla].qty > 0) {
                            setTimeout(() => setSelectedTalla(currentGalleryProduct.talla), 0);
                        }

                        const handleAddCartSize = () => {
                            if (!selectedTalla) return setToast({ open: true, msg: 'Selecciona una talla.', severity: 'warning' });
                            // Priorizamos el producto exacto que se está viendo en la galería
                            const targetProduct = (currentGalleryProduct.talla === selectedTalla && currentGalleryProduct.cantidad > 0)
                                ? currentGalleryProduct
                                : relatedProducts.find(p => p.talla === selectedTalla && p.cantidad > 0);
                            if (!targetProduct) return setToast({ open: true, msg: 'Talla sin stock.', severity: 'error' });

                            // Emular presionar F3 pasándole el producto exacto
                            let cart = JSON.parse(localStorage.getItem('pos_persistent_cart')) || [];
                            const existingIndex = cart.findIndex(i => i.id === targetProduct.id);
                            if (existingIndex >= 0) {
                                if (cart[existingIndex].qty + 1 > Number(targetProduct.cantidad)) {
                                    setToast({ open: true, msg: `Stock insuficiente. Máx: ${targetProduct.cantidad}`, severity: 'warning' });
                                    return;
                                }
                                cart[existingIndex].qty += 1;
                                setToast({ open: true, msg: 'Cantidad aumentada en el carrito', severity: 'success' });
                            } else {
                                const precioEfectivo = targetProduct.precio_oferta ? Number(targetProduct.precio_oferta) : Number(targetProduct.precio_venta);
                                cart.push({ ...targetProduct, precio_venta: precioEfectivo, qty: 1 });
                                setToast({ open: true, msg: '¡Agregado al Carrito!', severity: 'success' });
                            }
                            localStorage.setItem('pos_persistent_cart', JSON.stringify(cart));
                            setViewImageIndex(null);
                            setSelectedTalla(null);
                        };

                        return (
                        <>
                            <Box sx={{ width: '100%', minWidth: {xs: '300px', md: '500px'}, height: '55vh', display: 'flex', justifyContent: 'center', alignItems: 'center', bgcolor: '#f8f9fa', position: 'relative' }}>
                                <IconButton onClick={() => { handlePrevImage(); setSelectedTalla(null); }} disabled={viewImageIndex === 0} sx={{ position: 'absolute', left: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover':{bgcolor:'white'}, display: viewImageIndex === 0 ? 'none' : 'flex' }}>
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

                                <IconButton onClick={() => { handleNextImage(); setSelectedTalla(null); }} disabled={viewImageIndex === filteredInventory.length - 1} sx={{ position: 'absolute', right: 10, bgcolor: 'rgba(255,255,255,0.7)', '&:hover':{bgcolor:'white'}, display: viewImageIndex === filteredInventory.length - 1 ? 'none' : 'flex' }}>
                                    <ArrowForward />
                                </IconButton>
                            </Box>
                            
                            <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid #eee' }}>
                                <Typography variant="h5" fontWeight="bold">{currentGalleryProduct.nombre}</Typography>
                                <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 1 }}>
                                    {currentGalleryProduct.marca} - {currentGalleryProduct.color || 'Sin color'} 
                                    <Chip size="small" label={currentGalleryProduct.categoria || 'Sin Cat'} sx={{ ml: 1 }} />
                                </Typography>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 2 }}>
                                    <Typography variant="body2" fontWeight="bold">Tallas Disponibles:</Typography>
                                    {availableSizes.length > 0 ? availableSizes.map(sz => {
                                        const inStock = sizeMap[sz].qty > 0;
                                        return (
                                            <Chip 
                                                key={sz} 
                                                label={inStock ? sz : `${sz} (x)`} 
                                                color={selectedTalla === sz ? "primary" : "default"}
                                                variant={selectedTalla === sz ? "filled" : "outlined"}
                                                onClick={() => inStock ? setSelectedTalla(sz) : null}
                                                sx={{ 
                                                    cursor: inStock ? 'pointer' : 'not-allowed', 
                                                    opacity: inStock ? 1 : 0.5,
                                                    textDecoration: inStock ? 'none' : 'line-through',
                                                    fontWeight: 'bold'
                                                }}
                                            />
                                        );
                                    }) : (
                                        <Typography variant="caption" color="error">No hay tallas configuradas</Typography>
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                                    <Chip label={`Stock Total: ${Object.values(sizeMap).reduce((a,b)=>a+b.qty,0)}`} color="success" />
                                    <Chip label={`Precio: Q${Number(currentGalleryProduct.precio_venta).toFixed(2)}`} variant="outlined" />
                                </Box>

                                <Button variant="contained" color="secondary" size="large" startIcon={<ShoppingCart />} onClick={handleAddCartSize} disabled={!selectedTalla} sx={{ px: 4, py: 1, borderRadius: 5, fontWeight: 'bold' }}>
                                    Agregar Talla Seleccionada al Carrito
                                </Button>
                            </Box>
                        </>
                        );
                    })()}
                </Box>
            </Dialog>

            {/* Create Modal */}
            <CreateProductModal 
                open={openCreateModal} 
                handleClose={() => setOpenCreateModal(false)} 
                fetchInventory={fetchInventory}
                getToken={() => localStorage.getItem('authToken')}
                initialData={modalData || (scannedCode ? { codigo_barras: scannedCode } : null)} 
            />
            
            {/* Mensajes Flotantes (Toasts) */}
            <Snackbar 
                open={toast.open} 
                autoHideDuration={3000} 
                onClose={() => setToast({...toast, open: false})}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToast({...toast, open: false})} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default InventoryDashboard;
