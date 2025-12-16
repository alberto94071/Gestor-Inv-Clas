import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, Grid, Alert, Typography, Box 
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import API from '../api/axiosInstance.js';

// 1. Mover constantes AFUERA del componente para evitar advertencias de ESLint
const CLOUD_NAME = "dbwlqg4tp"; 
const UPLOAD_PRESET = "potter_presets"; 

const initialState = {
    nombre: '',
    marca: '',
    descripcion: '',
    precio_venta: '',
    talla: '',
    color: '',
    codigo_barras: '',
    imagen_url: '' 
};

// 2. Agregamos 'initialData' a las props para recibir el código escaneado
const CreateProductModal = ({ open, handleClose, fetchInventory, getToken, initialData }) => {

    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);

    // 3. UseEffect Corregido: Detecta cuando se abre el modal y si hay datos previos (código escaneado)
    useEffect(() => {
        if (open) {
            if (initialData) {
                // Si viene un código del Dashboard, lo pre-cargamos
                setFormData(prev => ({ ...initialState, ...initialData }));
            } else {
                // Si es apertura manual, limpiamos
                setFormData(initialState);
                setPreview(null);
            }
        }
    }, [open, initialData]); 
    // Al estar 'initialState' fuera del componente, ya no es necesario ponerlo aquí

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

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
            setFormData(prev => ({ ...prev, imagen_url: fileData.secure_url }));
        } catch (err) {
            console.error(err);
            setError("Error al subir imagen. Verifique conexión.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);

        if (!formData.nombre || !formData.marca || !formData.precio_venta) {
            setError("Por favor, completa Nombre, Marca y Precio.");
            setLoading(false);
            return;
        }

        try {
            const token = getToken();
            await API.post('/inventory/products', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchInventory(); 
            handleClose();
            // El reseteo del form ya lo maneja el useEffect al cambiar 'open'
        } catch (err) {
            const msg = err.response?.data?.error || "Error al guardar.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: '#2c3e50', color: 'white' }}>📦 Registrar Nuevo Producto</DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    {/* FOTO */}
                    <Grid item xs={12} display="flex" flexDirection="column" alignItems="center" sx={{ mb: 2 }}>
                        <Box 
                            sx={{ 
                                width: 150, height: 150, border: '2px dashed #ccc', 
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                overflow: 'hidden', borderRadius: 2, mb: 1, bgcolor: '#f9f9f9'
                            }}
                        >
                            {preview || formData.imagen_url ? (
                                <img src={preview || formData.imagen_url} alt="Prenda" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Typography variant="caption" color="textSecondary">Sin Foto</Typography>
                            )}
                        </Box>
                        <Button variant="outlined" component="label" startIcon={<PhotoCamera />} disabled={loading}>
                            {loading ? "Cargando..." : "Tomar Foto"}
                            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </Button>
                    </Grid>

                    {/* CAMPOS */}
                    <Grid item xs={12} sm={6}>
                        <TextField label="Nombre *" name="nombre" fullWidth value={formData.nombre} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField label="Marca *" name="marca" fullWidth value={formData.marca} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField label="Descripción" name="descripcion" fullWidth multiline rows={2} value={formData.descripcion} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField label="Precio (Q) *" name="precio_venta" type="number" fullWidth value={formData.precio_venta} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <TextField label="Talla" name="talla" fullWidth value={formData.talla} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField label="Color" name="color" fullWidth value={formData.color} onChange={handleChange} />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField 
                            label="Código de Barras" 
                            name="codigo_barras" 
                            fullWidth 
                            value={formData.codigo_barras} 
                            onChange={handleChange} 
                            helperText="Escanea o escribe. Si lo dejas vacío se generará uno automático."
                            InputLabelProps={{ shrink: true }} 
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button onClick={handleClose} color="secondary">Cancelar</Button>
                <Button onClick={handleSubmit} variant="contained" color="primary" disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Producto'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default CreateProductModal;