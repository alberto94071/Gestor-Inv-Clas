// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 🛑 NECESARIO PARA REDIRIGIR
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
    CssBaseline,
    CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';

// IMAGEN 4K DE ALTA CALIDAD (Paisaje Atardecer)
const BACKGROUND_IMAGE_URL = 'https://wallpapers.com/images/hd/4k-tech-ulcajgzzc25jlrgi.jpg';

// 🛑 Recibimos 'handleLogin' en lugar de 'onLoginSuccess' para coincidir con App.jsx
const Login = ({ handleLogin }) => {
    const navigate = useNavigate(); // 🛑 Hook de navegación

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
            // 1. Petición al backend
            const response = await API.post('/auth/login', { email, password });
            const { token, user } = response.data;

            // 🛑 2. GUARDADO CRÍTICO (Token + Usuario con Rol)
            localStorage.setItem('authToken', token);
            localStorage.setItem('user', JSON.stringify(user)); // ¡Esto habilita el botón eliminar!

            // 3. Actualizar estado global
            handleLogin(user);

            // 4. Redirigir al inicio
            navigate('/');

        } catch (err) {
            console.error(err);
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
            backgroundColor: 'rgba(255, 255, 255, 0.05)', 
            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
            '&:hover fieldset': { borderColor: 'white' },
            '&.Mui-focused fieldset': { borderColor: 'white' },
        },
        '& .MuiInputAdornment-root': { color: '#ccc' }
    };

    return (
        <Box
            sx={{
                width: '100vw',  
                height: '100vh', 
                backgroundImage: `url(${BACKGROUND_IMAGE_URL})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'fixed', 
                top: 0,
                left: 0,
                // Overlay oscuro
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
                    zIndex: 0
                }
            }}
        >
            <CssBaseline />
            
            <Container maxWidth="xs" sx={{ position: 'relative', zIndex: 1 }}>
                <Paper
                    elevation={10}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        // Efecto Glassmorphism
                        backgroundColor: 'rgba(0, 0, 0, 0.65)', 
                        backdropFilter: 'blur(10px)', 
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
                        Inicia sesión en el Sistema POS
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
                                backgroundColor: '#E50914',
                                fontSize: '16px',
                                fontWeight: 'bold',
                                '&:hover': {
                                    backgroundColor: '#b20710',
                                }
                            }}
                        >
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'ACCEDER'}
                        </Button>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Login;