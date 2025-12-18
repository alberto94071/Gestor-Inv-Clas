import React from 'react';
import { 
    Drawer, List, ListItem, ListItemIcon, ListItemText, 
    Typography, Box, Divider, Avatar 
} from '@mui/material';
import { 
    Inventory, PointOfSale, ExitToApp, ReceiptLong, 
    Assessment, People // Iconos adicionales por si activas Reports/Users
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const drawerWidth = 240;

const Sidebar = ({ handleLogout, user }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Menú base para todos los usuarios
    const menuItems = [
        { text: 'Inventario', icon: <Inventory />, path: '/inventory' },
        { text: 'Punto de Venta', icon: <PointOfSale />, path: '/pos' },
    ];

    // Opciones EXCLUSIVAS para Administrador
    if (user?.rol === 'admin') {
        // Opción 1: Personalizar el Ticket (Nuevo requerimiento)
        menuItems.push({ text: 'Personalizar Recibo', icon: <ReceiptLong />, path: '/admin-tools' });
        
        // Opción 2: Reportes Avanzados (Si tienes el componente Reports.jsx)
        menuItems.push({ text: 'Reportes Financieros', icon: <Assessment />, path: '/reports' });
        
        // Opción 3: Gestión de Usuarios (Si tienes el componente Users.jsx)
        menuItems.push({ text: 'Usuarios', icon: <People />, path: '/users' });
    }

    return (
        <Drawer
            variant="permanent"
            sx={{
                width: drawerWidth,
                flexShrink: 0,
                [`& .MuiDrawer-paper`]: { 
                    width: drawerWidth, 
                    boxSizing: 'border-box', 
                    bgcolor: '#1a202c', // Color oscuro elegante
                    color: 'white' 
                },
            }}
        >
            {/* SECCIÓN PERFIL DE USUARIO */}
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, borderBottom: '1px solid #2d3748' }}>
                <Avatar sx={{ bgcolor: '#3182ce', width: 40, height: 40 }}>
                    {user?.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                </Avatar>
                <Box sx={{ overflow: 'hidden' }}>
                    <Typography variant="subtitle1" fontWeight="bold" noWrap>
                        {user?.nombre || 'Usuario'}
                    </Typography>
                    <Typography variant="caption" color="gray" sx={{ textTransform: 'capitalize' }}>
                        {user?.rol || 'Rol'}
                    </Typography>
                </Box>
            </Box>

            {/* LISTA DE NAVEGACIÓN */}
            <List sx={{ mt: 2 }}>
                {menuItems.map((item) => (
                    <ListItem 
                        button 
                        key={item.text} 
                        onClick={() => navigate(item.path)}
                        sx={{ 
                            bgcolor: location.pathname === item.path ? '#2d3748' : 'transparent',
                            '&:hover': { bgcolor: '#4a5568' },
                            mb: 1, 
                            mx: 1, 
                            borderRadius: 1,
                            transition: 'background-color 0.2s'
                        }}
                    >
                        <ListItemIcon sx={{ color: 'white', minWidth: '40px' }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                            primary={item.text} 
                            primaryTypographyProps={{ fontSize: '0.9rem' }} 
                        />
                    </ListItem>
                ))}
            </List>

            {/* BOTÓN CERRAR SESIÓN (Al final) */}
            <Box sx={{ mt: 'auto', p: 2 }}>
                <Divider sx={{ bgcolor: '#4a5568', mb: 2 }} />
                <ListItem 
                    button 
                    onClick={handleLogout} 
                    sx={{ 
                        color: '#fc8181', // Rojo suave
                        borderRadius: 1,
                        '&:hover': { bgcolor: 'rgba(252, 129, 129, 0.1)' }
                    }}
                >
                    <ListItemIcon sx={{ color: '#fc8181', minWidth: '40px' }}>
                        <ExitToApp />
                    </ListItemIcon>
                    <ListItemText primary="Cerrar Sesión" />
                </ListItem>
            </Box>
        </Drawer>
    );
};

export default Sidebar;