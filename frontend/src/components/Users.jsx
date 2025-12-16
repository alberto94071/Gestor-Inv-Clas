// src/components/Users.jsx
import React, { useState } from 'react';
import { 
    Box, Typography, Paper, Grid, TextField, Button, Alert, 
    FormControl, InputLabel, Select, MenuItem 
} from '@mui/material';
import API from '../api/axiosInstance'; 

const Users = () => {
    const initialState = { nombre: '', email: '', password: '', rol: 'Cajero' };
    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [responseMsg, setResponseMsg] = useState({ type: '', text: '' });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResponseMsg({ type: '', text: '' });

        if (!formData.password || formData.password.length < 6) {
            setResponseMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
            setLoading(false);
            return;
        }

        try {
            const token = localStorage.getItem('authToken');
            const response = await API.post('/users/register', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setResponseMsg({ type: 'success', text: `Usuario ${response.data.user.nombre} creado con éxito.` });
            setFormData(initialState); // Limpiar formulario

        } catch (err) {
            const errorText = err.response?.data?.error || 'Error de conexión o datos inválidos.';
            setResponseMsg({ type: 'error', text: errorText });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                👥 Gestión de Usuarios
            </Typography>

            <Paper elevation={3} sx={{ p: 4, maxWidth: 600, mt: 3 }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                    Registrar Nuevo Empleado
                </Typography>
                
                {responseMsg.text && (
                    <Alert severity={responseMsg.type} sx={{ mb: 3 }}>
                        {responseMsg.text}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit}>
                    <Grid container spacing={2}>
                        
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required fullWidth label="Nombre" name="nombre"
                                value={formData.nombre} onChange={handleChange}
                            />
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Rol</InputLabel>
                                <Select
                                    label="Rol" name="rol"
                                    value={formData.rol} onChange={handleChange}
                                >
                                    <MenuItem value={'admin'}>Administrador</MenuItem>
                                    <MenuItem value={'cajero'}>Cajero</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                required fullWidth label="Correo Electrónico" name="email" type="email"
                                value={formData.email} onChange={handleChange}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                required fullWidth label="Contraseña" name="password" type="password"
                                value={formData.password} onChange={handleChange}
                                helperText="Mínimo 6 caracteres."
                            />
                        </Grid>
                        
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <Button
                                type="submit" variant="contained" color="primary" fullWidth
                                disabled={loading}
                            >
                                {loading ? 'Guardando...' : 'Registrar Empleado'}
                            </Button>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Box>
    );
};

export default Users;