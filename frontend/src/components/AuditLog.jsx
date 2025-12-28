// src/components/AuditLog.jsx
import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress, Alert 
} from '@mui/material';
import API from '../api/axiosInstance'; 
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

const AuditLog = () => {
    const [log, setLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLog = async () => {
            try {
                const token = localStorage.getItem('authToken');
                // La ruta base ya incluye '/api', así que solo agregamos el resto
                const response = await API.get('/reports/audit-log', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLog(response.data);
            } catch (err) {
                console.error("Error al cargar log:", err.response?.data);
                setError("No tienes permiso o hubo un error al cargar el log.");
            } finally {
                setLoading(false);
            }
        };
        fetchLog();
    }, []);

    // Función auxiliar para formatear la fecha blindada contra errores de zona horaria
    const formatearFecha = (fechaString) => {
        if (!fechaString) return 'Fecha inválida';
        
        // TRUCO: Si la fecha viene sin 'Z' (indicador UTC), se la agregamos a la fuerza.
        // Esto obliga al navegador a entender que la hora viene de Londres 
        // y debe restarle 6 horas para Guatemala.
        const fechaSegura = fechaString.endsWith('Z') ? fechaString : fechaString + 'Z';
        
        return new Date(fechaSegura).toLocaleString('es-GT', {
            timeZone: 'America/Guatemala',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                <MonitorHeartIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Log de Auditoría
            </Typography>

            <Paper elevation={3} sx={{ mt: 3, overflow: 'hidden' }}>
                <TableContainer sx={{ maxHeight: 700 }}>
                    <Table stickyHeader aria-label="audit log table">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
                                <TableCell>ID</TableCell>
                                <TableCell>Fecha (Guatemala)</TableCell>
                                <TableCell>Usuario</TableCell>
                                <TableCell>Rol</TableCell>
                                <TableCell>Acción Detallada</TableCell>
                                <TableCell>Entidad</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {log.length === 0 ? (
                                <TableRow><TableCell colSpan={6} align="center">No hay registros de actividad.</TableCell></TableRow>
                            ) : (
                                log.map((item) => (
                                    <TableRow key={item.id} hover>
                                        <TableCell>{item.id}</TableCell>
                                        
                                        {/* Usamos la función corregida aquí */}
                                        <TableCell>{formatearFecha(item.fecha_registro)}</TableCell>

                                        <TableCell>{item.username || 'Sistema'}</TableCell>
                                        
                                        {/* Protección por si el rol viene vacío */}
                                        <TableCell>{item.rol ? item.rol.toUpperCase() : 'N/A'}</TableCell>
                                        
                                        <TableCell sx={{ fontWeight: 'bold' }}>{item.accion}</TableCell>
                                        <TableCell>{item.entidad_afectada}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    );
};

export default AuditLog;
