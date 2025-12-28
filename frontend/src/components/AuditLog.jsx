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
                // Asumimos que tu axiosInstance ya tiene /api base
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

    // 🟢 FUNCIÓN DE FECHA CORREGIDA (VERSIÓN 2.0)
    const formatearFecha = (fecha) => {
        if (!fecha) return '---';
        
        // 1. Convertimos a texto por seguridad
        let fechaStr = String(fecha);

        // 2. Si viene formato SQL con espacio ("2025-01-01 10:00"), lo cambiamos a ISO ("2025-01-01T10:00")
        if (fechaStr.includes(' ')) {
            fechaStr = fechaStr.replace(' ', 'T');
        }

        // 3. Si no trae la Z de Zulu Time (UTC), se la pegamos.
        // Esto obliga a JS a tratar la hora como UTC y restarle las 6 horas de Guate.
        if (!fechaStr.endsWith('Z')) {
            fechaStr += 'Z';
        }

        try {
            return new Date(fechaStr).toLocaleString('es-GT', {
                timeZone: 'America/Guatemala',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (error) {
            return fecha; // Fallback por si acaso
        }
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
                                        
                                        {/* Usamos la nueva función blindada */}
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
