import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete'; 
import EditIcon from '@mui/icons-material/Edit'; 
import CloseIcon from '@mui/icons-material/Close'; // Icono para cerrar zoom
import CreateProductModal from './CreateProductModal'; 

const InventoryDashboard = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');
    
    // Estados Modales Gestión
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [modalData, setModalData] = useState(null);
    
    // Estados Lógica Escáner
    const [scannedCode, setScannedCode] = useState('');
    const [confirmNewOpen, setConfirmNewOpen] = useState(false);
    
    // Estados Acciones
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [addQuantity, setAddQuantity] = useState('');

    // 🟢 NUEVO ESTADO: Para ver la imagen en grande
    const [viewImage, setViewImage] = useState(null);

    // --- CARGAR INVENTARIO ---
    const fetchInventory = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const userStr = localStorage.getItem('user');
            if (userStr) {
                const userObj = JSON.parse(userStr);
                setUserRole(userObj.rol || '');
            }

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

    useEffect(() => {
        fetchInventory();
    }, []);

    // --- LÓGICA DE ESCANEO ---
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() !== '') {
            const code = searchTerm.trim();
            const found = inventory.find(p => p.codigo_barras === code);
            
            if (found) {
                setSelectedProduct(found);
                setStockModalOpen(true);
                setAddQuantity('');
            } else {
                setScannedCode(code);
                setConfirmNewOpen(true);
            }
            setSearchTerm(''); 
        }
    };

    // --- MANEJADORES ---
    const handleOpenCreate = () => {
        setModalData(null); 
        setOpenCreateModal(true);
    };

    const handleOpenEdit = (product) => {
        setModalData(product); 
        setOpenCreateModal(true);
    };

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
        } catch (err) {
            alert("Error al actualizar stock.");
        }
    };

    const handleDeleteClick = (product) => {
        setProductToDelete(product);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        try {
            const token = localStorage.getItem('authToken');
            await API.delete(`/inventory/products/${productToDelete.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDeleteConfirmOpen(false);
            setProductToDelete(null);
            fetchInventory(); 
        } catch (err) {
            alert("Error al eliminar.");
            setDeleteConfirmOpen(false);
        }
    };

    const filteredInventory = inventory.filter((item) => {
        const term = searchTerm.toLowerCase();
        return (
            item.nombre.toLowerCase().includes(term) ||
            (item.codigo_barras && item.codigo_barras.includes(term)) ||
            (item.marca && item.marca.toLowerCase().includes(term))
        );
    });

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario General
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={handleOpenCreate}
                    sx={{ borderRadius: 2 }}
                >
                    Nuevo Producto
                </Button>
            </Box>

            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center', border: '1px solid #ddd' }}>
                <SearchIcon sx={{ color: 'primary.main', mr: 1 }} />
                <TextField
                    fullWidth 
                    variant="standard" 
                    placeholder="Escanear código o buscar por nombre..."
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    InputProps={{ disableUnderline: true }}
                />
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

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
                        {filteredInventory.map((product) => (
                            <TableRow key={product.id} hover>
                                <TableCell>
                                    {/* 🟢 AL HACER CLIC, SE ABRE EL ZOOM */}
                                    <Tooltip title="Ver imagen grande">
                                        <Avatar 
                                            src={product.imagen_url} 
                                            variant="rounded" 
                                            onClick={() => { if(product.imagen_url) setViewImage(product.imagen_url) }}
                                            sx={{ 
                                                width: 50, height: 50, bgcolor: '#eee', border: '1px solid #ddd',
                                                cursor: product.imagen_url ? 'pointer' : 'default',
                                                transition: 'transform 0.2s',
                                                '&:hover': product.imagen_url ? { transform: 'scale(1.1)' } : {}
                                            }}
                                        >
                                            {product.nombre.charAt(0)}
                                        </Avatar>
                                    </Tooltip>
                                </TableCell>
                                <TableCell>
                                    <Typography fontWeight="bold" variant="body2">{product.nombre}</Typography>
                                </TableCell>
                                <TableCell>{product.marca}</TableCell>
                                <TableCell><Chip label={product.codigo_barras || "N/A"} size="small" variant="outlined" /></TableCell>
                                <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>
                                    Q{Number(product.precio_venta).toFixed(2)}
                                </TableCell>
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
                                        <IconButton color="primary" onClick={() => handleOpenEdit(product)} size="small" sx={{ mr: 1 }}>
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton color="error" onClick={() => handleDeleteClick(product)} size="small">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* --- MODALES --- */}

            {/* 1. Confirmar Código Nuevo */}
            <Dialog open={confirmNewOpen} onClose={() => setConfirmNewOpen(false)}>
                <DialogTitle>Producto no encontrado</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        El código <strong>{scannedCode}</strong> no existe. <br/>
                        ¿Deseas registrarlo ahora?
                    </DialogContentText>
                </DialogContent>
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
                            <Typography variant="body2" color="textSecondary">Stock Actual: <strong>{selectedProduct?.cantidad}</strong></Typography>
                        </Box>
                    </Box>
                    <TextField
                        autoFocus label="Cantidad a sumar (+)" type="number" fullWidth
                        value={addQuantity} onChange={(e) => setAddQuantity(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStockModalOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleUpdateStock} variant="contained" color="success">Sumar</Button>
                </DialogActions>
            </Dialog>

            {/* 3. Confirmar Eliminación */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>¿Eliminar Producto?</DialogTitle>
                <DialogContent>
                    <DialogContentText>¿Seguro que deseas eliminar <strong>{productToDelete?.nombre}</strong>?</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Eliminar</Button>
                </DialogActions>
            </Dialog>

            {/* 🟢 4. MODAL VISUALIZADOR DE IMAGEN (ZOOM) */}
            <Dialog 
                open={!!viewImage} 
                onClose={() => setViewImage(null)} 
                maxWidth="md"
                // Fondo transparente oscuro
                PaperProps={{
                    style: { backgroundColor: 'transparent', boxShadow: 'none' },
                }}
            >
                <Box position="relative" display="flex" justifyContent="center" alignItems="center">
                    {/* Botón X flotante para cerrar */}
                    <IconButton 
                        onClick={() => setViewImage(null)}
                        sx={{ 
                            position: 'absolute', top: -40, right: 0, 
                            color: 'white', bgcolor: 'rgba(0,0,0,0.5)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                    
                    <img 
                        src={viewImage} 
                        alt="Zoom" 
                        style={{ 
                            maxWidth: '90vw', 
                            maxHeight: '85vh', 
                            borderRadius: '8px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)' 
                        }} 
                    />
                </Box>
            </Dialog>

            {/* 5. MODAL FORMULARIO (Crear/Editar) */}
            <CreateProductModal 
                open={openCreateModal} 
                handleClose={() => setOpenCreateModal(false)} 
                fetchInventory={fetchInventory}
                getToken={() => localStorage.getItem('authToken')}
                initialData={modalData} 
            />
        </Container>
    );
};

export default InventoryDashboard;