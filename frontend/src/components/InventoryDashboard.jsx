// src/components/InventoryDashboard.jsx
import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, InputAdornment, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText, Avatar
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DeleteIcon from '@mui/icons-material/Delete'; 
import CreateProductModal from './CreateProductModal'; // Importamos el modal que hicimos con cámara

const InventoryDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');
    const [openModal, setOpenModal] = useState(false);

    // Modales de confirmación
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

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
            console.error("Error cargando inventario:", err);
            setError("Error de conexión.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const filteredInventory = inventory.filter((item) => {
        const term = searchTerm.toLowerCase();
        return (
            item.nombre.toLowerCase().includes(term) ||
            (item.codigo_barras && item.codigo_barras.includes(term)) ||
            (item.marca && item.marca.toLowerCase().includes(term))
        );
    });

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
            fetchInventory(); 
        } catch (err) {
            alert("Error al eliminar.");
            setDeleteConfirmOpen(false);
        }
    };

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario General
                </Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />} 
                    onClick={() => setOpenModal(true)}
                    sx={{ borderRadius: 2 }}
                >
                    Nuevo Producto
                </Button>
            </Box>

            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                <TextField
                    fullWidth variant="standard" placeholder="Buscar por nombre, marca o código..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{ disableUnderline: true }}
                />
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: '65vh' }}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Foto</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Precio</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Stock</TableCell>
                            {userRole === 'admin' && <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInventory.map((product) => (
                            <TableRow key={product.id} hover sx={{ opacity: product.cantidad > 0 ? 1 : 0.6 }}>
                                <TableCell>
                                    <Avatar 
                                        src={product.imagen_url} 
                                        variant="rounded" 
                                        sx={{ width: 50, height: 50, bgcolor: '#eee' }}
                                    >
                                        {product.nombre.charAt(0)}
                                    </Avatar>
                                </TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>{product.nombre}</TableCell>
                                <TableCell>{product.marca}</TableCell>
                                <TableCell><Chip label={product.codigo_barras} size="small" variant="outlined" /></TableCell>
                                <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>
                                    Q{Number(product.precio_venta).toFixed(2)}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip label={product.cantidad} color={product.cantidad < 5 ? "error" : "success"} size="small" />
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

            {/* Modal para Crear Producto (El que tiene Cloudinary y Cámara) */}
            <CreateProductModal 
                open={openModal} 
                handleClose={() => setOpenModal(false)} 
                fetchInventory={fetchInventory}
                getToken={() => localStorage.getItem('authToken')}
            />

            {/* Diálogo de Confirmación de Eliminación */}
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
        </Container>
    );
};

export default InventoryDashboard;