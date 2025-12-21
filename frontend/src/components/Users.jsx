import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Box, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Chip, Avatar, Alert, Snackbar, CircularProgress
} from '@mui/material';
import { Edit, Delete, PersonAdd, Save, Close } from '@mui/icons-material';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    // Estado para el formulario
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'cajero'
    });

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/users', { // Ajusta esta ruta según tu backend
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            showToast("Error al cargar usuarios", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const showToast = (msg, severity = 'success') => {
        setToast({ open: true, msg, severity });
    };

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleOpenModal = (user = null) => {
        if (user) {
            setSelectedUser(user);
            setFormData({ nombre: user.nombre, email: user.email, password: '', rol: user.rol });
        } else {
            setSelectedUser(null);
            setFormData({ nombre: '', email: '', password: '', rol: 'cajero' });
        }
        setOpenModal(true);
    };

    const handleSave = async () => {
        // Validaciones básicas
        if (!formData.nombre || !formData.email || (!selectedUser && !formData.password)) {
            showToast("Por favor completa todos los campos", "warning");
            return;
        }
        if (!validateEmail(formData.email)) {
            showToast("Formato de correo inválido", "error");
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (selectedUser) {
                // EDITAR
                await API.put(`/users/${selectedUser.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario actualizado con éxito");
            } else {
                // CREAR
                await API.post('/users/register', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario creado con éxito");
            }
            setOpenModal(false);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || "Error al guardar usuario", "error");
        }
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('authToken');
            await API.delete(`/users/${selectedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast("Usuario eliminado");
            setOpenDelete(false);
            fetchUsers();
        } catch (err) {
            showToast("No se pudo eliminar al usuario", "error");
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold" color="primary">Gestión de Usuarios</Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenModal()}>
                    Nuevo Usuario
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={3} sx={{ borderRadius: 2 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell>Usuario</TableCell>
                            <TableCell>Correo</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: user.rol === 'admin' ? '#f57c00' : '#1976d2' }}>
                                            {user.nombre.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Typography fontWeight="medium">{user.nombre}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={user.rol.toUpperCase()} 
                                        color={user.rol === 'admin' ? 'secondary' : 'primary'} 
                                        size="small" 
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton color="primary" onClick={() => handleOpenModal(user)}><Edit /></IconButton>
                                    <IconButton color="error" onClick={() => { setSelectedUser(user); setOpenDelete(true); }}><Delete /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL CREAR/EDITAR */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
                <DialogTitle>{selectedUser ? 'Editar Usuario' : 'Registrar Nuevo Usuario'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField 
                            label="Nombre Completo" 
                            fullWidth 
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                        />
                        <TextField 
                            label="Correo Electrónico" 
                            fullWidth 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                        <TextField 
                            label={selectedUser ? "Nueva Contraseña (opcional)" : "Contraseña"} 
                            type="password" 
                            fullWidth 
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                        />
                        <TextField
                            select
                            label="Rol"
                            value={formData.rol}
                            onChange={(e) => setFormData({...formData, rol: e.target.value})}
                        >
                            <MenuItem value="cajero">Cajero / Vendedor</MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenModal(false)} color="inherit">Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" startIcon={<Save />}>Guardar</Button>
                </DialogActions>
            </Dialog>

            {/* DIÁLOGO ELIMINAR */}
            <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
                <DialogTitle>Confirmar eliminación</DialogTitle>
                <DialogContent>¿Estás seguro de que deseas eliminar a <strong>{selectedUser?.nombre}</strong>? Esta acción no se puede deshacer.</DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
                    <Button onClick={handleDelete} variant="contained" color="error">Eliminar</Button>
                </DialogActions>
            </Dialog>

            {/* ALERTAS SNACKBAR */}
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({...toast, open: false})}>
                <Alert severity={toast.severity} onClose={() => setToast({...toast, open: false})}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Users;