import React, { useState, useEffect } from 'react';
import { 
    Paper, Typography, Box, TextField, Button, Table, TableBody, TableCell, 
    TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    Chip, Divider
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import API from '../api/axiosInstance';

const CategoriesManager = ({ token, setMsg }) => {
    const [categories, setCategories] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingCat, setEditingCat] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', generos: '', tallas: '' });

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const res = await API.get('/inventory/config/categorias', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCategories(res.data || []);
        } catch (e) {
            console.error("Error cargando categorías:", e);
        }
    };

    const handleOpen = (cat = null) => {
        if (cat) {
            setEditingCat(cat);
            // Convertir arrays a string para el textarea
            const generosStr = Array.isArray(cat.generos) ? cat.generos.join(', ') : '';
            // tallas es un objeto { "Hombre": ["S", "M"], "Mujer": ["S"] }
            // Lo mostraremos como un string formateado para edición fácil
            let tallasStr = '';
            if (cat.tallas && typeof cat.tallas === 'object') {
                tallasStr = Object.entries(cat.tallas).map(([g, tArray]) => `${g}: ${tArray.join(', ')}`).join('\n');
            }
            setFormData({ nombre: cat.nombre, generos: generosStr, tallas: tallasStr });
        } else {
            setEditingCat(null);
            setFormData({ nombre: '', generos: 'Hombre, Mujer, Niño, Niña, Unisex', tallas: 'Hombre: S, M, L\nMujer: S, M, L' });
        }
        setOpenDialog(true);
    };

    const handleSave = async () => {
        try {
            // Parsear géneros
            const generosArr = formData.generos.split(',').map(s => s.trim()).filter(s => s);
            
            // Parsear tallas (Formato esperado -> Genero: Talla1, Talla2)
            const tallasObj = {};
            const lines = formData.tallas.split('\n');
            lines.forEach(line => {
                const parts = line.split(':');
                if (parts.length === 2) {
                    const g = parts[0].trim();
                    const t = parts[1].split(',').map(s => s.trim()).filter(s => s);
                    tallasObj[g] = t;
                }
            });

            const payload = {
                id: editingCat ? editingCat.id : null,
                nombre: formData.nombre,
                generos: generosArr,
                tallas: tallasObj
            };

            await API.post('/inventory/config/categorias', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMsg({ type: 'success', text: 'Categoría guardada correctamente' });
            setTimeout(() => setMsg(null), 3000);
            setOpenDialog(false);
            loadCategories();
        } catch (e) {
            setMsg({ type: 'error', text: 'Error al guardar la categoría' });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta categoría?")) return;
        try {
            await API.delete(`/inventory/config/categorias/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMsg({ type: 'success', text: 'Categoría eliminada' });
            setTimeout(() => setMsg(null), 3000);
            loadCategories();
        } catch (e) {
            setMsg({ type: 'error', text: 'Error al eliminar' });
        }
    };

    return (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">🏷️ Gestión de Categorías y Tallas</Typography>
                <Button variant="contained" color="primary" startIcon={<Add />} onClick={() => handleOpen()}>
                    Nueva Categoría
                </Button>
            </Box>
            <Divider sx={{ mb: 2 }} />
            
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell><strong>Categoría</strong></TableCell>
                        <TableCell><strong>Géneros</strong></TableCell>
                        <TableCell><strong>Tallas Configuradas</strong></TableCell>
                        <TableCell align="right"><strong>Acciones</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {categories.map((cat) => (
                        <TableRow key={cat.id}>
                            <TableCell>{cat.nombre}</TableCell>
                            <TableCell>
                                {Array.isArray(cat.generos) && cat.generos.map(g => (
                                    <Chip key={g} label={g} size="small" sx={{ mr: 0.5, mb: 0.5 }} />
                                ))}
                            </TableCell>
                            <TableCell>
                                {cat.tallas && Object.keys(cat.tallas).length > 0 ? (
                                    <Typography variant="body2" color="textSecondary">
                                        {Object.keys(cat.tallas).length} géneros mapeados
                                    </Typography>
                                ) : '-'}
                            </TableCell>
                            <TableCell align="right">
                                <IconButton color="primary" onClick={() => handleOpen(cat)}><Edit /></IconButton>
                                <IconButton color="error" onClick={() => handleDelete(cat.id)}><Delete /></IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                    {categories.length === 0 && (
                        <TableRow><TableCell colSpan={4} align="center">No hay categorías configuradas.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>

            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editingCat ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth label="Nombre de Categoría" sx={{ mt: 2, mb: 2 }}
                        value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})}
                        placeholder="Ej: Zapatos, Pantalones"
                    />
                    <TextField
                        fullWidth label="Géneros (separados por coma)" sx={{ mb: 2 }}
                        value={formData.generos} onChange={e => setFormData({...formData, generos: e.target.value})}
                        placeholder="Hombre, Mujer, Unisex"
                    />
                    <TextField
                        fullWidth label="Tallas por Género" multiline rows={4}
                        value={formData.tallas} onChange={e => setFormData({...formData, tallas: e.target.value})}
                        placeholder="Hombre: S, M, L&#10;Mujer: XS, S, M"
                        helperText="Formato: 'Genero: talla1, talla2'. Una línea por género."
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
                    <Button variant="contained" color="primary" onClick={handleSave}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default CategoriesManager;
