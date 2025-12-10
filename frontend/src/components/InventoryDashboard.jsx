// src/components/InventoryDashboard.jsx
import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance.js'; 
import ScannerComponent from './ScannerComponent.jsx'; 
// 👇 1. IMPORTAMOS EL MODAL QUE ACABAMOS DE CREAR
import CreateProductModal from './CreateProductModal.jsx';

import { 
    Container, Typography, CircularProgress, Alert, Paper, 
    Table, TableBody, TableCell, TableContainer, TableHead, 
    TableRow, Button 
} from '@mui/material'; 
import AddIcon from '@mui/icons-material/Add'; 

const InventoryDashboard = ({ user }) => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // 👇 Estado para controlar si el modal está abierto o cerrado
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const getToken = () => localStorage.getItem('authToken');

    const fetchInventory = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = getToken();
            if (!token) {
                setError("Sesión expirada. Por favor, vuelva a iniciar sesión.");
                setLoading(false);
                return;
            }
            
            const response = await API.get('/inventory/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInventory(response.data);
        } catch (err) {
            console.error("Error al cargar inventario:", err);
            setError("Error al cargar el inventario.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = getToken();
        if (token) {
            fetchInventory();
        }
        
        // Dejamos el array de dependencia vacío para que solo se ejecute al montar
    }, []);

    // 👇 Funciones para abrir y cerrar el modal
    const handleOpenCreateModal = () => setIsCreateModalOpen(true);
    const handleCloseCreateModal = () => setIsCreateModalOpen(false);

    if (loading) return (
        <Container sx={{ mt: 5, textAlign: 'center' }}><CircularProgress /></Container>
    );
    
    if (error) return (
        <Container sx={{ mt: 5 }}><Alert severity="error">{error}</Alert></Container>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom>
                📊 Inventario General
            </Typography>
            
            {/* Botón para abrir el modal */}
            <Button 
                variant="contained" 
                startIcon={<AddIcon />} 
                onClick={handleOpenCreateModal}
                sx={{ mb: 2, mr: 2 }}
            >
                Crear Nuevo Producto
            </Button>
            
            <ScannerComponent fetchInventory={fetchInventory} getToken={getToken} />

            <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 440 }}>
                <Table stickyHeader aria-label="inventory table">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                            <TableCell>Producto</TableCell>
                            <TableCell>Marca</TableCell>
                            <TableCell>Talla / Color</TableCell>
                            <TableCell>Código de Barras</TableCell>
                            <TableCell align="right">Precio Venta</TableCell>
                            <TableCell align="right">Stock</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {inventory.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">No hay productos. ¡Crea uno nuevo!</TableCell>
                            </TableRow>
                        ) : (
                            inventory.map((item, index) => (
                                <TableRow key={index} hover>
                                    <TableCell>{item.nombre}</TableCell>
                                    <TableCell>{item.marca}</TableCell>
                                    <TableCell>{item.talla} / {item.color}</TableCell>
                                    <TableCell>{item.codigo_barras}</TableCell>
                                    <TableCell align="right">Q{parseFloat(item.precio_venta).toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.cantidad}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            
            {/* 👇 2. AQUÍ RENDERIZAMOS EL MODAL OCULTO */}
            <CreateProductModal 
                open={isCreateModalOpen} 
                handleClose={handleCloseCreateModal} 
                fetchInventory={fetchInventory} 
                getToken={getToken}
            />
        </Container>
    );
};

export default InventoryDashboard;