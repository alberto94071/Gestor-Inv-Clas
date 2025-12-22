import React, { useState, useEffect } from 'react';
import { 
    Container, Paper, Typography, Box, TextField, Button, 
    Grid, FormControl, InputLabel, Select, MenuItem, Table, 
    TableBody, TableCell, TableHead, TableRow, Alert, CircularProgress 
} from '@mui/material';
import API from '../api/axiosInstance';

const AdminTools = () => {
    // Inicialización segura del estado
    const [config, setConfig] = useState({
        nombre_empresa: '', 
        direccion: '', 
        mensaje_final: '', 
        whatsapp: '', 
        instagram_url: '', 
        logo_url: '', 
        tipo_papel: '80mm'
    });
    
    // Inicializamos como array vacío para evitar error en .map
    const [stagnantProducts, setStagnantProducts] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    const token = localStorage.getItem('authToken');

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            const res = await API.get('/inventory/config/ticket', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            // Verificamos que res.data exista antes de asignarlo
            if (res && res.data) {
                setConfig(prev => ({ ...prev, ...res.data }));
            }
        } catch (e) { 
            console.error("Error cargando config:", e); 
        }
    };

    const loadStagnant = async () => {
        setLoading(true);
        try {
            const res = await API.get('/inventory/reports/stagnant', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            // Validación de seguridad: Asegurar que sea un array
            if (Array.isArray(res.data)) {
                setStagnantProducts(res.data);
            } else {
                setStagnantProducts([]);
            }
        } catch (e) { 
            setMsg({ type: 'error', text: 'Error cargando reporte de estancados' });
            setStagnantProducts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            await API.post('/inventory/config/ticket', config, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setMsg({ type: 'success', text: 'Configuración guardada correctamente' });
            setTimeout(() => setMsg(null), 3000);
        } catch (e) { 
            setMsg({ type: 'error', text: 'Error al guardar la configuración' }); 
        }
    };

    const handleCleanup = async () => {
        if(!window.confirm("¿Estás seguro de borrar las ventas de hace más de 1 mes? Esta acción no se puede deshacer.")) return;
        try {
            await API.delete('/inventory/sales/cleanup', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setMsg({ type: 'success', text: 'Base de datos optimizada con éxito.' });
        } catch (e) { 
            setMsg({ type: 'error', text: 'Error al realizar la limpieza' }); 
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#2c3e50' }}>
                🛠️ Herramientas de Administrador
            </Typography>
            
            {msg && <Alert severity={msg.type} sx={{ mb: 2 }}>{msg.text}</Alert>}

            <Grid container spacing={3}>
                {/* 1. CONFIGURACIÓN TICKET */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3, elevation: 3 }}>
                        <Typography variant="h6" gutterBottom fontWeight="bold" sx={{ borderBottom: '2px solid #eee', pb: 1, mb: 2 }}>
                            🖨️ Configuración del Recibo
                        </Typography>
                        
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField 
                                label="Nombre de la Empresa" 
                                fullWidth 
                                value={config.nombre_empresa || ''} 
                                onChange={e=>setConfig({...config, nombre_empresa: e.target.value})} 
                            />
                            <TextField 
                                label="Dirección" 
                                multiline rows={2} 
                                fullWidth 
                                value={config.direccion || ''} 
                                onChange={e=>setConfig({...config, direccion: e.target.value})} 
                            />
                            <TextField 
                                label="Mensaje de Agradecimiento" 
                                fullWidth 
                                value={config.mensaje_final || ''} 
                                onChange={e=>setConfig({...config, mensaje_final: e.target.value})} 
                            />
                            <TextField 
                                label="Teléfono / WhatsApp" 
                                fullWidth 
                                value={config.whatsapp || ''} 
                                onChange={e=>setConfig({...config, whatsapp: e.target.value})} 
                            />
                            
                            <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                                <TextField 
                                    label="URL del Logo (Link de imagen)" 
                                    fullWidth 
                                    variant="standard"
                                    value={config.logo_url || ''} 
                                    onChange={e=>setConfig({...config, logo_url: e.target.value})} 
                                    sx={{ mb: 2 }} 
                                />
                                {config.logo_url && (
                                    <Box sx={{ textAlign: 'center' }}>
                                        <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1 }}>
                                            Vista previa:
                                        </Typography>
                                        <img 
                                            src={config.logo_url} 
                                            alt="Logo Preview" 
                                            style={{ height: '60px', objectFit: 'contain', border: '1px dashed #ccc' }} 
                                            onError={(e) => {e.target.style.display = 'none'}} 
                                        />
                                    </Box>
                                )}
                            </Box>

                            <FormControl fullWidth>
                                <InputLabel>Formato de Impresión</InputLabel>
                                <Select 
                                    label="Formato de Impresión" 
                                    value={config.tipo_papel || '80mm'} 
                                    onChange={e=>setConfig({...config, tipo_papel: e.target.value})}
                                >
                                    <MenuItem value="80mm">Ticket Térmico (80mm)</MenuItem>
                                    <MenuItem value="carta">Hoja Carta (Normal)</MenuItem>
                                </Select>
                            </FormControl>
                            
                            <Button variant="contained" size="large" onClick={handleSaveConfig} sx={{ mt: 1, fontWeight: 'bold' }}>
                                Guardar Cambios
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* 2. REPORTE Y MANTENIMIENTO */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                        <Typography variant="h6" color="error" fontWeight="bold" gutterBottom>
                            ⚠️ Productos Estancados (+3 meses)
                        </Typography>
                        <Button variant="outlined" color="error" onClick={loadStagnant} sx={{ mb: 2 }}>
                            Generar Reporte
                        </Button>
                        
                        {loading ? <Box display="flex" justifyContent="center"><CircularProgress size={24} /></Box> : (
                            <div style={{ overflowX: 'auto' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Producto</TableCell>
                                            <TableCell>Stock</TableCell>
                                            <TableCell>Ingreso</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {/* Validación de seguridad: Verifica que sea un array antes de hacer map */}
                                        {Array.isArray(stagnantProducts) && stagnantProducts.map((p, i) => (
                                            <TableRow key={i}>
                                                <TableCell>{p.nombre}</TableCell>
                                                <TableCell>{p.cantidad}</TableCell>
                                                <TableCell>{p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString() : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                        {Array.isArray(stagnantProducts) && stagnantProducts.length === 0 && (
                                            <TableRow><TableCell colSpan={3} align="center">No hay productos antiguos.</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </Paper>

                    <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#fff8e1', border: '1px solid #ffe082' }}>
                        <Typography variant="h6" fontWeight="bold" sx={{ color: '#f57c00' }}>
                            🧹 Mantenimiento de Base de Datos
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, color: '#666' }}>
                            Esta opción elimina el historial de ventas con más de 1 mes de antigüedad para liberar espacio y acelerar el sistema.
                        </Typography>
                        <Button variant="contained" color="warning" fullWidth onClick={handleCleanup}>
                            Limpiar Historial Antiguo
                        </Button>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};
export default AdminTools;