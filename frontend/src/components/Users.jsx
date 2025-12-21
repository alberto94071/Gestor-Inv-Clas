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

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            // Log para depuración en tu consola del navegador (F12)
            console.log("Intentando conectar a: /users"); 
            
            const res = await API.get('/users', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setUsers(res.data);
            setLoading(false);
        } catch (err) {
            console.error("Error detallado:", err.response || err);
            showToast("Error al cargar la lista. Revisa la consola (F12)", "error");
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const showToast = (msg, severity = 'success') => {
        setToast({ open: true, msg, severity });
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

        try {
            const token = localStorage.getItem('authToken');
            if (selectedUser) {
                await API.put(`/users/${selectedUser.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario actualizado");
            } else {
                await API.post('/users/register', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                showToast("Usuario creado");
            }
            setOpenModal(false);
            fetchUsers();
        } catch (err) {
            showToast(err.response?.data?.error || "Error al guardar", "error");
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
            showToast("Error al eliminar", "error");
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h4" fontWeight="bold">Personal</Typography>
                <Button variant="contained" startIcon={<PersonAdd />} onClick={() => handleOpenModal()}>
                    Nuevo
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar>{user.nombre.charAt(0)}</Avatar>
                                        {user.nombre}
                                    </Box>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Chip label={user.rol} color={user.rol === 'admin' ? 'secondary' : 'primary'} />
                                </TableCell>
                                <TableCell align="center">
                                    <IconButton onClick={() => handleOpenModal(user)} color="primary"><Edit /></IconButton>
                                    <IconButton onClick={() => { setSelectedUser(user); setOpenDelete(true); }} color="error"><Delete /></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal de Registro */}
            <Dialog open={openModal} onClose={() => setOpenModal(false)}>
                <DialogTitle>{selectedUser ? 'Editar' : 'Nuevo'}</DialogTitle>
                <DialogContent>
                    <TextField label="Nombre" fullWidth margin="dense" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
                    <TextField label="Email" fullWidth margin="dense" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    <TextField label="Password" type="password" fullWidth margin="dense" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                    <TextField select label="Rol" fullWidth margin="dense" value={formData.rol} onChange={(e) => setFormData({...formData, rol: e.target.value})}>
                        <MenuItem value="cajero">Cajero</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                    </TextField>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>

            {/* Modal de Eliminación */}
            <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
                <DialogTitle>¿Eliminar?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDelete(false)}>No</Button>
                    <Button onClick={handleDelete} color="error" variant="contained">Sí, eliminar</Button>
                </DialogActions>
            </Dialog>

            <Snackbar open={toast.open} autoHideDuration={3000} onClose={() => setToast({...toast, open: false})}>
                <Alert severity={toast.severity}>{toast.msg}</Alert>
            </Snackbar>
        </Container>
    );
};

export default Users;