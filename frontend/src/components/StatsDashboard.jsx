import React, { useState, useEffect, useMemo } from 'react';
import API from '../api/axiosInstance';

// 1. IMPORTS DE COMPONENTES UI (Material UI)
import { 
    Container, Typography, CircularProgress, Grid, Card, CardContent, 
    Box, Avatar, Paper, Divider, Tabs, Tab, Alert, IconButton, Button
} from '@mui/material';

// 2. IMPORTS DE ICONOS (Material Icons)
import { 
    Inventory, AttachMoney, Warning, TrendingUp, BarChart as BarIcon, 
    ShowChart, Lock, Person, CalendarMonth, ArrowBack
} from '@mui/icons-material';

// 3. IMPORTS DE GRÁFICAS (Recharts)
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend, AreaChart, Area
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff5722', '#795548'];

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
    
    // Estado para ver detalle de un vendedor específico
    const [selectedVendor, setSelectedVendor] = useState(null);

    // Estado para montaje de gráficas
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // 1. Cargar datos
    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('authToken');
                
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const userData = JSON.parse(userStr);
                    setUserRole((userData.rol || '').toLowerCase());
                    setUserName(userData.nombre || userData.username || '');
                }

                const invRes = await API.get('/inventory/inventory', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setInventory(invRes.data);

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

    // CORRECCIÓN DE FECHAS (ZONA HORARIA GT -6)
    const adjustDateToGT = (dateString) => {
        if (!dateString) return new Date();
        const d = new Date(dateString);
        d.setHours(d.getHours() - 6);
        return d;
    };

    // Helper: Moneda
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-GT', {
            style: 'currency', currency: 'GTQ', minimumFractionDigits: 2
        }).format(amount);
    };

    // 2. CÁLCULOS ESTADÍSTICOS
    const stats = useMemo(() => {
        if (!inventory.length && !salesHistory.length) 
            return { totalProducts: 0, totalValue: 0, lowStockItems: 0, chartData: [], salesData: [], salesByVendor: [], salesByMonth: [], vendorMonthlyDetail: [] };

        const isAdmin = userRole === 'admin';

        // --- KPI INVENTARIO ---
        const totalProducts = inventory.length;
        const totalValue = isAdmin ? inventory.reduce((acc, item) => {
            const precio = parseFloat(item.precio_venta) || 0;
            const cantidad = parseInt(item.cantidad) || 0;
            return acc + (precio * cantidad);
        }, 0) : 0;
        const lowStockItems = inventory.filter(item => (parseInt(item.cantidad) || 0) < 5).length;
        
        // --- STOCK POR MARCA ---
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

        // --- PREPARAR DATOS DE VENTAS ---
        const daysMap = { 'Lunes': 0, 'Martes': 0, 'Miércoles': 0, 'Jueves': 0, 'Viernes': 0, 'Sábado': 0, 'Domingo': 0 };
        const today = new Date();
        const currentDay = today.getDay(); 
        const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1); 
        const mondayOfThisWeek = new Date(today.setDate(diff));
        mondayOfThisWeek.setHours(0, 0, 0, 0);

        // Variables para reportes
        const vendorMap = {};
        const monthMap = {};
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const currentYear = new Date().getFullYear();
        months.forEach(m => monthMap[m] = 0);

        // Mapa para detalle mensual
        const vendorDetailMap = {}; 
        months.forEach(m => vendorDetailMap[m] = 0);
        
        const targetDetailVendor = isAdmin ? selectedVendor : userName;

        salesHistory.forEach(sale => {
            const rawDate = sale.fecha_hora || sale.fecha_venta;
            if (!rawDate) return;

            const date = adjustDateToGT(rawDate);
            // Calculamos el total real por ítem
            const itemTotal = (parseFloat(sale.precio_unitario) || 0) * (parseInt(sale.cantidad) || 0);

            // 1. Lógica Semanal
            const isMySale = sale.vendedor === userName;
            const shouldCountForWeekly = isAdmin || isMySale;

            if (shouldCountForWeekly && date >= mondayOfThisWeek) {
                const dayIndex = date.getDay(); 
                const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                const dayName = dayNames[dayIndex];
                if (daysMap[dayName] !== undefined) {
                    daysMap[dayName] += itemTotal;
                }
            }

            // 2. Lógica Admin Global
            if (isAdmin) {
                const vendedorName = sale.vendedor || 'Desconocido';
                if (!vendorMap[vendedorName]) vendorMap[vendedorName] = 0;
                vendorMap[vendedorName] += itemTotal;

                if (date.getFullYear() === currentYear) {
                    const monthName = months[date.getMonth()];
                    monthMap[monthName] += itemTotal;
                }
            }

            // 3. Lógica Detallada por Vendedor
            if (targetDetailVendor && sale.vendedor === targetDetailVendor && date.getFullYear() === currentYear) {
                const monthName = months[date.getMonth()];
                vendorDetailMap[monthName] += itemTotal;
            }
        });

        const salesData = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(day => ({ day: day, total: daysMap[day] || 0 }));
        const salesByVendor = Object.keys(vendorMap).map(key => ({ name: key, value: vendorMap[key] })).sort((a, b) => b.value - a.value);
        const salesByMonth = months.map(m => ({ name: m, total: monthMap[m] }));
        const vendorMonthlyDetail = months.map(m => ({ name: m, total: vendorDetailMap[m] }));

        return { totalProducts, totalValue, lowStockItems, chartData, salesData, salesByVendor, salesByMonth, vendorMonthlyDetail };
    }, [inventory, salesHistory, userRole, userName, selectedVendor]);

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
        // Contenedor principal con Scroll vertical activado para que todo quepa
        <Box sx={{ height: '88vh', overflowY: 'auto', pb: 5 }}>
            <Container maxWidth="xl" sx={{ mt: 4, mb: 8 }}>
                {/* CABECERA */}
                <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TrendingUp fontSize="large" color="primary" />
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                                {userRole === 'admin' ? 'Dashboard Gerencial' : 'Mi Resumen de Ventas'}
                            </Typography>
                            <Typography variant="subtitle2" color="textSecondary">
                                Hola, {userName}
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
                                    <Typography variant="subtitle1" color="text.secondary">Productos</Typography>
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
                                            <Typography variant="subtitle1" color="text.secondary">Valor Oculto</Typography>
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
                                    <Typography variant="subtitle1" color="text.secondary">Alertas Stock</Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* TABS DE ADMIN */}
                {userRole === 'admin' && (
                    <Paper sx={{ mb: 3, borderRadius: 2 }}>
                        <Tabs 
                            value={tabIndex} 
                            onChange={(e, newVal) => { setTabIndex(newVal); setSelectedVendor(null); }} 
                            indicatorColor="primary" 
                            textColor="primary"
                            variant="scrollable"
                            scrollButtons="auto"
                            allowScrollButtonsMobile
                        >
                            <Tab icon={<ShowChart />} label="Resumen Semanal" />
                            <Tab icon={<Person />} label="Por Vendedor" />
                            <Tab icon={<CalendarMonth />} label="Mensual Global" />
                        </Tabs>
                    </Paper>
                )}

                <Grid container spacing={3}>
                    
                    {/* 1. VENTAS SEMANALES */}
                    {(userRole !== 'admin' || tabIndex === 0) && (
                        <Grid item xs={12} lg={6}>
                            <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ShowChart color="primary" /> 
                                    {userRole === 'admin' ? 'Ventas Globales (Semana)' : 'Mis Ventas (Semana)'}
                                </Typography>
                                <Divider sx={{ mb: 3 }} />
                                {/* Scroll horizontal solo si es necesario */}
                                <div style={{ width: '100%', height: 350, overflowX: 'auto', overflowY: 'hidden' }}> 
                                    <div style={{ minWidth: '500px', height: '100%' }}>
                                        {mounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={stats.salesData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                                                    <YAxis axisLine={false} tickLine={false} />
                                                    <RechartsTooltip formatter={(value) => [formatCurrency(value), 'Venta']} contentStyle={{borderRadius:'12px'}} />
                                                    <Line type="monotone" dataKey="total" stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </Paper>
                        </Grid>
                    )}

                    {/* 2. STOCK */}
                    {(userRole !== 'admin' || tabIndex === 0) && (
                        <Grid item xs={12} lg={6}>
                            <Paper elevation={3} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <BarIcon color="action" /> Stock por Marca
                                </Typography>
                                <Divider sx={{ mb: 3 }} />
                                <div style={{ width: '100%', height: 350, overflowX: 'auto', overflowY: 'hidden' }}> 
                                    <div style={{ minWidth: '500px', height: '100%' }}>
                                        {mounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} fontSize={11} />
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
                                </div>
                            </Paper>
                        </Grid>
                    )}

                    {/* 3. REPORTE POR VENDEDOR (ADMIN - TAB 1) */}
                    {userRole === 'admin' && tabIndex === 1 && (
                        <Grid item xs={12}>
                            <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                                {!selectedVendor ? (
                                    <>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Rendimiento por Vendedor</Typography>
                                        <Divider sx={{ mb: 3 }} />
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} md={6}>
                                                <div style={{ width: '100%', height: 350 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <PieChart>
                                                            <Pie
                                                                data={stats.salesByVendor}
                                                                cx="50%" cy="50%"
                                                                labelLine={false}
                                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                                outerRadius={100}
                                                                fill="#8884d8"
                                                                dataKey="value"
                                                            >
                                                                {stats.salesByVendor.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                            </Pie>
                                                            <RechartsTooltip formatter={(value) => formatCurrency(value)} />
                                                            <Legend />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </Grid>
                                            <Grid item xs={12} md={6}>
                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '350px', overflowY: 'auto' }}>
                                                    <Alert severity="info" sx={{mb: 1}}>Haz click en un vendedor para ver su detalle anual.</Alert>
                                                    {stats.salesByVendor.map((vendor, index) => (
                                                        <Paper 
                                                            key={index} 
                                                            variant="outlined" 
                                                            onClick={() => setSelectedVendor(vendor.name)}
                                                            sx={{ 
                                                                p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                                cursor: 'pointer', '&:hover': { backgroundColor: '#f5f5f5', borderColor: 'primary.main' }
                                                            }}
                                                        >
                                                            <Box display="flex" alignItems="center" gap={2}>
                                                                <Avatar sx={{ bgcolor: COLORS[index % COLORS.length] }}>{vendor.name.charAt(0)}</Avatar>
                                                                <Typography fontWeight="bold">{vendor.name}</Typography>
                                                            </Box>
                                                            <Typography color="success.main" fontWeight="bold">{formatCurrency(vendor.value)}</Typography>
                                                        </Paper>
                                                    ))}
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    </>
                                ) : (
                                    <>
                                        <Box display="flex" alignItems="center" gap={2} mb={2}>
                                            <IconButton onClick={() => setSelectedVendor(null)}><ArrowBack /></IconButton>
                                            <Typography variant="h6" fontWeight="bold">Detalle Anual de: <span style={{color: '#1976d2'}}>{selectedVendor}</span></Typography>
                                        </Box>
                                        <Divider sx={{ mb: 3 }} />
                                        <div style={{ width: '100%', height: 400, overflowX: 'auto', overflowY: 'hidden' }}>
                                            <div style={{ minWidth: '600px', height: '100%' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={stats.vendorMonthlyDetail} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                        <XAxis dataKey="name" interval={0} tick={{fontSize: 12}} />
                                                        <YAxis />
                                                        <RechartsTooltip formatter={(value) => [formatCurrency(value), 'Venta']} />
                                                        <Area type="monotone" dataKey="total" stroke="#8884d8" fill="#8884d8" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </Paper>
                        </Grid>
                    )}

                    {/* 4. REPORTE MENSUAL GLOBAL (ADMIN - TAB 2) */}
                    {userRole === 'admin' && tabIndex === 2 && (
                        <Grid item xs={12}>
                            <Paper elevation={3} sx={{ p: 3, borderRadius: 4 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Tendencia Global (Año Actual)</Typography>
                                <Divider sx={{ mb: 3 }} />
                                <div style={{ width: '100%', height: 400, overflowX: 'auto', overflowY: 'hidden' }}>
                                    <div style={{ minWidth: '600px', height: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={stats.salesByMonth} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} interval={0} />
                                                <YAxis axisLine={false} tickLine={false} />
                                                <RechartsTooltip formatter={(value) => [formatCurrency(value), 'Total Global']} cursor={{fill: 'transparent'}} />
                                                <Bar dataKey="total" fill="#4caf50" radius={[4, 4, 0, 0]} barSize={50} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </Paper>
                        </Grid>
                    )}

                    {/* 🟢 CORRECCIÓN VISTA DE CAJERO */}
                    {userRole !== 'admin' && (
                        <Grid item xs={12}>
                            <Paper elevation={3} sx={{ p: 3, borderRadius: 4, mt: 3, mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Mi Desempeño Anual</Typography>
                                <Divider sx={{ mb: 3 }} />
                                
                                <div style={{ width: '100%', height: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        {/* Aumentamos el margen inferior (bottom: 40) para las etiquetas rotadas */}
                                        <AreaChart data={stats.vendorMonthlyDetail} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            {/* 🟢 MAGIA AQUÍ: Rotamos -45 grados, interval 0 y más espacio */}
                                            <XAxis 
                                                dataKey="name" 
                                                interval={0} 
                                                angle={-45} 
                                                textAnchor="end"
                                                height={60} 
                                                tick={{ fontSize: 11 }} 
                                            />
                                            <YAxis />
                                            <RechartsTooltip formatter={(value) => [formatCurrency(value), 'Mis Ventas']} />
                                            <Area type="monotone" dataKey="total" stroke="#ff9800" fill="#ff9800" fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </Paper>
                        </Grid>
                    )}

                </Grid>
            </Container>
        </Box>
    );
};

export default StatsDashboard;
