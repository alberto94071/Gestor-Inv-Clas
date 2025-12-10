// src/components/CreateProductModal.jsx
import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, Grid, Alert, FormControlLabel, Checkbox, Typography 
} from '@mui/material';
import API from '../api/axiosInstance.js';

const CreateProductModal = ({ open, handleClose, fetchInventory, getToken }) => {
    // Estado inicial del formulario
    const initialState = {
        nombre: '',
        marca: '',
        descripcion: '',
        precio_venta: '',
        talla: '',
        color: '',
        codigo_barras: ''
    };

    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Maneja los cambios en los campos de texto
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Envía los datos al backend
    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        // Validación básica
        if (!formData.nombre || !formData.marca || !formData.precio_venta) {
            setError("Por favor, completa los campos obligatorios (Nombre, Marca, Precio).");
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            if (!token) throw new Error("No autenticado.");

            // Enviamos los datos. Si codigo_barras va vacío, el backend lo generará.
            await API.post('/inventory/products', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Éxito: Actualizar tabla, cerrar modal y limpiar formulario
            fetchInventory();
            handleClose();
            setFormData(initialState);

        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.error || "Error al crear el producto.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>📦 Registrar Nuevo Producto</DialogTitle>
            <DialogContent>
                {error && <Alert severity="error" sx={{ mb: 2, mt: 1 }}>{error}</Alert>}
                
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Deja el campo "Código de Barras" vacío para generar uno automáticamente.
                </Typography>

                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* Fila 1 */}
                    <Grid item xs={12} sm={6}>
                        <TextField 
                            label="Nombre del Producto" name="nombre" fullWidth required 
                            value={formData.nombre} onChange={handleChange} 
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField 
                            label="Marca" name="marca" fullWidth required 
                            value={formData.marca} onChange={handleChange} 
                        />
                    </Grid>

                    {/* Fila 2 */}
                    <Grid item xs={12}>
                        <TextField 
                            label="Descripción" name="descripcion" fullWidth multiline rows={2}
                            value={formData.descripcion} onChange={handleChange} 
                        />
                    </Grid>

                    {/* Fila 3 */}
                    <Grid item xs={6} sm={4}>
                        <TextField 
                            label="Precio Venta (Q)" name="precio_venta" type="number" fullWidth required 
                            value={formData.precio_venta} onChange={handleChange} 
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField 
                            label="Talla" name="talla" fullWidth required 
                            value={formData.talla} onChange={handleChange} 
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField 
                            label="Color" name="color" fullWidth required 
                            value={formData.color} onChange={handleChange} 
                        />
                    </Grid>

                    {/* Fila 4: Código de Barras */}
                    <Grid item xs={12}>
                        <TextField 
                            label="Código de Barras (Opcional)" name="codigo_barras" fullWidth 
                            placeholder="Déjalo vacío para autogenerar"
                            value={formData.codigo_barras} onChange={handleChange}
                            helperText="Si tienes el producto físico, escanea el código aquí."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Producto'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateProductModal;