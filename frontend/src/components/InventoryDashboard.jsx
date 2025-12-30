import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar,
    Tooltip, Snackbar
} from '@mui/material';
import { 
    Add, Search, Delete, Edit, Close, 
    ArrowBack, ArrowForward, ImageNotSupported,
    ShoppingCart, Remove, AddCircle, RemoveCircle
} from '@mui/icons-material';

import CreateProductModal from './CreateProductModal'; 

const InventoryDashboard = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');
    
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

    // Refs
    const searchInputRef = useRef(null);

    // --- CARGAR DATOS ---
    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                // Aseguramos leer el rol correctamente y pasarlo a minúsculas
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

    // Escáner
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() !== '') {
            const code = searchTerm.trim();
            const found = inventory.find(p => p.codigo_barras === code);
            
            if (found) {
                // 🔒 VALIDACIÓN DE SEGURIDAD PARA ESCÁNER
                if (userRole === 'admin') {
                    setSelectedProduct(found);
                    setStockModalOpen(true);
                    setStockQuantity('');
                } else {
                    // Si es cajero, solo le avisamos que existe y cuánto hay
                    setToast({ 
                        open: true, 
                        msg: `Producto Encontrado: ${found.nombre} | Stock: ${found.cantidad}`, 
                        severity: 'info' 
                    });
                }
            } else {
                // Si no existe, sugerimos crear (esto también podrías restringirlo si quisieras)
                setScannedCode(code);
                setConfirmNewOpen(true);
            }
            setSearchTerm(''); 
        }
    };

    // --- STOCK: INGRESAR O RETIRAR ---
    const handleStockChange = async (isAdding) => {
        if (!stockQuantity || parseInt(stockQuantity) <= 0) return;
        
        // Si es 'isAdding' (true) -> Cantidad positiva. Si es false -> Negativa (Resta)
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
        const product = filteredInventory[viewImageIndex];
        if (!product) return;

        // Leemos el carrito actual del localStorage (si existe)
        const storedCart = localStorage.getItem('pos_cart_temp');
        let currentCart = storedCart ? JSON.parse(storedCart) : [];

        // Verificar si ya está
        const existingItem = currentCart.find(item => item.id === product.id);
        if (existingItem) {
            setToast({ open: true, msg: 'El producto ya está en el carrito POS', severity: 'info' });
        } else {
            currentCart.push({ ...product, qty: 1 });
            localStorage.setItem('pos_cart_temp', JSON.stringify(currentCart));
            setToast({ open: true, msg: '¡Agregado al Carrito! (Ve al Punto de Venta)', severity: 'success' });
        }
    };

    // --- NAVEGACIÓN GALERÍA ---
    const handleNextImage = () => viewImageIndex < filteredInventory.length - 1 && setViewImageIndex(viewImageIndex + 1);
    const handlePrevImage = () => viewImageIndex > 0 && setViewImageIndex(viewImageIndex - 1);

    // Teclas en Galería (Flechas y F3)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (viewImageIndex === null) return; 

            if (e.key === 'ArrowRight') handleNextImage();
            if (e.key === 'ArrowLeft') handlePrevImage();
            if (e.key === 'Escape') setViewImageIndex(null);
            
            // 🟢 F3 para Vender
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

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* ENCABEZADO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario
                </Typography>
                <Button variant="contained" startIcon={<Add />} onClick={handleOpenCreate} sx={{ borderRadius: 2, px: 3 }}>
                    Nuevo Producto
                </Button>
            </Box>

            {/* BUSCADOR */}
            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
                <Search sx={{ color: 'primary.main', mr: 1 }} />
                <TextField
                    inputRef={searchInputRef} autoFocus fullWidth variant="standard" 
                    placeholder="Escanear código o buscar..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown} InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {/* TABLA */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: '65vh' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Precio</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Stock</TableCell>
                            {userRole === 'admin' && <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInventory.map((product, index) => (
                            <TableRow key={product.id} hover>
                                <TableCell>
                                    <Tooltip title="Ver detalle (Zoom)">
                                        <Avatar 
                                            src={product.imagen_url} 
                                            variant="rounded" 
                                            onClick={() => setViewImageIndex(index)}
                                            sx={{ 
                                                width: 50, height: 50, bgcolor: '#eee', border: '1px solid #ddd', cursor: 'pointer',
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
                                <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>Q{Number(product.precio_venta).toFixed(2)}</TableCell>
                                
                                {/* 🟢 COLUMNA DE STOCK BLINDADA */}
                                <TableCell align="center">
                                    <Chip 
                                        label={product.cantidad} 
                                        color={product.cantidad < 5 ? "error" : "success"} 
                                        onClick={() => { 
                                            // 🔒 VALIDACIÓN DE SEGURIDAD AL HACER CLICK
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
                                            cursor: userRole === 'admin' ? 'pointer' : 'default', // Cursor cambia según el rol
                                            minWidth: '40px', 
                                            fontWeight: 'bold' 
                                        }}
                                    />
                                </TableCell>

                                {userRole === 'admin' && (
                                    <TableCell align="center">
                                        <IconButton color="primary" onClick={() => handleOpenEdit(product)} size="small" sx={{ mr: 1 }}><Edit /></IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteClick(product)} size="small"><Delete /></IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* --- MODAL 1: REGISTRAR NUEVO --- */}
            <Dialog open={confirmNewOpen} onClose={() => setConfirmNewOpen(false)}>
                <DialogTitle>Producto no encontrado</DialogTitle>
                <DialogContent><DialogContentText>Código <strong>{scannedCode}</strong> no existe. ¿Registrar?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmNewOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleCreateFromScan} variant="contained" autoFocus>Registrar</Button>
                </DialogActions>
            </Dialog>

            {/* --- MODAL 2: GESTIÓN DE STOCK (MEJORADO + y -) --- */}
            <Dialog open={stockModalOpen} onClose={() => setStockModalOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', fontWeight: 'bold' }}>Ajuste de Inventario</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mt: 1 }}>
                        <Typography variant="h6">{selectedProduct?.nombre}</Typography>
                        <Typography variant="body2" color="textSecondary">
                            Stock Actual: <strong>{selectedProduct?.cantidad}</strong>
                        </Typography>
                        
                        {/* Controles + y - */}
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
                                onKeyDown={(e) => { if (e.key === 'Enter') handleStockChange(true); }} // Enter por defecto suma
                            />
                            
                            <IconButton onClick={() => setStockQuantity(prev => ((parseInt(prev)||0) + 1).toString())} color="success">
                                <AddCircle fontSize="large" />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: 'center', pb: 3, gap: 2 }}>
                    <Button 
                        onClick={() => handleStockChange(false)} // False = Restar
                        variant="outlined" color="error" 
                        startIcon={<Remove />}
                    >
                        Retirar
                    </Button>
                    <Button 
                        onClick={() => handleStockChange(true)} // True = Sumar
                        variant="contained" color="success" 
                        startIcon={<Add />}
                    >
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

            {/* --- MODAL 4: GALERÍA MEJORADA (Sin Scrollbar) --- */}
            <Dialog 
                open={viewImageIndex !== null} 
                onClose={() => setViewImageIndex(null)} 
                maxWidth="lg"
                PaperProps={{ 
                    style: { 
                        backgroundColor: 'transparent', 
                        boxShadow: 'none', 
                        overflow: 'visible' // Permitir botones flotantes si fuera necesario, pero los pondremos dentro
                    } 
                }}
            >
                <Box 
                    sx={{
                        position: 'relative', 
                        width: 'auto',
                        maxWidth: '90vw', // Limita el ancho al 90% de la pantalla
                        maxHeight: '90vh',
                        bgcolor: 'white', 
                        borderRadius: 3,
                        display: 'flex', flexDirection: 'column', 
                        overflow: 'hidden', // 🟢 CLAVE: Oculta scrollbars
                        boxShadow: 24
                    }}
                >
                    {/* Botón CERRAR */}
                    <IconButton 
                        onClick={() => setViewImageIndex(null)}
                        sx={{ position: 'absolute', top: 10, right: 10, zIndex: 50, bgcolor: 'rgba(0,0,0,0.1)', '&:hover':{bgcolor:'rgba(0,0,0,0.2)'} }}
                    >
                        <Close />
                    </IconButton>

                    {currentGalleryProduct && (
                        <>
                            {/* IMAGEN */}
                            <Box sx={{ 
                                width: '100%', minWidth: {xs: '300px', md: '500px'}, height: '60vh', 
                                display: 'flex', justifyContent: 'center', alignItems: 'center', 
                                bgcolor: '#f8f9fa', position: 'relative' 
                            }}>
                                {/* Flecha Izquierda (FLOTANTE DENTRO) */}
                                <IconButton 
                                    onClick={handlePrevImage} disabled={viewImageIndex === 0}
                                    sx={{ 
                                        position: 'absolute', left: 10, 
                                        bgcolor: 'rgba(255,255,255,0.7)', '&:hover':{bgcolor:'white'},
                                        display: viewImageIndex === 0 ? 'none' : 'flex'
                                    }}
                                >
                                    <ArrowBack />
                                </IconButton>

                                {/* Foto */}
                                {currentGalleryProduct.imagen_url ? (
                                    <img 
                                        src={currentGalleryProduct.imagen_url} 
                                        alt="Detalle" 
                                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                                    />
                                ) : (
                                    <Box display="flex" flexDirection="column" alignItems="center" color="text.secondary">
                                        <ImageNotSupported sx={{ fontSize: 80, opacity: 0.3 }} />
                                        <Typography variant="caption">Sin Imagen</Typography>
                                    </Box>
                                )}

                                {/* Flecha Derecha (FLOTANTE DENTRO) */}
                                <IconButton 
                                    onClick={handleNextImage} disabled={viewImageIndex === filteredInventory.length - 1}
                                    sx={{ 
                                        position: 'absolute', right: 10, 
                                        bgcolor: 'rgba(255,255,255,0.7)', '&:hover':{bgcolor:'white'},
                                        display: viewImageIndex === filteredInventory.length - 1 ? 'none' : 'flex'
                                    }}
                                >
                                    <ArrowForward />
                                </IconButton>
                            </Box>
                            
                            {/* INFO + BOTÓN VENDER (F3) */}
                            <Box sx={{ p: 3, textAlign: 'center', borderTop: '1px solid #eee' }}>
                                <Typography variant="h5" fontWeight="bold">{currentGalleryProduct.nombre}</Typography>
                                <Typography variant="subtitle1" color="textSecondary" sx={{ mb: 2 }}>
                                    {currentGalleryProduct.marca} - {currentGalleryProduct.codigo_barras}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 2 }}>
                                    <Chip label={`Stock: ${currentGalleryProduct.cantidad}`} color={currentGalleryProduct.cantidad > 0 ? "success" : "error"} />
                                    <Chip label={`Precio: Q${Number(currentGalleryProduct.precio_venta).toFixed(2)}`} variant="outlined" />
                                </Box>

                                {/* 🟢 BOTÓN AGREGAR AL CARRITO (F3) */}
                                <Button 
                                    variant="contained" 
                                    color="secondary" 
                                    size="large"
                                    startIcon={<ShoppingCart />}
                                    onClick={handleAddToCart}
                                    sx={{ px: 4, py: 1, borderRadius: 5, fontWeight: 'bold' }}
                                >
                                    Agregar al Carrito (F3)
                                </Button>
                            </Box>
                        </>
                    )}
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
