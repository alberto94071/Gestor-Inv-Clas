import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete'; 
import CreateProductModal from './CreateProductModal'; // El modal con cámara y Cloudinary

const InventoryDashboard = () => {
    // --- ESTADOS ---
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');
    
    // Estados para Modales
    const [openCreateModal, setOpenCreateModal] = useState(false);
    const [scannedCode, setScannedCode] = useState('');
    
    // Modal Confirmación de "Código Nuevo"
    const [confirmNewOpen, setConfirmNewOpen] = useState(false);
    
    // Modal Eliminar
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    // Modal para Aumentar Stock (Mercadería Nueva)
    const [stockModalOpen, setStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [addQuantity, setAddQuantity] = useState('');

    // --- CARGAR DATOS ---
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
            console.error("Error:", err);
            setError("Error de conexión al cargar inventario.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    // --- LÓGICA INTELIGENTE DE ESCANEO ---
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() !== '') {
            const code = searchTerm.trim();
            const found = inventory.find(p => p.codigo_barras === code);
            
            if (found) {
                // CASO 1: El producto YA existe -> Abrir modal de Stock
                setSelectedProduct(found);
                setStockModalOpen(true);
                setAddQuantity(''); // Limpiar campo
            } else {
                // CASO 2: El producto NO existe -> Preguntar si crear
                setScannedCode(code);
                setConfirmNewOpen(true);
            }
            setSearchTerm(''); // Limpiar barra de búsqueda
        }
    };

    // --- GUARDAR AUMENTO DE STOCK ---
    const handleUpdateStock = async () => {
        if (!addQuantity || parseInt(addQuantity) <= 0) return;

        try {
            const token = localStorage.getItem('authToken');
            // Llamamos a la ruta del backend para sumar cantidad
            await API.post(`/inventory/add-stock`, {
                producto_id: selectedProduct.id,
                cantidad: parseInt(addQuantity)
            }, { headers: { Authorization: `Bearer ${token}` } });

            setStockModalOpen(false);
            fetchInventory(); // Recargar tabla para ver el cambio
        } catch (err) {
            alert("Error al actualizar el stock.");
        }
    };

    // --- ELIMINAR PRODUCTO ---
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
            alert("No se pudo eliminar el producto.");
            setDeleteConfirmOpen(false);
        }
    };

    // Filtros de búsqueda visual
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
            {/* ENCABEZADO */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario General
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => { setScannedCode(''); setOpenCreateModal(true); }}
                    sx={{ borderRadius: 2 }}
                >
                    Nuevo Producto
                </Button>
            </Box>

            {/* BARRA DE BÚSQUEDA / ESCÁNER */}
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

            {/* TABLA DE PRODUCTOS */}
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
                                    <Avatar 
                                        src={product.imagen_url} 
                                        variant="rounded" 
                                        sx={{ width: 50, height: 50, bgcolor: '#eee' }}
                                    >
                                        {product.nombre.charAt(0)}
                                    </Avatar>
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
                                        // Al hacer clic en el stock, abrimos el modal para sumar manualmente también
                                        onClick={() => { setSelectedProduct(product); setStockModalOpen(true); }}
                                        sx={{ cursor: 'pointer', minWidth: '40px' }}
                                    />
                                </TableCell>
                                {userRole === 'admin' && (
                                    <TableCell align="center">
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

            {/* MODAL 1: ¿REGISTRAR NUEVO? (Cuando el código no existe) */}
            <Dialog open={confirmNewOpen} onClose={() => setConfirmNewOpen(false)}>
                <DialogTitle>Producto no encontrado</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        El código <strong>{scannedCode}</strong> no está en el sistema. <br/>
                        ¿Deseas registrar un producto nuevo con este código?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmNewOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={() => { setConfirmNewOpen(false); setOpenCreateModal(true); }} variant="contained" autoFocus>
                        Registrar Nuevo
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 2: SUMAR STOCK (Cuando el código YA existe) */}
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
                        autoFocus
                        label="Cantidad a sumar (+)"
                        type="number"
                        fullWidth
                        value={addQuantity}
                        onChange={(e) => setAddQuantity(e.target.value)}
                        placeholder="Ej: 12"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setStockModalOpen(false)} color="secondary">Cancelar</Button>
                    <Button onClick={handleUpdateStock} variant="contained" color="success">
                        Sumar al Inventario
                    </Button>
                </DialogActions>
            </Dialog>

            {/* MODAL 3: ELIMINAR */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>¿Eliminar Producto?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de eliminar <strong>{productToDelete?.nombre}</strong>?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
                    <Button onClick={confirmDelete} color="error" variant="contained">Eliminar</Button>
                </DialogActions>
            </Dialog>

            {/* MODAL PRINCIPAL: FORMULARIO DE CREACIÓN (Con Cámara) */}
            <CreateProductModal 
                open={openCreateModal} 
                handleClose={() => setOpenCreateModal(false)} 
                fetchInventory={fetchInventory}
                getToken={() => localStorage.getItem('authToken')}
                // Pasamos el código escaneado (si hubo) para que se llene solo
                initialData={scannedCode ? { codigo_barras: scannedCode } : null} 
            />
        </Container>
    );
};

export default InventoryDashboard;