// src/components/Reports.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Alert 
} from '@mui/material';
import API from '../api/axiosInstance'; 

const Reports = () => {
    const [salesHistory, setSalesHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await API.get('/reports/history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setSalesHistory(response.data);
            } catch (err) {
                console.error("Error al cargar historial:", err);
                setError("No se pudo cargar el historial de ventas.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    if (loading) return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                📄 Historial de Ventas (Reportes)
            </Typography>

            <Paper elevation={3} sx={{ mt: 3, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 600 }}>
                    <Table stickyHeader aria-label="sales history table">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                                <TableCell>Fecha y Hora</TableCell>
                                <TableCell>Producto</TableCell>
                                <TableCell align="right">Vendedor</TableCell>
                                <TableCell align="right">Código</TableCell>
                                <TableCell align="right">Cant.</TableCell>
                                <TableCell align="right">Precio Unitario</TableCell>
                                <TableCell align="right">Total Venta</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {salesHistory.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No hay ventas registradas.</TableCell></TableRow>
                            ) : (
                                salesHistory.map((sale) => (
                                    <TableRow key={sale.id} hover>
                                        <TableCell>{sale.fecha}</TableCell>
                                        <TableCell>{sale.nombre}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{sale.nombre_vendedor}</TableCell>
                                        <TableCell align="right">{sale.codigo_barras}</TableCell>
                                        <TableCell align="right">{sale.cantidad}</TableCell>
                                        <TableCell align="right">Q{Number(sale.precio_unitario).toFixed(2)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>Q{Number(sale.total_venta).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default Reports;