import React, { useState, useEffect } from 'react';
import { 
    Container, Paper, Typography, Box, TextField, Button, 
    Grid, FormControl, InputLabel, Select, MenuItem, Table, 
    TableBody, TableCell, TableHead, TableRow, Alert, CircularProgress,
    Card, CardActionArea, CardContent, IconButton, Divider
} from '@mui/material';
import { 
    ReceiptLong, WarningAmber, Build, Category, ArrowBack 
} from '@mui/icons-material';
import API from '../api/axiosInstance';
import CategoriesManager from './CategoriesManager';

const AdminTools = () => {
    const [activeView, setActiveView] = useState('launcher'); // 'launcher', 'recibo', 'estancados', 'mantenimiento', 'categorias'
    
    // States for Recibo
    const [config, setConfig] = useState({
        nombre_empresa: '', direccion: '', mensaje_final: '', 
        whatsapp: '', instagram_url: '', logo_url: '', tipo_papel: '80mm'
    });
    
    // States for Estancados
    const [stagnantProducts, setStagnantProducts] = useState([]); 
    const [loading, setLoading] = useState(false);
    
    // Global Msg
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
            if (Array.isArray(res.data)) setStagnantProducts(res.data);
            else setStagnantProducts([]);
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
            setTimeout(() => setMsg(null), 3000);
        } catch (e) { 
            setMsg({ type: 'error', text: 'Error al realizar la limpieza' }); 
        }
    };

    const renderLauncher = () => (
        <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
                <Card elevation={4} sx={{ borderRadius: 3, height: '100%' }}>
                    <CardActionArea onClick={() => setActiveView('recibo')} sx={{ height: '100%', p: 3, textAlign: 'center' }}>
                        <ReceiptLong sx={{ fontSize: 60, color: '#3f51b5', mb: 2 }} />
                        <Typography variant="h6" fontWeight="bold">Configuración de Recibo</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Personaliza el ticket, logo, mensaje final y formato de impresión.
                        </Typography>
                    </CardActionArea>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card elevation={4} sx={{ borderRadius: 3, height: '100%' }}>
                    <CardActionArea onClick={() => setActiveView('estancados')} sx={{ height: '100%', p: 3, textAlign: 'center' }}>
                        <WarningAmber sx={{ fontSize: 60, color: '#ff9800', mb: 2 }} />
                        <Typography variant="h6" fontWeight="bold">Reporte de Estancados</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Identifica productos con más de 3 meses en inventario.
                        </Typography>
                    </CardActionArea>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card elevation={4} sx={{ borderRadius: 3, height: '100%' }}>
                    <CardActionArea onClick={() => setActiveView('mantenimiento')} sx={{ height: '100%', p: 3, textAlign: 'center' }}>
                        <Build sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                        <Typography variant="h6" fontWeight="bold">Mantenimiento de BD</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Limpia el historial antiguo para liberar espacio en el sistema.
                        </Typography>
                    </CardActionArea>
                </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
                <Card elevation={4} sx={{ borderRadius: 3, height: '100%' }}>
                    <CardActionArea onClick={() => setActiveView('categorias')} sx={{ height: '100%', p: 3, textAlign: 'center' }}>
                        <Category sx={{ fontSize: 60, color: '#9c27b0', mb: 2 }} />
                        <Typography variant="h6" fontWeight="bold">Gestión de Categorías</Typography>
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                            Crea y administra categorías, géneros y mapas de tallas.
                        </Typography>
                    </CardActionArea>
                </Card>
            </Grid>
        </Grid>
    );

    const renderBackButton = (title) => (
        <Box display="flex" alignItems="center" mb={3}>
            <IconButton onClick={() => setActiveView('launcher')} sx={{ mr: 2, bgcolor: '#f0f0f0' }}>
                <ArrowBack />
            </IconButton>
            <Typography variant="h5" fontWeight="bold">{title}</Typography>
        </Box>
    );

    const renderReciboView = () => (
        <Paper sx={{ p: 4, borderRadius: 3, elevation: 3, maxWidth: 800, margin: '0 auto' }}>
            {renderBackButton('🖨️ Configuración del Recibo')}
            <Divider sx={{ mb: 4 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField 
                    label="Nombre de la Empresa" fullWidth 
                    value={config.nombre_empresa || ''} onChange={e=>setConfig({...config, nombre_empresa: e.target.value})} 
                />
                <TextField 
                    label="Dirección" multiline rows={2} fullWidth 
                    value={config.direccion || ''} onChange={e=>setConfig({...config, direccion: e.target.value})} 
                />
                <TextField 
                    label="Mensaje de Agradecimiento" fullWidth 
                    value={config.mensaje_final || ''} onChange={e=>setConfig({...config, mensaje_final: e.target.value})} 
                />
                <TextField 
                    label="Teléfono / WhatsApp" fullWidth 
                    value={config.whatsapp || ''} onChange={e=>setConfig({...config, whatsapp: e.target.value})} 
                />
                
                <Box sx={{ bgcolor: '#f5f5f5', p: 3, borderRadius: 2 }}>
                    <TextField 
                        label="URL del Logo (Link de imagen)" fullWidth variant="standard"
                        value={config.logo_url || ''} onChange={e=>setConfig({...config, logo_url: e.target.value})} 
                        sx={{ mb: 2 }} 
                    />
                    {config.logo_url && (
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" display="block" color="textSecondary" sx={{ mb: 1 }}>Vista previa:</Typography>
                            <img src={config.logo_url} alt="Logo Preview" style={{ height: '80px', objectFit: 'contain', border: '1px dashed #ccc' }} onError={(e) => {e.target.style.display = 'none'}} />
                        </Box>
                    )}
                </Box>

                <FormControl fullWidth>
                    <InputLabel>Formato de Impresión</InputLabel>
                    <Select label="Formato de Impresión" value={config.tipo_papel || '80mm'} onChange={e=>setConfig({...config, tipo_papel: e.target.value})}>
                        <MenuItem value="80mm">Ticket Térmico (80mm)</MenuItem>
                        <MenuItem value="carta">Hoja Carta (Normal)</MenuItem>
                    </Select>
                </FormControl>
                
                <Button variant="contained" size="large" onClick={handleSaveConfig} sx={{ mt: 2, py: 1.5, fontWeight: 'bold' }}>
                    Guardar Cambios
                </Button>
            </Box>
        </Paper>
    );

    const renderEstancadosView = () => (
        <Paper sx={{ p: 4, borderRadius: 3, elevation: 3, maxWidth: 900, margin: '0 auto' }}>
            {renderBackButton('⚠️ Productos Estancados (+3 meses)')}
            <Divider sx={{ mb: 4 }} />

            <Button variant="outlined" color="error" onClick={loadStagnant} sx={{ mb: 3 }} size="large">
                Generar Reporte
            </Button>
            
            {loading ? <Box display="flex" justifyContent="center" p={5}><CircularProgress /></Box> : (
                <div style={{ overflowX: 'auto' }}>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f9f9f9' }}>
                                <TableCell><strong>Producto</strong></TableCell>
                                <TableCell align="center"><strong>Stock</strong></TableCell>
                                <TableCell align="right"><strong>Fecha de Ingreso</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {Array.isArray(stagnantProducts) && stagnantProducts.map((p, i) => (
                                <TableRow key={i} hover>
                                    <TableCell>{p.nombre}</TableCell>
                                    <TableCell align="center">{p.cantidad}</TableCell>
                                    <TableCell align="right">{p.fecha_creacion ? new Date(p.fecha_creacion).toLocaleDateString() : '-'}</TableCell>
                                </TableRow>
                            ))}
                            {Array.isArray(stagnantProducts) && stagnantProducts.length === 0 && (
                                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 4 }}>No hay productos antiguos detectados.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Paper>
    );

    const renderMantenimientoView = () => (
        <Paper sx={{ p: 4, borderRadius: 3, elevation: 3, maxWidth: 600, margin: '0 auto', bgcolor: '#fff8e1', border: '1px solid #ffe082' }}>
            {renderBackButton('🧹 Mantenimiento de Base de Datos')}
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ textAlign: 'center', py: 4 }}>
                <WarningAmber sx={{ fontSize: 80, color: '#f57c00', mb: 2 }} />
                <Typography variant="h6" fontWeight="bold" sx={{ color: '#e65100', mb: 2 }}>
                    Limpieza de Historial Antiguo
                </Typography>
                <Typography variant="body1" sx={{ color: '#666', mb: 4 }}>
                    Esta opción elimina el historial de ventas con más de 1 mes de antigüedad. 
                    Esto te ayuda a liberar espacio en tu base de datos y acelerar significativamente 
                    los tiempos de carga del sistema.
                </Typography>
                <Button variant="contained" color="warning" size="large" fullWidth onClick={handleCleanup} sx={{ py: 2, fontWeight: 'bold' }}>
                    Ejecutar Limpieza Ahora
                </Button>
            </Box>
        </Paper>
    );

    const renderCategoriasView = () => (
        <Box sx={{ maxWidth: 1000, margin: '0 auto' }}>
            {renderBackButton('🏷️ Gestión de Categorías')}
            <CategoriesManager token={token} setMsg={setMsg} />
        </Box>
    );

    return (
        <Box sx={{ flexGrow: 1, height: '100%', overflowY: 'auto', p: { xs: 2, md: 4 } }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ color: '#2c3e50', mb: 4 }}>
                {activeView === 'launcher' ? '🛠️ Herramientas de Administrador' : ''}
            </Typography>
            
            {msg && <Alert severity={msg.type} sx={{ mb: 3 }}>{msg.text}</Alert>}

            {activeView === 'launcher' && renderLauncher()}
            {activeView === 'recibo' && renderReciboView()}
            {activeView === 'estancados' && renderEstancadosView()}
            {activeView === 'mantenimiento' && renderMantenimientoView()}
            {activeView === 'categorias' && renderCategoriasView()}
        </Box>
    );
};

export default AdminTools;