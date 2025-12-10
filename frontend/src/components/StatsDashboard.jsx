// src/components/StatsDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Grid, Paper, Typography, Box, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import API from '../api/axiosInstance';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const StatsDashboard = () => {
    const [stats, setStats] = useState({ ventasHoy: 0, stockBajo: 0, grafica: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadStats = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await API.get('/reports/dashboard-stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(response.data);
            } catch (error) {
                console.error("Error cargando estadísticas", error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    // 🛑 Nota: He eliminado los props obsoletos 'item', 'xs', 'md' de <Grid> 
    // para limpiar las advertencias de la consola.
    
    if (loading) return <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold' }}>
                Tablero Principal
            </Typography>

            {/* Grid Container */}
            <Grid container spacing={3}>
                
                {/* KPI 1: Ventas Hoy */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: 140, bgcolor: '#e3f2fd' }}>
                        <AttachMoneyIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                        <Box>
                            <Typography component="h2" variant="h6" color="primary" gutterBottom>
                                Ventas de Hoy
                            </Typography>
                            <Typography component="p" variant="h3">
                                ${Number(stats.ventasHoy).toFixed(2)}
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* KPI 2: Stock Crítico */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: 140, bgcolor: '#ffebee' }}>
                        <WarningIcon sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                        <Box>
                            <Typography component="h2" variant="h6" color="error" gutterBottom>
                                Productos Stock Bajo
                            </Typography>
                            <Typography component="p" variant="h3">
                                {stats.stockBajo}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                                Menos de 5 unidades en stock
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* KPI 3: Estado del Sistema */}
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3, display: 'flex', alignItems: 'center', height: 140, bgcolor: '#e8f5e9' }}>
                        <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                        <Box>
                            <Typography component="h2" variant="h6" color="success" gutterBottom>
                                Estado del Sistema
                            </Typography>
                            <Typography component="p" variant="h4" sx={{ mt: 1 }}>
                                🟢 Activo
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* GRÁFICO REAL (Ventas de la Semana) */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, height: 400 }}>
                        <Typography variant="h6" gutterBottom>Ventas de la Semana (En Tiempo Real)</Typography>
                        {stats.grafica.length > 0 ? (
                            <ResponsiveContainer width="100%" height="90%">
                                <BarChart data={stats.grafica} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ventas']} />
                                    <Bar dataKey="ventas" fill="#2c3e50" name="Ventas ($)" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                <Typography color="textSecondary">No hay ventas registradas esta semana.</Typography>
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default StatsDashboard;