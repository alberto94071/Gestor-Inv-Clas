import React, { useState, useEffect, useMemo } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Grid, Card, CardContent, 
    Box, Avatar, Paper, Divider 
} from '@mui/material';
import { 
    Inventory, AttachMoney, Warning, TrendingUp, BarChart as BarIcon, 
    ShowChart, Lock 
} from '@mui/icons-material';

// --- IMPORTAMOS RECHARTS ---
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, Cell, LineChart, Line 
} from 'recharts';

const StatsDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [userRole, setUserRole] = useState('');

    // 1. Cargar datos (Inventario y Ventas)
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                
                // Obtener Rol
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    setUserRole(userData.rol || '');
                }

                // Cargar Inventario
                const invRes = await API.get('/inventory/inventory', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInventory(invRes.data);

                // Cargar Historial de Ventas (Para la gráfica de días)
                try {
                    const salesRes = await API.get('/inventory/sales-history', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSalesHistory(salesRes.data);
                } catch (e) {
                    console.warn("No se pudo cargar el historial de ventas", e);
                }

            } catch (err) {
                console.error("Error cargando dashboard:", err);
                setError("No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // 2. Calcular Estadísticas y Gráficas
    const stats = useMemo(() => {
        if (!inventory.length) return { totalProducts: 0, totalValue: 0, lowStockItems: 0, chartData: [], salesData: [] };

        // --- KPI: Inventario ---
        const totalProducts = inventory.length;
        const totalValue = inventory.reduce((acc, item) => {
            const precio = parseFloat(item.precio_venta) || 0;
            const cantidad = parseInt(item.cantidad) || 0;
            return acc + (precio * cantidad);
        }, 0);
        const lowStockItems = inventory.filter(item => (parseInt(item.cantidad) || 0) < 5).length;
        
        // --- GRÁFICA 1: STOCK POR MARCA (Top 8) ---
        const brandMap = {};
        inventory.forEach(item => {
            const brand = item.marca ? item.marca.toUpperCase() : 'SIN MARCA';
            const qty = parseInt(item.cantidad) || 0;
            if (!brandMap[brand]) brandMap[brand] = 0;
            brandMap[brand] += qty;
        });
        const chartData = Object.keys(brandMap).map(key => ({
            name: key,
            stock: brandMap[key]
        })).sort((a, b) => b.stock - a.stock).slice(0, 8); 

        // --- GRÁFICA 2: VENTAS POR DÍA DE LA SEMANA ---
        // Inicializamos los días en español con 0
        const daysMap = {
            'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0, 'Domingo': 0
        };

        salesHistory.forEach(sale => {
            // Asumiendo que sale.fecha_hora es un string de fecha válido
            const date = new Date(sale.fecha_hora);
            const dayIndex = date.getDay(); // 0 = Domingo, 1 = Lunes...
            
            // Mapeamos el índice al nombre en español
            const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const dayName = dayNames[dayIndex];
            
            // Sumamos el total de la venta
            if (daysMap[dayName] !== undefined) {
                daysMap[dayName] += parseFloat(sale.totalVenta || (sale.precio_unitario * sale.cantidad));
            }
        });

        // Convertimos a array ordenado (Lunes a Domingo)
        const orderedDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const salesData = orderedDays.map(day => ({
            day: day,
            total: daysMap[day] || 0
        }));

        return { totalProducts, totalValue, lowStockItems, chartData, salesData };
    }, [inventory, salesHistory]);

    // Helper moneda
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

            {/* --- KPI CARDS --- */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 60, height: 60 }}><Inventory fontSize="large" /></Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight="bold">{stats.totalProducts}</Typography>
                                <Typography variant="subtitle1" color="text.secondary">Productos Únicos</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: userRole === 'admin' ? '#e8f5e9' : '#eceff1', color: userRole === 'admin' ? '#2e7d32' : '#90a4ae', width: 60, height: 60 }}>
                                {userRole === 'admin' ? <AttachMoney fontSize="large" /> : <Lock fontSize="large" />}
                            </Avatar>
                            <Box>
                                {userRole === 'admin' ? (
                                    <>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#2e7d32' }}>{formatCurrency(stats.totalValue)}</Typography>
                                        <Typography variant="subtitle1" color="text.secondary">Valor Inventario</Typography>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#b0bec5' }}>----</Typography>
                                        <Typography variant="subtitle1" color="text.secondary">Información Reservada</Typography>
                                    </>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: '#fff3e0', color: '#ef6c00', width: 60, height: 60 }}><Warning fontSize="large" /></Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight="bold" sx={{ color: '#ef6c00' }}>{stats.lowStockItems}</Typography>
                                <Typography variant="subtitle1" color="text.secondary">Alertas Stock Bajo</Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                
                {/* --- GRÁFICA 1: VENTAS POR DÍA (Línea) --- */}
                <Grid item xs={12} lg={6}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ShowChart color="primary" /> Ventas de la Semana
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        {/* 🟢 CORRECCIÓN ERROR WIDTH(-1): Contenedor con altura fija */}
                        <Box sx={{ width: '100%', height: 350 }}> 
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stats.salesData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip 
                                        formatter={(value) => [formatCurrency(value), 'Venta Total']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Line type="monotone" dataKey="total" stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>

                {/* --- GRÁFICA 2: STOCK POR MARCA (Barras) --- */}
                <Grid item xs={12} lg={6}>
                    <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BarIcon color="action" /> Stock por Marca (Top 8)
                        </Typography>
                        <Divider sx={{ mb: 3 }} />
                        
                        {/* 🟢 CORRECCIÓN ERROR WIDTH(-1): Contenedor con altura fija */}
                        <Box sx={{ width: '100%', height: 350 }}> 
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                    <YAxis axisLine={false} tickLine={false} />
                                    <RechartsTooltip 
                                        formatter={(value) => [`${value} Unidades`, 'Stock']}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="stock" radius={[6, 6, 0, 0]} barSize={40}>
                                        {stats.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={['#3f51b5', '#009688', '#ff9800', '#f44336', '#9c27b0', '#795548', '#607d8b', '#e91e63'][index % 8]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default StatsDashboard;