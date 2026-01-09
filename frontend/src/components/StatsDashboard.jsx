import React, { useState, useEffect, useMemo } from 'react';
import API from '../api/axiosInstance';
import { 
    Container, Typography, CircularProgress, Grid, Card, CardContent, 
    Box, Avatar, Paper, Divider, Tabs, Tab, Alert
} from '@mui/material';
import { 
    Inventory, AttachMoney, Warning, TrendingUp, BarChart as BarIcon, 
    ShowChart, Lock, Person, CalendarMonth, Assessment
} from '@mui/icons-material';

// --- IMPORTAMOS RECHARTS (Agregamos PieChart y Legend) ---
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend
} from 'recharts';

// Colores para las gráficas
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const StatsDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [salesHistory, setSalesHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Datos del Usuario
    const [userRole, setUserRole] = useState('');
    const [userName, setUserName] = useState('');

    // Estado para las Pestañas (Solo Admin)
    const [tabIndex, setTabIndex] = useState(0);
    
    // Estado para montaje de gráficas
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // 1. Cargar datos
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                
                // Obtener Datos del Usuario (Rol y Nombre para filtrar)
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    // Normalizamos a minúsculas para evitar errores
                    setUserRole((userData.rol || '').toLowerCase());
                    // Guardamos el nombre tal cual viene para comparar con el historial
                    setUserName(userData.nombre || userData.username || '');
                }

                // Cargar Inventario
                const invRes = await API.get('/inventory/inventory', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInventory(invRes.data);

                // Cargar Historial de Ventas
                try {
                    const salesRes = await API.get('/inventory/sales-history', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setSalesHistory(salesRes.data);
                } catch (e) {
                    console.warn("Error historial:", e);
                }

            } catch (err) {
                console.error("Error dashboard:", err);
                setError("No se pudieron cargar los datos.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Helper: Parsear Fechas
    const parseCustomDate = (dateString) => {
        if (!dateString) return new Date();
        if (dateString.includes('T') || dateString.match(/^\d{4}-/)) return new Date(dateString);
        try {
            const parts = dateString.split(' '); 
            const dateParts = parts[0].split('-'); 
            if (dateParts.length === 3) {
                return new Date(dateParts[2], parseInt(dateParts[1]) - 1, dateParts[0]);
            }
        } catch (e) { return new Date(); }
        return new Date(dateString);
    };

    // Helper: Moneda
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency', currency: 'GTQ', minimumFractionDigits: 2
        }).format(amount);
    };

    // 2. CÁLCULOS ESTADÍSTICOS (SUPER PODEROSOS ⚡)
    const stats = useMemo(() => {
        if (!inventory.length && !salesHistory.length) 
            return { totalProducts: 0, totalValue: 0, lowStockItems: 0, chartData: [], salesData: [], salesByVendor: [], salesByMonth: [] };

        const isAdmin = userRole === 'admin';

        // --- A. KPI INVENTARIO (Global) ---
        const totalProducts = inventory.length;
        // Solo calculamos valor total si es admin (optimización)
        const totalValue = isAdmin ? inventory.reduce((acc, item) => {
            const precio = parseFloat(item.precio_venta) || 0;
            const cantidad = parseInt(item.cantidad) || 0;
            return acc + (precio * cantidad);
        }, 0) : 0;
        const lowStockItems = inventory.filter(item => (parseInt(item.cantidad) || 0) < 5).length;
        
        // --- B. STOCK POR MARCA (Global) ---
        const brandMap = {};
        inventory.forEach(item => {
            const brand = item.marca ? item.marca.toUpperCase() : 'OTROS';
            const qty = parseInt(item.cantidad) || 0;
            if (!brandMap[brand]) brandMap[brand] = 0;
            brandMap[brand] += qty;
        });
        const chartData = Object.keys(brandMap).map(key => ({
            name: key, stock: brandMap[key]
        })).sort((a, b) => b.stock - a.stock).slice(0, 8); 

        // --- C. FILTRADO DE VENTAS SEGÚN ROL ---
        // Si es Admin: Toma TODAS las ventas.
        // Si es Cajero: Toma SOLO las ventas donde vendedor === userName
        const relevantSales = isAdmin 
            ? salesHistory 
            : salesHistory.filter(s => s.vendedor === userName);

        // --- D. VENTAS DE LA SEMANA (Dinámicas según el rol) ---
        const daysMap = { 'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0, 'Domingo': 0 };
        const today = new Date();
        const currentDay = today.getDay(); 
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); 
        const mondayOfThisWeek = new Date(today.setDate(diff));
        mondayOfThisWeek.setHours(0, 0, 0, 0);

        relevantSales.forEach(sale => {
            const rawDate = sale.fecha_hora || sale.fecha_venta;
            if (rawDate) {
                const date = parseCustomDate(rawDate);
                if (date >= mondayOfThisWeek) {
                    const dayIndex = date.getDay(); 
                    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const dayName = dayNames[dayIndex];
                    if (daysMap[dayName] !== undefined) {
                        const total = parseFloat(sale.totalVenta || sale.totalventa || (sale.precio_unitario * sale.cantidad));
                        daysMap[dayName] += total;
                    }
                }
            }
        });
        const orderedDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const salesData = orderedDays.map(day => ({ day: day, total: daysMap[day] || 0 }));

        // --- E. REPORTES AVANZADOS (SOLO ADMIN) ---
        let salesByVendor = [];
        let salesByMonth = [];

        if (isAdmin) {
            // 1. Por Vendedor
            const vendorMap = {};
            salesHistory.forEach(sale => {
                const vendedor = sale.vendedor || 'Desconocido';
                const total = parseFloat(sale.totalVenta || sale.totalventa || 0);
                if (!vendorMap[vendedor]) vendorMap[vendedor] = 0;
                vendorMap[vendedor] += total;
            });
            salesByVendor = Object.keys(vendorMap).map(key => ({
                name: key, value: vendorMap[key]
            })).sort((a, b) => b.value - a.value);

            // 2. Por Mes (Año actual)
            const monthMap = {};
            const currentYear = new Date().getFullYear();
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            
            // Inicializar meses en 0
            months.forEach(m => monthMap[m] = 0);

            salesHistory.forEach(sale => {
                const rawDate = sale.fecha_hora || sale.fecha_venta;
                if (rawDate) {
                    const date = parseCustomDate(rawDate);
                    if (date.getFullYear() === currentYear) {
                        const monthName = months[date.getMonth()];
                        const total = parseFloat(sale.totalVenta || sale.totalventa || 0);
                        monthMap[monthName] += total;
                    }
                }
            });
            salesByMonth = months.map(m => ({ name: m, total: monthMap[m] }));
        }

        return { totalProducts, totalValue, lowStockItems, chartData, salesData, salesByVendor, salesByMonth };
    }, [inventory, salesHistory, userRole, userName]);

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
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <TrendingUp fontSize="large" color="primary" />
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                            {userRole === 'admin' ? 'Dashboard Gerencial' : 'Mi Resumen de Ventas'}
                        </Typography>
                        <Typography variant="subtitle2" color="textSecondary">
                            Bienvenido, {userName}
                        </Typography>
                    </Box>
                </Box>
            </Box>

            {/* KPI CARDS */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card elevation={3} sx={{ borderRadius: 4 }}>
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3 }}>
                            <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2', width: 60, height: 60 }}><Inventory fontSize="large" /></Avatar>
                            <Box>
                                <Typography variant="h4" fontWeight="bold">{stats.totalProducts}</Typography>
                                <Typography variant="subtitle1" color="text.secondary">Productos en Sistema</Typography>
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
                                        <Typography variant="subtitle1" color="text.secondary">Valor Total Inventario</Typography>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#b0bec5' }}>----</Typography>
                                        <Typography variant="subtitle1" color="text.secondary">Valor Inventario (Oculto)</Typography>
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

            {/* SECCIÓN DE GRÁFICAS CON TABS PARA ADMIN */}
            {userRole === 'admin' && (
                <Paper sx={{ mb: 3, borderRadius: 2 }}>
                    <Tabs 
                        value={tabIndex} 
                        onChange={(e, newVal) => setTabIndex(newVal)} 
                        indicatorColor="primary" 
                        textColor="primary"
                        variant="fullWidth"
                    >
                        <Tab icon={<ShowChart />} label="Resumen Semanal" />
                        <Tab icon={<Person />} label="Por Vendedor" />
                        <Tab icon={<CalendarMonth />} label="Mensual (Año Actual)" />
                    </Tabs>
                </Paper>
            )}

            {/* CONTENIDO DE GRÁFICAS */}
            <Grid container spacing={3}>
                
                {/* 1. VENTAS SEMANALES (VISIBLE SIEMPRE, PERO FILTRADA POR ROL) */}
                {(userRole !== 'admin' || tabIndex === 0) && (
                    <Grid item xs={12} lg={6}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ShowChart color="primary" /> 
                                {userRole === 'admin' ? 'Ventas Globales (Esta Semana)' : 'Mis Ventas (Esta Semana)'}
                            </Typography>
                            <Divider sx={{ mb: 3 }} />
                            <div style={{ width: '99%', height: 350 }}> 
                                {mounted && (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <LineChart data={stats.salesData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <RechartsTooltip 
                                                formatter={(value) => [formatCurrency(value), 'Venta']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                            />
                                            <Line type="monotone" dataKey="total" stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Paper>
                    </Grid>
                )}

                {/* 2. STOCK POR MARCA (VISIBLE SIEMPRE EN TAB 0 O PARA CAJERO) */}
                {(userRole !== 'admin' || tabIndex === 0) && (
                    <Grid item xs={12} lg={6}>
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <BarIcon color="action" /> Stock por Marca (Top 8)
                            </Typography>
                            <Divider sx={{ mb: 3 }} />
                            <div style={{ width: '99%', height: 350 }}> 
                                {mounted && (
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                        <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                                            <YAxis axisLine={false} tickLine={false} />
                                            <RechartsTooltip formatter={(value) => [`${value} Unid.`, 'Stock']} />
                                            <Bar dataKey="stock" radius={[6, 6, 0, 0]} barSize={40}>
                                                {stats.chartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Paper>
                    </Grid>
                )}

                {/* 3. REPORTE POR VENDEDOR (SOLO ADMIN - TAB 1) */}
                {userRole === 'admin' && tabIndex === 1 && (
                    <Grid item xs={12}>
                         
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Rendimiento por Vendedor</Typography>
                            <Divider sx={{ mb: 3 }} />
                            <Grid container spacing={2}>
                                {/* Gráfica Pastel */}
                                <Grid item xs={12} md={6}>
                                    <div style={{ width: '100%', height: 350 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={stats.salesByVendor}
                                                    cx="50%" cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                    outerRadius={120}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {stats.salesByVendor.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Grid>
                                {/* Lista Detallada */}
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '350px', overflowY: 'auto' }}>
                                        {stats.salesByVendor.map((vendor, index) => (
                                            <Paper key={index} variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box display="flex" alignItems="center" gap={2}>
                                                    <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>{vendor.name.charAt(0)}</Avatar>
                                                    <Typography fontWeight="bold">{vendor.name}</Typography>
                                                </Box>
                                                <Typography color="success.main" fontWeight="bold">{formatCurrency(vendor.value)}</Typography>
                                            </Paper>
                                        ))}
                                        {stats.salesByVendor.length === 0 && <Alert severity="info">No hay ventas registradas.</Alert>}
                                    </Box>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Grid>
                )}

                {/* 4. REPORTE MENSUAL (SOLO ADMIN - TAB 2) */}
                {userRole === 'admin' && tabIndex === 2 && (
                    <Grid item xs={12}>
                         
                        <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Tendencia de Ventas (Año Actual)</Typography>
                            <Divider sx={{ mb: 3 }} />
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer>
                                    <BarChart data={stats.salesByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <RechartsTooltip 
                                            formatter={(value) => [formatCurrency(value), 'Total Vendido']}
                                            cursor={{fill: 'transparent'}}
                                        />
                                        <Bar dataKey="total" fill="#4caf50" radius={[4, 4, 0, 0]} barSize={50} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Paper>
                    </Grid>
                )}

            </Grid>
        </Container>
    );
};

export default StatsDashboard;
