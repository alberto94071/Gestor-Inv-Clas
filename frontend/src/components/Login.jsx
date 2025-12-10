// src/components/Login.jsx
import React, { useState } from 'react';
import API from '../api/axiosInstance.js';
import {
    Box,
    Container,
    Typography,
    TextField,
    Button,
    Alert,
    Paper,
    InputAdornment,
    FormControlLabel,
    Checkbox,
    Link,
    CssBaseline // Importante para resetear estilos
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';

// IMAGEN 4K DE ALTA CALIDAD (Paisaje Atardecer)
const BACKGROUND_IMAGE_URL = 'https://wallpapers.com/images/hd/4k-tech-ulcajgzzc25jlrgi.jpg';

const Login = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            setError('Por favor, ingresa email y contraseña.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await API.post('/auth/login', { email, password });
            const { token, user } = response.data;
            localStorage.setItem('authToken', token);
            onLoginSuccess(user);
        } catch (err) {
            let errorMessage = 'Error de conexión.';
            if (err.response) {
                errorMessage = err.response.data?.error || 'Credenciales incorrectas.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const inputStyles = {
        mb: 3,
        '& .MuiInputLabel-root': { color: '#ccc' },
        '& .MuiInputLabel-root.Mui-focused': { color: 'white' },
        '& .MuiOutlinedInput-root': {
            color: 'white',
            backgroundColor: 'rgba(255, 255, 255, 0.05)', // Ligero fondo en inputs para legibilidad
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
            '&:hover fieldset': { borderColor: 'white' },
            '&.Mui-focused fieldset': { borderColor: 'white' },
        },
        '& .MuiInputAdornment-root': { color: '#ccc' }
    };

    return (
        <Box
            sx={{
                width: '100vw',  // Ancho de la ventana
                height: '100vh', // Alto de la ventana
                backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'fixed', // Fija la posición para evitar bordes blancos al hacer scroll
                top: 0,
                left: 0,
                // Overlay oscuro para mejorar contraste
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.4)', 
                    zIndex: 0
                }
            }}
        >
            <CssBaseline /> {/* Resetea márgenes del navegador */}
            
            <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                <Paper
                    elevation={10}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        // Efecto Glassmorphism más nítido
                        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Un poco más oscuro para legibilidad
                        backdropFilter: 'blur(10px)', // Blur ajustado
                        borderRadius: 4,
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
                    }}
                >
                    <Typography component="h1" variant="h5" sx={{ mb: 1, fontWeight: 'bold', letterSpacing: 1 }}>
                        BIENVENIDO
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: '#ccc' }}>
                        Inicia sesión en tu cuenta
                    </Typography>

                    {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Correo Electrónico"
                            name="email"
                            autoComplete="email"
                            autoFocus
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            sx={inputStyles}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Contraseña"
                            type="password"
                            id="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            sx={inputStyles}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <FormControlLabel
                                control={<Checkbox value="remember" sx={{ color: '#ccc', '&.Mui-checked': { color: 'white' } }} />}
                                label={<Typography variant="body2" sx={{ color: '#ccc' }}>Recordarme</Typography>}
                            />
                            <Link href="#" variant="body2" sx={{ color: '#ccc', textDecoration: 'none', '&:hover': { color: 'white' } }}>
                                ¿Ayuda?
                            </Link>
                        </Box>

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={loading}
                            sx={{
                                mt: 1,
                                mb: 2,
                                py: 1.5,
                                backgroundColor: '#E50914', // Rojo estilo Netflix/Moderno
                                fontSize: '16px',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: '#b20710',
                                }
                            }}
                        >
                            {loading ? 'CARGANDO...' : 'ACCEDER'}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Login;