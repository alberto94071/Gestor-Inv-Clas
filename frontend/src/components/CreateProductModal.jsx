import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, Grid, Alert, Typography, Box 
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import API from '../api/axiosInstance.js';

// 🔴 CAMBIAR DATOS POR CUENTA NUEVA DE CLOUDINARY
const CLOUD_NAME = "dysps3d7k"; 
const UPLOAD_PRESET = "potter_presets";

const initialState = {
    nombre: '', marca: '', descripcion: '', precio_venta: '',
    talla: '', color: '', codigo_barras: '', imagen_url: '' 
};

const CreateProductModal = ({ open, handleClose, fetchInventory, getToken, initialData }) => {
    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);

    const isEditing = Boolean(formData.id);

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData(prev => ({ ...initialState, ...initialData }));
                if (initialData.imagen_url) setPreview(initialData.imagen_url);
            } else {
                setFormData(initialState);
                setPreview(null);
            }
        } else {
            // Limpieza de memoria al cerrar
            setPreview(null);
        }
    }, [open, initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview local rápido
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setLoading(true);

        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", UPLOAD_PRESET); 

        try {
            // Subida directa a Cloudinary
            const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: data });
            const fileData = await res.json();
            
            if (fileData.error) throw new Error(fileData.error.message);

            // Guardamos la URL segura que nos devuelve Cloudinary (ya redimensionada por el preset)
            setFormData(prev => ({ ...prev, imagen_url: fileData.secure_url }));
        } catch (err) {
            console.error(err);
            setError("Error al subir imagen. Verifica tu conexión.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.nombre || !formData.precio_venta) {
            setError("Nombre y Precio son obligatorios.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const token = getToken();
            
            if (isEditing) {
                await API.put(`/inventory/products/${formData.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await API.post('/inventory/products', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            fetchInventory();
            handleClose();
        } catch (err) {
            const msg = err.response?.data?.error || "Error al procesar la solicitud.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: isEditing ? '#ff9800' : '#2c3e50', color: 'white' }}>
                {isEditing ? '✏️ Editar Producto' : '📦 Registrar Nuevo Producto'}
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 2 }}>
                        <Box sx={{ width: 150, height: 150, border: '2px dashed #ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 2, mb: 1, bgcolor: '#f5f5f5' }}>
                            {preview ? (
                                <img src={preview} alt="Prenda" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Typography variant="caption" color="textSecondary">Sin Foto</Typography>
                            )}
                        </Box>
                        <Button variant="outlined" component="label" startIcon={<PhotoCamera />} disabled={loading}>
                            {loading ? "Subiendo..." : (isEditing ? "Cambiar Foto" : "Subir Foto")}
                            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </Button>
                    </Grid>

                    <Grid item xs={12} sm={6}><TextField label="Nombre *" name="nombre" fullWidth value={formData.nombre} onChange={handleChange} /></Grid>
                    <Grid item xs={12} sm={6}><TextField label="Marca" name="marca" fullWidth value={formData.marca} onChange={handleChange} /></Grid>
                    <Grid item xs={12}><TextField label="Descripción" name="descripcion" fullWidth multiline rows={2} value={formData.descripcion} onChange={handleChange} /></Grid>
                    <Grid item xs={6} sm={4}><TextField label="Precio (Q) *" name="precio_venta" type="number" fullWidth value={formData.precio_venta} onChange={handleChange} /></Grid>
                    <Grid item xs={6} sm={4}><TextField label="Talla" name="talla" fullWidth value={formData.talla} onChange={handleChange} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="Color" name="color" fullWidth value={formData.color} onChange={handleChange} /></Grid>
                    <Grid item xs={12}>
                        <TextField 
                            label="Código de Barras" name="codigo_barras" fullWidth value={formData.codigo_barras} onChange={handleChange} 
                            helperText="Si lo dejas vacío, el sistema generará uno."
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color={isEditing ? "warning" : "primary"} disabled={loading}>
                    {loading ? 'Procesando...' : (isEditing ? 'Guardar Cambios' : 'Registrar')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateProductModal;
