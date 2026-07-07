import React, { useState, useEffect } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    TextField, Button, Grid, Alert, Typography, Box,
    FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import API from '../api/axiosInstance.js';

// 🔴 CAMBIAR DATOS POR CUENTA NUEVA DE CLOUDINARY
const CLOUD_NAME = "dysps3d7k"; 
const UPLOAD_PRESET = "potter_presets";

const initialState = {
    nombre: '', marca: '', descripcion: '', precio_venta: '',
    talla: '', color: '', codigo_barras: '', imagen_url: '',
    categoria: '', genero: ''
};

const CreateProductModal = ({ open, handleClose, fetchInventory, getToken, initialData }) => {
    const [formData, setFormData] = useState(initialState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState(null);
    const [configCats, setConfigCats] = useState([]);

    const isEditing = Boolean(formData.id);

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const token = getToken();
                const res = await API.get('/inventory/config/categorias', { headers: { Authorization: `Bearer ${token}` } });
                setConfigCats(res.data || []);
            } catch(e) {}
        };
        fetchConfig();
    }, [getToken]);

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

    const selectedCatConfig = configCats.find(c => c.nombre === formData.categoria);
    const availableGeneros = selectedCatConfig ? (selectedCatConfig.generos || []) : [];
    const availableTallas = (selectedCatConfig && selectedCatConfig.tallas && formData.genero) 
                            ? (selectedCatConfig.tallas[formData.genero] || []) : [];

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: isEditing ? '#ff9800' : '#2c3e50', color: 'white' }}>
                {isEditing ? '✏️ Editar Producto' : '📦 Registrar Nuevo Producto'}
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} sm={4} display="flex" flexDirection="column" alignItems="center">
                        <Box sx={{ width: 160, height: 160, border: '2px dashed #ccc', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 2, mb: 1, bgcolor: '#f5f5f5' }}>
                            {preview ? (
                                <img src={preview} alt="Prenda" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Typography variant="caption" color="textSecondary">Sin Foto</Typography>
                            )}
                        </Box>
                        <Button variant="outlined" component="label" startIcon={<PhotoCamera />} disabled={loading} size="small" fullWidth>
                            {loading ? "Subiendo..." : (isEditing ? "Cambiar Foto" : "Subir Foto")}
                            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
                        </Button>
                    </Grid>

                    <Grid item xs={12} sm={8}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}><TextField label="Nombre *" name="nombre" fullWidth value={formData.nombre} onChange={handleChange} /></Grid>
                            <Grid item xs={12} sm={6}><TextField label="Marca" name="marca" fullWidth value={formData.marca} onChange={handleChange} /></Grid>
                            
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Categoría</InputLabel>
                                    <Select name="categoria" value={formData.categoria} onChange={handleChange} label="Categoría">
                                        <MenuItem value=""><em>Ninguna</em></MenuItem>
                                        {configCats.map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth disabled={!formData.categoria || availableGeneros.length === 0}>
                                    <InputLabel>Género</InputLabel>
                                    <Select name="genero" value={formData.genero} onChange={handleChange} label="Género">
                                        <MenuItem value=""><em>Seleccione</em></MenuItem>
                                        {availableGeneros.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12}>
                                <TextField label="Descripción" name="descripcion" fullWidth multiline rows={2} value={formData.descripcion} onChange={handleChange} />
                            </Grid>
                        </Grid>
                    </Grid>

                    <Grid item xs={12} sm={4}><TextField label="Precio (Q) *" name="precio_venta" type="number" fullWidth value={formData.precio_venta} onChange={handleChange} /></Grid>
                    <Grid item xs={12} sm={4}><TextField label="Color" name="color" fullWidth value={formData.color} onChange={handleChange} /></Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField 
                            label="Código de Barras" name="codigo_barras" fullWidth value={formData.codigo_barras} onChange={handleChange} 
                            helperText="Si vacío, se genera automático."
                        />
                    </Grid>

                    <Grid item xs={12}>
                        {availableTallas.length > 0 ? (
                            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2, bgcolor: '#fafafa' }}>
                                <Typography variant="subtitle2" color="textSecondary" display="block" gutterBottom>Tallas de {formData.categoria} ({formData.genero}) - Haz clic para seleccionar:</Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                    {availableTallas.map(t => (
                                        <Chip 
                                            key={t} 
                                            label={t} 
                                            clickable 
                                            color={formData.talla === t ? 'primary' : 'default'}
                                            onClick={() => setFormData(prev => ({ ...prev, talla: t }))}
                                            sx={{ fontSize: '1rem', px: 1, py: 2.5, fontWeight: 'bold' }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        ) : (
                            <TextField label="Talla (Ej. S, M, 32, 40)" name="talla" fullWidth value={formData.talla} onChange={handleChange} />
                        )}
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
