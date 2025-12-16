// src/components/InventoryList.jsx
import React, { useState, useEffect } from 'react';
import { 
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
    Paper, Typography, Box, Avatar, CircularProgress, Alert, TextField, InputAdornment 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import API from '../api/axiosInstance';

const InventoryList = ({ refreshTrigger }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchInventory = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const response = await API.get('/inventory/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInventory(response.data);
        } catch (err) {
            console.error("Error al obtener inventario:", err);
            setError("No se pudo cargar la lista de productos.");
        } finally {
            setLoading(false);
        }
    };

    // Recargar cuando el trigger cambie (cuando se crea un producto)
    useEffect(() => {
        fetchInventory();
    }, [refreshTrigger]);

    // Filtrado para la barra de búsqueda
    const filteredInventory = inventory.filter(item => 
        item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.codigo_barras.includes(searchTerm)
    );

    if (loading) return (
        <Box display="flex" justifyContent="center" p={5}>
            <CircularProgress />
        </Box>
    );

    return (
        <Box sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">📦 Inventario de Prendas</Typography>
                
                {/* Buscador Rápido */}
                <TextField 
                    size="small"
                    placeholder="Buscar por nombre, marca o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ width: 350 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell><strong>Foto</strong></TableCell>
                            <TableCell><strong>Producto</strong></TableCell>
                            <TableCell><strong>Marca</strong></TableCell>
                            <TableCell align="center"><strong>Talla/Color</strong></TableCell>
                            <TableCell align="center"><strong>Stock</strong></TableCell>
                            <TableCell align="right"><strong>Precio</strong></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredInventory.length > 0 ? (
                            filteredInventory.map((item) => (
                                <TableRow key={item.id} hover>
                                    <TableCell>
                                        {/* Avatar con la foto de Cloudinary o inicial si no hay foto */}
                                        <Avatar 
                                            src={item.imagen_url} 
                                            alt={item.nombre}
                                            variant="rounded"
                                            sx={{ width: 45, height: 45, bgcolor: '#9c27b0' }}
                                        >
                                            {item.nombre.charAt(0)}
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body1" fontWeight="medium">
                                            {item.nombre}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {item.codigo_barras}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>{item.marca}</TableCell>
                                    <TableCell align="center">
                                        {item.talla} / {item.color}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box 
                                            sx={{ 
                                                bgcolor: item.cantidad > 5 ? '#e8f5e9' : '#ffebee',
                                                color: item.cantidad > 5 ? '#2e7d32' : '#c62828',
                                                borderRadius: 1, p: 0.5, fontWeight: 'bold'
                                            }}
                                        >
                                            {item.cantidad}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                        <strong>Q{Number(item.precio_venta).toFixed(2)}</strong>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                                    <Typography color="textSecondary">No se encontraron productos.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default InventoryList;