import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, Grid, Alert, Typography, Box, IconButton 
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import API from '../api/axiosInstance.js';

const CreateProductModal = ({ open, handleClose, fetchInventory, getToken }) => {
    // Configuración de Cloudinary (Usa tu Cloud Name)
    const CLOUD_NAME = "dbwlqg4tp"; 
    const UPLOAD_PRESET = "potter_presets"; // Por defecto Cloudinary crea uno llamado 'ml_default'

    const initialState = {
        nombre: '',
        marca: '',
        descripcion: '',
        precio_venta: '',
        talla: '',
        color: '',
        codigo_barras: '',
        imagen_url: '' // Nuevo campo
    };

    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- FUNCIÓN PARA SUBIR A CLOUDINARY ---
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Mostrar vista previa local
        setPreview(URL.createObjectURL(file));
        setLoading(true);

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET); 

        try {
            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
                { method: "POST", body: data }
            );
            const fileData = await res.json();
            
            // Guardamos la URL que nos da Cloudinary
            setFormData(prev => ({ ...prev, imagen_url: fileData.secure_url }));
        } catch (err) {
            setError("Error al subir la imagen a la nube.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        if (!formData.nombre || !formData.marca || !formData.precio_venta) {
            setError("Por favor, completa los campos obligatorios.");
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            if (!token) throw new Error("No autenticado.");

            await API.post('/inventory/products', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchInventory();
            handleClose();
            setFormData(initialState);
            setPreview(null);
        } catch (err) {
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
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* SECCIÓN DE IMAGEN */}
                    <Grid item xs={12} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 2 }}>
                        <Box 
                            sx={{ 
                                width: 150, height: 150, border: '2px dashed #ccc', 
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                overflow: 'hidden', borderRadius: 2, mb: 1
                            }}
                        >
                            {preview ? (
                                <img src={preview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Typography variant="caption" color="textSecondary">Sin Foto</Typography>
                            )}
                        </Box>
                        <Button variant="outlined" component="label" startIcon={<PhotoCamera />} disabled={loading}>
                            {loading ? "Subiendo..." : "Subir Foto"}
                            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </Button>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField label="Nombre" name="nombre" fullWidth required value={formData.nombre} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Marca" name="marca" fullWidth required value={formData.marca} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Descripción" name="descripcion" fullWidth multiline rows={2} value={formData.descripcion} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField label="Precio (Q)" name="precio_venta" type="number" fullWidth required value={formData.precio_venta} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField label="Talla" name="talla" fullWidth required value={formData.talla} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Color" name="color" fullWidth required value={formData.color} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Código de Barras" name="codigo_barras" fullWidth value={formData.codigo_barras} onChange={handleChange} />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose} color="secondary">Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
                    {loading ? 'Procesando...' : 'Guardar Producto'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateProductModal;