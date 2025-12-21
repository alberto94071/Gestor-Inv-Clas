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

    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'cajero'
    });

    // Cargar lista de usuarios
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await API.get('/users', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            showToast("Error al cargar la lista de usuarios", "error");
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
            setFormData({ 
                nombre: user.nombre, 
                email: user.email, 
                password: '', // Siempre vacío al abrir para editar
                rol: user.rol 
            });
        } else {
            setSelectedUser(null);
            setFormData({ nombre: '', email: '', password: '', rol: 'cajero' });
        }
        setOpenModal(true);
    };

    const handleSave = async () => {
        // Validación de campos requeridos
        if (!formData.nombre || !formData.email || (!selectedUser && !formData.password)) {
            showToast("Completa los campos obligatorios", "warning");
            return;
        }
        if (!validateEmail(formData.email)) {
            showToast("Formato de correo electrónico inválido", "error");
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            
            // Si es edición y la contraseña está vacía, la eliminamos del objeto a enviar
            const dataToSend = { ...formData };
            if (selectedUser && !dataToSend.password) {
                delete dataToSend.password;
            }

            if (selectedUser) {
                // ACTUALIZAR
                await API.put(`/users/${selectedUser.id}`, dataToSend, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario actualizado correctamente");
            } else {
                // REGISTRAR NUEVO
                await API.post('/users/register', dataToSend, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario registrado con éxito");
            }
            
            setOpenModal(false);
            fetchUsers(); // Recargar lista
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Error en el servidor";
            showToast(errorMsg, "error");
        }
    };

    const handleDelete = async () => {
        try {
            const token = localStorage.getItem('authToken');
            await API.delete(`/users/${selectedUser.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast("Usuario eliminado correctamente");
            setOpenDelete(false);
            fetchUsers();
        } catch (err) {
            showToast("No se pudo eliminar al usuario", "error");
        }
    };

    if (loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
        </Box>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold" color="textPrimary">
                    Personal de la Empresa
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<PersonAdd />} 
                    onClick={() => handleOpenModal()}
                    sx={{ borderRadius: 2 }}
                >
                    Nuevo Usuario
                </Button>
            </Box>

            <TableContainer component={Paper} elevation={4} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f0f2f5' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Email / Usuario</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>Nivel de Acceso</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Acciones</TableCell>
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
                                        <Typography variant="body1" fontWeight="medium">
                                            {user.nombre}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={user.rol === 'admin' ? 'Administrador' : 'Cajero'} 
                                        color={user.rol === 'admin' ? 'error' : 'success'} 
                                        variant="outlined"
                                        size="small" 
                                        sx={{ fontWeight: 'bold' }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton color="primary" onClick={() => handleOpenModal(user)}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton color="error" onClick={() => { setSelectedUser(user); setOpenDelete(true); }}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* MODAL CREAR/EDITAR */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {selectedUser ? 'Editar Usuario' : 'Nuevo Registro'}
                    <IconButton onClick={() => setOpenModal(false)} size="small">
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField 
                            label="Nombre Completo" 
                            fullWidth 
                            variant="outlined"
                            value={formData.nombre} 
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                        />
                        <TextField 
                            label="Correo Electrónico" 
                            fullWidth 
                            variant="outlined"
                            value={formData.email} 
                            onChange={(e) => setFormData({...formData, email: e.target.value})} 
                        />
                        <TextField 
                            label={selectedUser ? "Cambiar Contraseña (dejar vacío para mantener)" : "Contraseña"} 
                            type="password" 
                            fullWidth 
                            variant="outlined"
                            value={formData.password} 
                            onChange={(e) => setFormData({...formData, password: e.target.value})} 
                        />
                        <TextField 
                            select 
                            label="Rol de Usuario" 
                            fullWidth
                            variant="outlined"
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
                    <Button onClick={handleSave} variant="contained" startIcon={<Save />} sx={{ px: 3 }}>
                        Guardar Cambios
                    </Button>
                </DialogActions>
            </Dialog>

            {/* DIÁLOGO DE ELIMINACIÓN */}
            <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
                <DialogTitle sx={{ color: '#d32f2f', fontWeight: 'bold' }}>¿Confirmar eliminación?</DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Estás seguro de que deseas quitar el acceso a <strong>{selectedUser?.nombre}</strong>? 
                        Esta acción no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setOpenDelete(false)} color="inherit">Cancelar</Button>
                    <Button onClick={handleDelete} variant="contained" color="error">
                        Sí, eliminar usuario
                    </Button>
                </DialogActions>
            </Dialog>

            {/* NOTIFICACIONES */}
            <Snackbar 
                open={toast.open} 
                autoHideDuration={4000} 
                onClose={() => setToast({...toast, open: false})}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
                    {toast.msg}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Users;