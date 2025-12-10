// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

// Importación de Componentes
import Login from './components/Login.jsx'; 
import InventoryDashboard from './components/InventoryDashboard.jsx'; // Tu inventario actual
import Sidebar from './components/Sidebar.jsx'; // El menú nuevo
import StatsDashboard from './components/StatsDashboard.jsx'; // Las gráficas nuevas
import PointOfSale from './components/PointOfSale.jsx'; // <--- AGREGAR ESTO
// Componentes "Placeholder" para las rutas que aun no programamos
import Reports from './components/Reports.jsx'; // <--- AGREGAR ESTO
import Users from './components/Users.jsx';
import AuditLog from './components/AuditLog.jsx'; // 🛑 NUEVO
function App() {
  const initialLoginState = !!localStorage.getItem('authToken');
  const [isLoggedIn, setIsLoggedIn] = useState(initialLoginState);
  const [user, setUser] = useState(null);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };
  
  const handleLogout = () => {
    localStorage.removeItem('authToken'); 
    setIsLoggedIn(false);
    setUser(null);
  };

  // Si no está logueado, mostrar solo Login
  if (!isLoggedIn) {
      return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Si está logueado, mostrar la estructura con Menú Lateral (Layout)
  // En src/App.jsx

// ... (imports y lógica igual) ...

  // Si está logueado, mostrar la estructura con Menú Lateral
  return (
    <Router>
        {/* Contenedor PADRE: Ocupa 100% de ancho y alto de la ventana */}
        <Box sx={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            <CssBaseline />
            
            {/* Menú Lateral */}
            <Sidebar handleLogout={handleLogout} user={user}/>

            {/* Contenido Principal (Derecha) */}
            <Box 
                component="main" 
                sx={{ 
                    flexGrow: 1, 
                    p: 2, // Un poco de padding interno
                    bgcolor: '#f5f5f5', 
                    height: '100%', // Altura total
                    overflow: 'auto', // Si el contenido es muy largo, que aparezca scroll SOLO aquí
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Esto hace que las rutas ocupen todo el espacio disponible */}
                <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Routes>
                        <Route path="/" element={<StatsDashboard />} />
                        <Route path="/inventory" element={<InventoryDashboard user={user} />} />
                        <Route path="/pos" element={<PointOfSale />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="*" element={<Navigate to="/" />} />
                        <Route path="/audit" element={<AuditLog />} /> 
                    </Routes>
                </Box>
            </Box>
        </Box>
    </Router>
  );

}

export default App;