// src/components/AdminTools.jsx
import React, { useState, useEffect } from 'react';
import { 
    Container, Paper, Typography, Box, TextField, Button, 
    Grid, FormControl, InputLabel, Select, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Alert 
} from '@mui/material';
import API from '../api/axiosInstance';

const AdminTools = () => {
    const [config, setConfig] = useState({
        nombre_empresa: '', direccion: '', mensaje_final: '', 
        whatsapp: '', instagram_url: '', logo_url: '', tipo_papel: '80mm'
    });
    const [stagnantProducts, setStagnantProducts] = useState([]);
    const [msg, setMsg] = useState(null);

    const token = localStorage.getItem('authToken');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await API.get('/inventory/config/ticket', { headers: { Authorization: `Bearer ${token}` } });
            if (res.data) setConfig(res.data);
        } catch (e) { console.error(e); }
    };

    const loadStagnant = async () => {
        try {
            const res = await API.get('/inventory/reports/stagnant', { headers: { Authorization: `Bearer ${token}` } });
            setStagnantProducts(res.data);
        } catch (e) { setMsg({ type: 'error', text: 'Error cargando reporte' }); }
    };

    const handleSaveConfig = async () => {
        try {
            await API.post('/inventory/config/ticket', config, { headers: { Authorization: `Bearer ${token}` } });
            setMsg({ type: 'success', text: 'Configuración guardada' });
        } catch (e) { setMsg({ type: 'error', text: 'Error guardando' }); }
    };

    const handleCleanup = async () => {
        if(!window.confirm("¿Borrar ventas de hace más de 1 mes?")) return;
        try {
            await API.delete('/inventory/sales/cleanup', { headers: { Authorization: `Bearer ${token}` } });
            setMsg({ type: 'success', text: 'Base de datos optimizada.' });
        } catch (e) { setMsg({ type: 'error', text: 'Error al limpiar' }); }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>🛠️ Herramientas de Administrador</Typography>
            {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

            <Grid container spacing={3}>
                {/* 1. CONFIGURACIÓN TICKET */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>🖨️ Configurar Recibo</Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField label="Nombre Empresa" value={config.nombre_empresa} onChange={e=>setConfig({...config, nombre_empresa: e.target.value})} />
                            <TextField label="Dirección" multiline rows={2} value={config.direccion} onChange={e=>setConfig({...config, direccion: e.target.value})} />
                            <TextField label="Mensaje Final (Ej: Feliz Navidad)" value={config.mensaje_final} onChange={e=>setConfig({...config, mensaje_final: e.target.value})} />
                            <TextField label="WhatsApp" value={config.whatsapp} onChange={e=>setConfig({...config, whatsapp: e.target.value})} />
                            <TextField label="URL Logo (Cloudinary)" value={config.logo_url} onChange={e=>setConfig({...config, logo_url: e.target.value})} />
                            <FormControl>
                                <InputLabel>Tipo de Papel</InputLabel>
                                <Select value={config.tipo_papel || '80mm'} onChange={e=>setConfig({...config, tipo_papel: e.target.value})}>
                                    <MenuItem value="80mm">Térmico 80mm</MenuItem>
                                    <MenuItem value="carta">Hoja Carta</MenuItem>
                                    <MenuItem value="oficio">Hoja Oficio</MenuItem>
                                </Select>
                            </FormControl>
                            <Button variant="contained" onClick={handleSaveConfig}>Guardar Diseño</Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* 2. REPORTE ESTANCADOS Y LIMPIEZA */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h6" color="error">⚠️ Productos Estancados (+3 meses)</Typography>
                        <Button variant="outlined" onClick={loadStagnant} sx={{ mb: 2 }}>Cargar Reporte</Button>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Producto</TableCell><TableCell>Stock</TableCell><TableCell>Fecha</TableCell></TableRow></TableHead>
                            <TableBody>
                                {stagnantProducts.map((p, i) => (
                                    <TableRow key={i}>
                                        <TableCell>{p.nombre}</TableCell>
                                        <TableCell>{p.cantidad}</TableCell>
                                        <TableCell>{new Date(p.fecha_creacion).toLocaleDateString()}</TableCell>
                                    </TableRow>
                                ))}
                                {stagnantProducts.length === 0 && <TableRow><TableCell colSpan={3}>No hay productos estancados.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </Paper>

                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6">🧹 Mantenimiento</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>Eliminar historial antiguo para liberar espacio.</Typography>
                        <Button variant="contained" color="warning" onClick={handleCleanup}>Limpiar Historial (> 1 mes)</Button>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};
export default AdminTools;