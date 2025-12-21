import React, { useState, useEffect, useMemo } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Grid, Card, CardContent, 
    Box, Avatar, Paper, Divider 
} from '@mui/material';
import { 
    Inventory, AttachMoney, Warning, TrendingUp, BarChart as BarIcon 
} from '@mui/icons-material';

// --- IMPORTAMOS RECHARTS (Librería de Gráficas) ---
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell 
} from 'recharts';

const StatsDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 1. Cargar datos del inventario
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const response = await API.get('/inventory/inventory', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInventory(response.data);
            } catch (err) {
                console.error("Error cargando estadísticas:", err);
                setError("No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, []);

    // 2. Calcular Estadísticas (KPIs) en Tiempo Real
    const stats = useMemo(() => {
        if (!inventory.length) return { totalProducts: 0, totalValue: 0, lowStockItems: 0, chartData: [] };

        const totalProducts = inventory.length;
        
        // Calcula valor total del inventario (Precio Venta * Cantidad)
        // Aseguramos que los valores sean números para evitar errores
        const totalValue = inventory.reduce((acc, item) => {
            const precio = parseFloat(item.precio_venta) || 0;
            const cantidad = parseInt(item.cantidad) || 0;
            return acc + (precio * cantidad);
        }, 0);

        // Productos con menos de 5 unidades (Alerta de Stock)
        const lowStockItems = inventory.filter(item => (parseInt(item.cantidad) || 0) < 5).length;
        
        // --- DATOS PARA LA GRÁFICA (Agrupado por Marca) ---
        const brandMap = {};
        inventory.forEach(item => {
            const brand = item.marca ? item.marca.toUpperCase() : 'SIN MARCA';
            const qty = parseInt(item.cantidad) || 0;
            
            if (!brandMap[brand]) brandMap[brand] = 0;
            brandMap[brand] += qty;
        });
        
        // Convertimos a array, ordenamos por mayor stock y tomamos el Top 8
        const chartData = Object.keys(brandMap).map(key => ({
            name: key,
            stock: brandMap[key]
        })).sort((a, b) => b.stock - a.stock).slice(0, 8); 

        return { totalProducts, totalValue, lowStockItems, chartData };
    }, [inventory]);

    // Helper para formato de moneda (Quetzales)
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency',
            currency: 'GTQ',
            minimumFractionDigits: 2
        }).format(amount);
    };

    if (loading) return (
        <Container sx={{ mt: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
            <CircularProgress />
        </Container>
    );

    if (error) return (
        <Container sx={{ mt: 4 }}>
            <Typography color="error" variant="h6">{error}</Typography>
        </Container>
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* TÍTULO */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUp fontSize="large" color="primary" />
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                    Resumen del Negocio
                </Typography>
            </Box>

            {/* --- SECCIÓN 1: TARJETAS DE INDICADORES (KPIs) --- */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Total Productos */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 60, height: 60 }}>
                                <Inventory fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight="bold">{stats.totalProducts}</Typography>
                                <Typography variant="subtitle1" color="text.secondary">Productos Únicos</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Valor del Inventario (en Quetzales) */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', width: 60, height: 60 }}>
                                <AttachMoney fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight="bold" sx={{ color: '#2e7d32' }}>
                                    {formatCurrency(stats.totalValue)}
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary">Valor Total Inventario</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Stock Bajo (Alertas) */}
                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: '#fff3e0', color: '#ef6c00', width: 60, height: 60 }}>
                                <Warning fontSize="large" />
                            </Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight="bold" sx={{ color: '#ef6c00' }}>
                                    {stats.lowStockItems}
                                </Typography>
                                <Typography variant="subtitle1" color="text.secondary">Alertas Stock Bajo</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* --- SECCIÓN 2: GRÁFICAS Y TIPS --- */}
            <Grid container spacing={3}>
                {/* GRÁFICA DE BARRAS */}
                <Grid item xs={12} lg={8}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BarIcon color="action" /> Stock por Marca (Top 8)
                            </Typography>
                        </Box>
                        <Divider sx={{ mb: 3 }} />
                        
                        {/* 🟢 SOLUCIÓN AL ERROR DE CONSOLA: Contenedor con altura fija */}
                        <Box sx={{ width: '100%', height: 350 }}> 
                            {stats.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: '#666' }}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 12, fill: '#666' }}
                                        />
                                        <RechartsTooltip 
                                            cursor={{ fill: '#f5f5f5' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => [`${value} Unidades`, 'Stock']}
                                        />
                                        <Bar dataKey="stock" radius={[6, 6, 0, 0]} barSize={40}>
                                            {stats.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={['#3f51b5', '#009688', '#ff9800', '#f44336', '#9c27b0', '#795548', '#607d8b', '#e91e63'][index % 8]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <Box display="flex" justifyContent="center" alignItems="center" height="100%" flexDirection="column" color="text.secondary">
                                    <Inventory sx={{ fontSize: 60, opacity: 0.2, mb: 1 }} />
                                    <Typography>No hay suficientes datos para graficar</Typography>
                                </Box>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                {/* TIPS / ACCIONES RÁPIDAS */}
                <Grid item xs={12} lg={4}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%', bgcolor: '#f8f9fa' }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', color: '#455a64' }}>
                            💡 Estado del Sistema
                        </Typography>
                        <Divider sx={{ mb: 2 }} />
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, borderLeft: '4px solid #4caf50', boxShadow: 1 }}>
                                <Typography variant="body2" color="text.secondary">Salud del Inventario</Typography>
                                <Typography variant="body1" fontWeight="bold">
                                    {stats.lowStockItems === 0 ? "Óptimo" : "Atención Requerida"}
                                </Typography>
                            </Box>

                            <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, borderLeft: '4px solid #2196f3', boxShadow: 1 }}>
                                <Typography variant="body2" color="text.secondary">Moneda Base</Typography>
                                <Typography variant="body1" fontWeight="bold">Quetzales (GTQ)</Typography>
                            </Box>

                            <Box sx={{ mt: 2 }}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    Recuerda:
                                </Typography>
                                <Typography variant="body2" paragraph>
                                    • Si el stock llega a 0, el producto no aparecerá disponible para venta.
                                </Typography>
                                <Typography variant="body2">
                                    • Revisa los reportes mensuales para ver tendencias de venta.
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default StatsDashboard;