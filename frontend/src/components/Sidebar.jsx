// src/components/Sidebar.jsx
import React from 'react';
import { 
    Drawer, List, ListItem, ListItemIcon, ListItemText, 
    Typography, Box, Divider 
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

// Iconos
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import BarChartIcon from '@mui/icons-material/BarChart';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
const drawerWidth = 240;

// URL de un logo de ejemplo (REEMPLAZA ESTA URL POR LA DE TU PROPIO LOGO)
const LOGO_URL = "data:image/jpeg;base64,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";

const Sidebar = ({ handleLogout, user }) => { 
    const navigate = useNavigate();
    const location = useLocation();

    // 🛑 1. DEFINICIÓN DE RUTAS Y ROLES 🛑
    const menuItems = [
        // Rutas básicas visibles para todos
        { text: 'Escritorio', icon: <DashboardIcon />, path: '/', roles: ['admin', 'cajero'] },
        { text: 'Inventario', icon: <InventoryIcon />, path: '/inventory', roles: ['admin', 'cajero'] },
        { text: 'Punto de Venta', icon: <PointOfSaleIcon />, path: '/pos', roles: ['admin', 'cajero'] },
        // Rutas que solo debe ver el administrador
        { text: 'Reportes', icon: <BarChartIcon />, path: '/reports', roles: ['admin'] },      
        { text: 'Usuarios', icon: <GroupIcon />, path: '/users', roles: ['admin'] },       
        { text: 'Auditoría', icon: <MonitorHeartIcon />, path: '/audit', roles: ['admin'] },    
    ];
    
    // 🛑 2. LÓGICA DE FILTRADO 🛑
    const userRole = user?.rol || 'cajero'; 
    
    const visibleMenuItems = menuItems.filter(item => 
        item.roles.includes(userRole)
    );

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    boxSizing: 'border-box',
                    backgroundColor: '#2c3e50', // Color del tema
                    color: 'white',
                    height: '100vh', 
                },
            }}
        >
            {/* Cabecera del Menú / Logo Estilizado */}
            <Box 
                sx={{ 
                    p: 2, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    backgroundColor: '#1a252f', // Color más oscuro para el encabezado
                    py: 3 
                }}
            >
                <img 
                    src={LOGO_URL} 
                    alt="Logo de tu Tienda" 
                    style={{ 
                        width: '60px', 
                        height: '60px', 
                        borderRadius: '50%', 
                        marginBottom: '8px',
                        objectFit: 'cover'
                    }}
                />
                <Typography variant="h6" fontWeight="bold" sx={{ color: 'white', fontSize: '1rem' }}>
                    POTTER'S STORE
                </Typography>
            </Box>
            
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            
            {/* Mensaje de Bienvenida y Rol */}
            <Box sx={{ p: 2, textAlign: 'center', bgcolor: '#34495e', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                    {user?.nombre || 'Invitado'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#aaa' }}>
                    Rol: {userRole.toUpperCase()}
                </Typography>
            </Box>

            {/* Lista de Opciones */}
            <List sx={{ flexGrow: 1 }}>
                {visibleMenuItems.map((item) => (
                    <ListItem 
                        component="button"
                        key={item.text} 
                        onClick={() => navigate(item.path)}
                        sx={{
                            backgroundColor: location.pathname === item.path ? '#4a627a' : 'transparent',
                            '&:hover': { backgroundColor: '#4a627a' },
                            mb: 0.5
                        }}
                    >
                        <ListItemIcon sx={{ color: 'white' }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.text} />
                    </ListItem>
                ))}
            </List>

            <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mt: 'auto' }} />
            
            {/* Botón Salir */}
            <List>
                <ListItem button onClick={handleLogout} sx={{ '&:hover': { backgroundColor: '#c0392b' } }}>
                    <ListItemIcon sx={{ color: 'white' }}>
                        <LogoutIcon />
                    </ListItemIcon>
                    <ListItemText primary="Cerrar Sesión" />
                </ListItem>
            </List>
        </Drawer>
    );
};

export default Sidebar;