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

    // 🟢 FUNCIÓN MATEMÁTICA (FUERZA BRUTA)
    // Si la hora sale adelantada 6 horas, aquí se las restamos a la fuerza.
    const formatearFecha = (fecha) => {
        if (!fecha) return '---';
        
        // 1. Crear el objeto fecha con lo que venga
        const fechaObj = new Date(fecha);
        
        // 2. RESTAR 6 HORAS MANUALMENTE
        // Si el servidor dice "12:00" (UTC), le quitamos 6 para que diga "06:00" (Guate)
        // Nota: setHours es inteligente, si restas y cambia de día, él ajusta la fecha solo.
        fechaObj.setHours(fechaObj.getHours() - 6);

        // 3. Formatear bonito para Guatemala
        return fechaObj.toLocaleString('es-GT', {
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
                                <TableCell>Fecha</TableCell>
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
                                        
                                        {/* Usamos la función de resta manual */}
                                        <TableCell sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                                            {formatearFecha(item.fecha_registro)}
                                        </TableCell>

                                        <TableCell>{item.username || 'Sistema'}</TableCell>
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
