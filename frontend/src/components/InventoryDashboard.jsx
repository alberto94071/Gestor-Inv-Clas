// src/components/InventoryDashboard.jsx
import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Button, Box, Chip, TextField, InputAdornment, IconButton, Dialog, 
    DialogTitle, DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DeleteIcon from '@mui/icons-material/Delete'; 

const InventoryDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    // 🛑 ESTADO NUEVO PARA EL BOTÓN DE GUARDAR
    const [saving, setSaving] = useState(false); 
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); 
    const [userRole, setUserRole] = useState('');

    const [open, setOpen] = useState(false);
    const [newProduct, setNewProduct] = useState({
        nombre: '', marca: '', descripcion: '', 
        precio_venta: '', stock_inicial: '', 
        talla: '', color: '', codigo_barras: ''
    });
    const [createError, setCreateError] = useState(null);

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);
    const [scannedCode, setScannedCode] = useState('');

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
            item.codigo_barras.includes(term) ||
            item.marca.toLowerCase().includes(term)
        );
    });

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchTerm.trim() !== '') {
            const found = inventory.find(p => p.codigo_barras === searchTerm.trim());
            if (!found) {
                setScannedCode(searchTerm.trim());
                setConfirmOpen(true);
            }
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
            const msg = err.response?.data?.error || "Error al eliminar.";
            alert(msg);
            setDeleteConfirmOpen(false);
        }
    };

    const handleOpenCreate = (code = '') => {
        setNewProduct({
            nombre: '', marca: '', descripcion: '', 
            precio_venta: '', stock_inicial: '', 
            talla: '', color: '', 
            codigo_barras: code 
        });
        setOpen(true);
        setConfirmOpen(false);
    };

    const handleCreateProduct = async () => {
        if (!newProduct.nombre || !newProduct.precio_venta) {
            setCreateError("Nombre y Precio son obligatorios.");
            return;
        }
        
        // 🛑 PREVENCIÓN DE DOBLE CLIC
        if (saving) return; 
        setSaving(true); 

        try {
            const token = localStorage.getItem('authToken');
            await API.post('/inventory/products', newProduct, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setOpen(false);
            setCreateError(null);
            setSearchTerm(''); 
            fetchInventory(); 
        } catch (err) {
            const msg = err.response?.data?.error || "Error al registrar.";
            setCreateError(msg);
        } finally {
            // 🛑 LIBERAR BOTÓN
            setSaving(false);
        }
    };

    if (loading) return <Container sx={{ mt: 4, textAlign: 'center' }}><CircularProgress /></Container>;
    if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    📦 Inventario General
                </Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => handleOpenCreate('')} sx={{ borderRadius: 2 }}>
                    Nuevo Producto
                </Button>
            </Box>

            <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2, display: 'flex', alignItems: 'center' }}>
                <QrCodeScannerIcon sx={{ color: 'action.active', mr: 1 }} />
                <TextField
                    fullWidth variant="standard" placeholder="Escanear o buscar..."
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown} InputProps={{ disableUnderline: true }} sx={{ ml: 1, flex: 1 }}
                />
                {searchTerm && <IconButton onClick={() => setSearchTerm('')}><SearchIcon /></IconButton>}
            </Paper>

            <TableContainer component={Paper} sx={{ borderRadius: 3, maxHeight: '65vh' }}>
                <Table stickyHeader>
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Marca</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'right' }}>Precio</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Stock</TableCell>
                            {userRole === 'admin' && (
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInventory.map((product) => (
                            <TableRow 
                                key={product.id} 
                                hover
                                // Opacidad si está agotado
                                sx={{ 
                                    opacity: product.cantidad > 0 ? 1 : 0.5, 
                                    backgroundColor: product.cantidad > 0 ? 'inherit' : '#f9f9f9'
                                }}
                            >
                                <TableCell sx={{ fontWeight: 'bold' }}>{product.nombre}</TableCell>
                                <TableCell>{product.marca}</TableCell>
                                <TableCell><Chip label={product.codigo_barras} size="small" variant="outlined" /></TableCell>
                                <TableCell align="right" sx={{ color: 'green', fontWeight: 'bold' }}>
                                    Q{Number(product.precio_venta).toFixed(2)}
                                </TableCell>
                                <TableCell align="center">
                                    <Chip label={product.cantidad} color={product.cantidad < 5 ? "error" : "success"} variant="filled" size="small" />
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

            {/* Modal Eliminar */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle sx={{color: 'error.main'}}>¿Eliminar Producto?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Eliminar <strong>{productToDelete?.nombre}</strong>? <br/>
                        Esto eliminará el historial de este producto.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)} color="inherit">Cancelar</Button>
                    <Button onClick={confirmDelete} variant="contained" color="error">Eliminar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal Crear */}
            <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogTitle>Producto no encontrado</DialogTitle>
                <DialogContent><DialogContentText>El código <strong>{scannedCode}</strong> no existe. ¿Registrar?</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmOpen(false)} color="inherit">Cancelar</Button>
                    <Button onClick={() => handleOpenCreate(scannedCode)} variant="contained" autoFocus>Registrar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle sx={{ bgcolor: '#2c3e50', color: 'white' }}>Nuevo Producto</DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {createError && <Alert severity="error" sx={{ my: 2 }}>{createError}</Alert>}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField autoFocus label="Nombre *" fullWidth variant="outlined" value={newProduct.nombre} onChange={(e) => setNewProduct({...newProduct, nombre: e.target.value})} />
                            <TextField label="Marca" fullWidth variant="outlined" value={newProduct.marca} onChange={(e) => setNewProduct({...newProduct, marca: e.target.value})} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField label="Precio Venta *" type="number" fullWidth variant="outlined" value={newProduct.precio_venta} onChange={(e) => setNewProduct({...newProduct, precio_venta: e.target.value})} />
                            <TextField label="Stock Inicial" type="number" fullWidth variant="outlined" sx={{ bgcolor: '#e8f5e9' }} value={newProduct.stock_inicial} onChange={(e) => setNewProduct({...newProduct, stock_inicial: e.target.value})} />
                        </Box>
                        <TextField label="Código" fullWidth variant="outlined" value={newProduct.codigo_barras} onChange={(e) => setNewProduct({...newProduct, codigo_barras: e.target.value})} 
                             InputProps={{ startAdornment: <InputAdornment position="start"><QrCodeScannerIcon /></InputAdornment> }} />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpen(false)} color="secondary" disabled={saving}>Cancelar</Button>
                    
                    {/* 🛑 BOTÓN PROTEGIDO CONTRA DOBLE CLIC */}
                    <Button 
                        onClick={handleCreateProduct} 
                        variant="contained" 
                        color="primary"
                        disabled={saving} // Se desactiva al guardar
                    >
                        {saving ? <CircularProgress size={24} /> : "Guardar"}
                    </Button>

                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default InventoryDashboard;