import React, { useState, useEffect, useRef } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar,
    Tooltip
} from '@mui/material';
import { 
    Add, Search, Delete, Edit, Close, 
    ArrowBack, ArrowForward, Assessment // Iconos nuevos
} from '@mui/icons-material';

// Asegúrate de tener este componente creado (el que te pasé en el paso anterior)
// Si no lo tienes aún, el botón de "Reportes" no hará nada o dará error, 
// puedes comentar la importación si prefieres agregarlo luego.
// import AdminTools from './AdminTools'; 
import CreateProductModal from './CreateProductModal'; 

// Componente auxiliar simple para navegar a herramientas (si usas React Router)
import { useNavigate } from 'react-router-dom'; 

const InventoryDashboard = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');
    
    // Modales de Gestión
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [modalData, setModalData] = useState(null); // Datos para editar o crear con código
    
    // Lógica Escáner
    const [scannedCode, setScannedCode] = useState('');
    const [confirmNewOpen, setConfirmNewOpen] = useState(false);
    
    // Acciones Rápidas
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [addQuantity, setAddQuantity] = useState('');

    // 🟢 GALERÍA DE IMÁGENES
    // Guardamos el ÍNDICE de la lista filtrada, no el producto directo, para poder navegar
    const [viewImageIndex, setViewImageIndex] = useState(null);

    // Auto-focus ref
    const searchInputRef = useRef(null);
    const navigate = useNavigate(); // Para ir a AdminTools si usas rutas

    // --- CARGAR DATOS ---
    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');
            if (userStr) setUserRole(JSON.parse(userStr).rol || '');

            const response = await API.get('/inventory/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInventory(response.data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError("Error de conexión al cargar inventario.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInventory(); }, []);

    // --- AUTO-FOCUS INTELIGENTE ---
    useEffect(() => {
        if (!openCreateModal && !stockModalOpen && !confirmNewOpen && !deleteConfirmOpen && viewImageIndex === null) {
            setTimeout(() => {
                if (searchInputRef.current) searchInputRef.current.focus();
            }, 100);
        }
    }, [openCreateModal, stockModalOpen, confirmNewOpen, deleteConfirmOpen, viewImageIndex]);

    // --- FILTRADO (Se ejecuta antes del render para usarlo en la galería) ---
    const filteredInventory = inventory.filter((item) => {
        const term = searchTerm.toLowerCase();
        return (
            item.nombre.toLowerCase().includes(term) ||
            (item.codigo_barras && item.codigo_barras.includes(term)) ||
            (item.marca && item.marca.toLowerCase().includes(term))
        );
    });

    // --- LÓGICA ESCÁNER ---
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() !== '') {
            const code = searchTerm.trim();
            const found = inventory.find(p => p.codigo_barras === code);
            
            if (found) {
                // Producto existe -> Sumar Stock
                setSelectedProduct(found);
                setStockModalOpen(true);
                setAddQuantity('');
            } else {
                // Producto nuevo -> Crear (El backend le pondrá 1 unidad por defecto)
                setScannedCode(code);
                setConfirmNewOpen(true);
            }
            setSearchTerm(''); 
        }
    };

    // --- MANEJADORES DE GALERÍA ---
    const handleNextImage = () => {
        if (viewImageIndex !== null && viewImageIndex < filteredInventory.length - 1) {
            setViewImageIndex(viewImageIndex + 1);
        }
    };
    const handlePrevImage = () => {
        if (viewImageIndex !== null && viewImageIndex > 0) {
            setViewImageIndex(viewImageIndex - 1);
        }
    };
    // Producto actual en la galería
    const currentGalleryProduct = viewImageIndex !== null ? filteredInventory[viewImageIndex] : null;


    // --- MANEJADORES DE ACCIONES ---
    const handleOpenCreate = () => { setModalData(null); setOpenCreateModal(true); };
    
    const handleOpenEdit = (product) => { setModalData(product); setOpenCreateModal(true); };

    const handleCreateFromScan = () => {
        setModalData({ codigo_barras: scannedCode }); 
        setConfirmNewOpen(false);
        setOpenCreateModal(true);
    };

    const handleUpdateStock = async () => {
        if (!addQuantity || parseInt(addQuantity) <= 0) return;
        try {
            const token = localStorage.getItem('authToken');
            await API.post(`/inventory/add-stock`, {
                producto_id: selectedProduct.id,
                cantidad: parseInt(addQuantity)
            }, { headers: { Authorization: `Bearer ${token}` } });

            setStockModalOpen(false);
            fetchInventory(); 
        } catch (err) { alert("Error al actualizar stock."); }
    };

    const handleDeleteClick = (product) => { setProductToDelete(product); setDeleteConfirmOpen(true); };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        try {
            const token = localStorage.getItem('authToken');
            await API.delete(`/inventory/products/${productToDelete.id}`, { headers: { Authorization: `Bearer ${token}` } });
            setDeleteConfirmOpen(false);
            setProductToDelete(null);
            fetchInventory(); 
        } catch (err) { alert("Error al eliminar (puede tener historial de ventas)."); setDeleteConfirmOpen(false); }
    };

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* ENCABEZADO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario
                </Typography>
                <Box>
                    {/* Botón para ir a Reportes (Admin Tools) */}
                    {userRole === 'admin' && (
                        <Button 
                            variant="outlined" 
                            startIcon={<Assessment />} 
                            onClick={() => navigate('/admin-tools')} // Asumiendo que creaste esta ruta
                            sx={{ mr: 2 }}
                        >
                            Reportes
                        </Button>
                    )}
                    <Button 
                        variant="contained" 
                        startIcon={<Add />} 
                        onClick={handleOpenCreate}
                        sx={{ borderRadius: 2 }}
                    >
                        Nuevo
                    </Button>
                </Box>
            </Box>

            {/* BUSCADOR */}
            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
                <Search sx={{ color: 'primary.main', mr: 1 }} />
                <TextField
                    inputRef={searchInputRef} autoFocus fullWidth variant="standard" 
                    placeholder="Escanear o buscar..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown} InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                                    <Tooltip title="Ver detalles">
                                        <Avatar 
                                            src={product.imagen_url} 
                                            variant="rounded" 
                                            // 🟢 Al hacer clic, pasamos el ÍNDICE de la lista filtrada
                                            onClick={() => { if(product.imagen_url) setViewImageIndex(index) }}
                                            sx={{ 
                                                width: 50, height: 50, bgcolor: '#eee', border: '1px solid #ddd',
                                                cursor: product.imagen_url ? 'pointer' : 'default',
                                                transition: 'transform 0.2s', '&:hover': product.imagen_url ? { transform: 'scale(1.1)' } : {}
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
                                <TableCell align="center">
                                    <Chip 
                                        label={product.cantidad} 
                                        color={product.cantidad < 5 ? "error" : "success"} 
                                        onClick={() => { setSelectedProduct(product); setStockModalOpen(true); }}
                                        sx={{ cursor: 'pointer', minWidth: '40px' }}
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

            {/* --- MODALES --- */}

            {/* 1. Registrar Nuevo (Scanner) */}
            <Dialog open={confirmNewOpen} onClose={() => setConfirmNewOpen(false)}>
                <DialogTitle>Producto no encontrado</DialogTitle>
                <DialogContent><DialogContentText>El código <strong>{scannedCode}</strong> no existe. ¿Registrar?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmNewOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleCreateFromScan} variant="contained" autoFocus>Registrar</Button>
                </DialogActions>
            </Dialog>

            {/* 2. Sumar Stock */}
            <Dialog open={stockModalOpen} onClose={() => setStockModalOpen(false)}>
                <DialogTitle>Ingreso de Mercadería</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, mt: 1 }}>
                        <Avatar src={selectedProduct?.imagen_url} variant="rounded" sx={{ width: 60, height: 60 }} />
                        <Box>
                            <Typography variant="h6">{selectedProduct?.nombre}</Typography>
                            <Typography variant="body2">Stock Actual: <strong>{selectedProduct?.cantidad}</strong></Typography>
                        </Box>
                    </Box>
                    <TextField
                        autoFocus label="Cantidad a sumar (+)" type="number" fullWidth
                        value={addQuantity} onChange={(e) => setAddQuantity(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStock(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStockModalOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleUpdateStock} variant="contained" color="success">Sumar</Button>
                </DialogActions>
            </Dialog>

            {/* 3. Eliminar */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>¿Eliminar Producto?</DialogTitle>
                <DialogContent><DialogContentText>¿Eliminar <strong>{productToDelete?.nombre}</strong>?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Eliminar</Button>
                </DialogActions>
            </Dialog>

            {/* 🟢 4. GALERÍA INTELIGENTE (ZOOM) */}
            <Dialog 
                open={viewImageIndex !== null} 
                onClose={() => setViewImageIndex(null)} 
                maxWidth="lg"
                PaperProps={{ style: { backgroundColor: 'transparent', boxShadow: 'none' } }}
            >
                <Box position="relative" display="flex" justifyContent="center" alignItems="center" height="80vh" width="90vw">
                    
                    {/* Botón ATRÁS */}
                    <IconButton 
                        onClick={handlePrevImage} disabled={viewImageIndex === 0}
                        sx={{ 
                            position: 'absolute', left: 0, zIndex: 10,
                            color: 'white', bgcolor: 'rgba(0,0,0,0.5)', 
                            '&:hover':{bgcolor:'white', color:'black'},
                            visibility: viewImageIndex === 0 ? 'hidden' : 'visible'
                        }}
                    >
                        <ArrowBack fontSize="large" />
                    </IconButton>

                    {/* IMAGEN Y DETALLES */}
                    {currentGalleryProduct && (
                        <Box sx={{ 
                            position: 'relative', bgcolor: 'white', borderRadius: 2, 
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            overflow: 'hidden', maxHeight: '80vh', maxWidth: '80vw'
                        }}>
                            {/* Imagen */}
                            <img 
                                src={currentGalleryProduct.imagen_url} 
                                alt="Zoom" 
                                style={{ maxHeight: '65vh', maxWidth: '100%', objectFit: 'contain', backgroundColor: '#f5f5f5' }} 
                            />
                            
                            {/* Panel de Info (Nombre y Disponibilidad) */}
                            <Box sx={{ p: 2, width: '100%', bgcolor: 'white', borderTop: '1px solid #eee', textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight="bold">{currentGalleryProduct.nombre}</Typography>
                                <Typography variant="subtitle1" color="textSecondary">{currentGalleryProduct.marca}</Typography>
                                
                                <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2, alignItems: 'center' }}>
                                    <Chip 
                                        label={currentGalleryProduct.cantidad > 0 ? "DISPONIBLE" : "AGOTADO"} 
                                        color={currentGalleryProduct.cantidad > 0 ? "success" : "error"} 
                                    />
                                    <Typography variant="h6" fontWeight="bold">
                                        Existencia: {currentGalleryProduct.cantidad}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Botón Cerrar (X) */}
                            <IconButton 
                                onClick={() => setViewImageIndex(null)}
                                sx={{ position: 'absolute', top: 10, right: 10, bgcolor: 'rgba(255,255,255,0.8)', '&:hover':{bgcolor:'white'} }}
                            >
                                <Close />
                            </IconButton>
                        </Box>
                    )}

                    {/* Botón SIGUIENTE */}
                    <IconButton 
                        onClick={handleNextImage} disabled={viewImageIndex === filteredInventory.length - 1}
                        sx={{ 
                            position: 'absolute', right: 0, zIndex: 10,
                            color: 'white', bgcolor: 'rgba(0,0,0,0.5)', 
                            '&:hover':{bgcolor:'white', color:'black'},
                            visibility: viewImageIndex === filteredInventory.length - 1 ? 'hidden' : 'visible'
                        }}
                    >
                        <ArrowForward fontSize="large" />
                    </IconButton>
                </Box>
            </Dialog>

            {/* 5. Modal Crear/Editar */}
            <CreateProductModal 
                open={openCreateModal} 
                handleClose={() => setOpenCreateModal(false)} 
                fetchInventory={fetchInventory}
                getToken={() => localStorage.getItem('authToken')}
                initialData={modalData || (scannedCode ? { codigo_barras: scannedCode } : null)} 
            />
        </Container>
    );
};

export default InventoryDashboard;