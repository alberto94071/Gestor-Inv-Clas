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

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // 1. Verificar si hay sesión guardada al iniciar la app
    useEffect(() => {
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

    // 2. Función para Iniciar Sesión (Se pasa a Login.jsx)
    const handleLogin = (userData) => {
        setIsAuthenticated(true);
        setUser(userData);
    };

    // 3. Función para Cerrar Sesión (Se pasa a Sidebar.jsx)
    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        setIsAuthenticated(false);
        setUser(null);
    };

    // Mostrar spinner mientras verificamos el token
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
            <Box sx={{ display: 'flex' }}>
                
                {/* Si está autenticado, mostramos el Sidebar */}
                {isAuthenticated && (
                    <Sidebar handleLogout={handleLogout} user={user} />
                )}

                {/* Contenedor Principal */}
                <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%', overflowX: 'hidden' }}>
                    <Routes>
                        {/* RUTA DE LOGIN */}
                        <Route 
                            path="/login" 
                            element={
                                !isAuthenticated ? (
                                    <Login handleLogin={handleLogin} /> // 🛑 Aquí pasamos la función vital
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
                                
                                {/* Rutas solo para Admin (Protección visual básica) */}
                                {user?.rol === 'admin' && (
                                    <>
                                        <Route path="/reports" element={<Reports />} />
                                        <Route path="/users" element={<Users />} />
                                        <Route path="/audit" element={<AuditLog />} />
                                    </>
                                )}
                                
                                {/* Si intenta ir a una ruta no definida, va al inicio */}
                                <Route path="*" element={<Navigate to="/" />} />
                            </>
                        ) : (
                            // Si no está autenticado, cualquier ruta lo manda al login
                            <Route path="*" element={<Navigate to="/login" />} />
                        )}
                    </Routes>
                </Box>
            </Box>
        </Router>
    );
}

export default App;