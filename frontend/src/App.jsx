// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline, CircularProgress } from '@mui/material';

// Importación de Componentes
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import StatsDashboard from './components/StatsDashboard';
import InventoryDashboard from './components/InventoryDashboard';
import PointOfSale from './components/PointOfSale';
import Reports from './components/Reports';
import Users from './components/Users';
import AuditLog from './components/AuditLog';
import AdminTools from './components/AdminTools';
import Footer from './components/Footer'; // 🟢 1. IMPORTAMOS EL FOOTER

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Verificar sesión y Firma de Autoría
    useEffect(() => {
        // --- FIRMA DEL DESARROLLADOR EN CONSOLA (Hacker style) ---
        console.log(
            "%c Desarrollado por Rony Alberto Méndez Fuentes %c v1.0 ",
            "color: white; background: #1565c0; padding: 5px; border-radius: 3px 0 0 3px; font-weight: bold;",
            "color: white; background: #333; padding: 5px; border-radius: 0 3px 3px 0;"
        );
        console.log("Universidad Mariano Gálvez de Guatemala - Ingeniería en Sistemas");
        // ---------------------------------------------------------

        const checkAuth = () => {
            const token = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('user');

            if (token && storedUser) {
                setIsAuthenticated(true);
                setUser(JSON.parse(storedUser));
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
            setLoading(false);
        };
        checkAuth();
    }, []);

    const handleLogin = (userData) => {
        setIsAuthenticated(true);
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Router>
            <CssBaseline />
            {/* Contenedor Flex para que el Footer siempre quede al final */}
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                
                {/* Sidebar solo si está logueado */}
                {isAuthenticated && (
                    <Sidebar handleLogout={handleLogout} user={user} />
                )}

                {/* 🟢 AJUSTE DE DISEÑO:
                    Convertimos el main en una columna flex.
                    El primer Box (contenido) tiene flexGrow: 1 para ocupar todo el espacio disponible.
                    El Footer queda al final.
                */}
                <Box component="main" sx={{ 
                    flexGrow: 1, 
                    width: '100%', 
                    overflowX: 'hidden',
                    display: 'flex', 
                    flexDirection: 'column' 
                }}>
                    
                    {/* Área de Contenido (Rutas) con Padding */}
                    <Box sx={{ flexGrow: 1, p: 3 }}>
                        <Routes>
                            {/* RUTA DE LOGIN */}
                            <Route 
                                path="/login" 
                                element={
                                    !isAuthenticated ? (
                                        <Login handleLogin={handleLogin} /> 
                                    ) : (
                                        <Navigate to="/" />
                                    )
                                } 
                            />

                            {/* RUTAS PROTEGIDAS */}
                            {isAuthenticated ? (
                                <>
                                    <Route path="/" element={<StatsDashboard />} />
                                    <Route path="/inventory" element={<InventoryDashboard />} />
                                    <Route path="/pos" element={<PointOfSale />} />
                                    
                                    {/* Rutas solo para Admin */}
                                    {user?.rol === 'admin' && (
                                        <>
                                            <Route path="/reports" element={<Reports />} />
                                            <Route path="/users" element={<Users />} />
                                            <Route path="/audit" element={<AuditLog />} />
                                            <Route path="/admin-tools" element={<AdminTools />} />
                                        </>
                                    )}
                                    
                                    <Route path="*" element={<Navigate to="/" />} />
                                </>
                            ) : (
                                <Route path="*" element={<Navigate to="/login" />} />
                            )}
                        </Routes>
                    </Box>

                    {/* 🟢 2. AQUÍ VA EL FOOTER (Siempre al final) */}
                    <Footer />

                </Box>
            </Box>
        </Router>
    );
}

export default App;