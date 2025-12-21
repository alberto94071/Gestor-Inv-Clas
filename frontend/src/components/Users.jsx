import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import {
    Container, Typography, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Box, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    MenuItem, Chip, Avatar, Alert, Snackbar, CircularProgress
} from '@mui/material';
import { Edit, Delete, PersonAdd, Save } from '@mui/icons-material';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [openDelete, setOpenDelete] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [toast, setToast] = useState({ open: false, msg: '', severity: 'success' });

    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'cajero'
    });

    // 🟢 Regresamos a /users porque el servidor da 404 con /usuarios
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/Users', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            showToast("Error al cargar la lista", "error");
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
        if (!formData.nombre || !formData.email || (!selectedUser && !formData.password)) {
            showToast("Completa los campos obligatorios", "warning");
            return;
        }
        if (!validateEmail(formData.email)) {
            showToast("Email inválido", "error");
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            if (selectedUser) {
                // EDITAR (Ruta /users)
                await API.put(`/Users/${selectedUser.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario actualizado");
            } else {
                // REGISTRAR (Ruta /users/register)
                await API.post('/Users/register', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario creado");
            }
            setOpenModal(false);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || "Error en el servidor", "error");
        }
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('authToken');
            await API.delete(`/Users/${selectedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast("Usuario eliminado");
            setOpenDelete(false);
            fetchUsers();
        } catch (err) {
            showToast("Error al eliminar", "error");
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Personal de la Empresa</Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenModal()}>
                    Agregar Usuario
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={4} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f0f2f5' }}>
                        <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Email / Usuario</TableCell>
                            <TableCell>Nivel de Acceso</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id} hover>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar sx={{ bgcolor: user.rol === 'admin' ? '#d32f2f' : '#2e7d32' }}>
                                            {user.nombre.charAt(0).toUpperCase()}
                                        </Avatar>
                                        <Typography variant="body1">{user.nombre}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={user.rol === 'admin' ? 'Administrador' : 'Cajero'} 
                                        color={user.rol === 'admin' ? 'error' : 'success'} 
                                        variant="outlined"
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

            {/* MODALES IGUAL QUE ANTES PERO CON RUTAS /USERS */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold' }}>{selectedUser ? 'Modificar Datos' : 'Nuevo Registro'}</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField label="Nombre Completo" fullWidth value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                        <TextField label="Correo" fullWidth value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                        <TextField 
                            label={selectedUser ? "Contraseña (dejar vacío si no cambia)" : "Contraseña"} 
                            type="password" fullWidth value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        />
                        <TextField select label="Rol" value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})}>
                            <MenuItem value="cajero">Cajero</MenuItem>
                            <MenuItem value="admin">Administrador</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpenModal(false)} color="inherit">Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" startIcon={<Save />}>Guardar</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
                <DialogTitle>¿Eliminar?</DialogTitle>
                <DialogContent>¿Quitar acceso a <strong>{selectedUser?.nombre}</strong>?</DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDelete(false)}>No</Button>
                    <Button onClick={handleDelete} variant="contained" color="error">Sí, eliminar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({...toast, open: false})}>
                <Alert severity={toast.severity} variant="filled">{toast.msg}</Alert>
            </Snackbar>
        </Container>
    );
};

export default Users;