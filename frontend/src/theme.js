// src/theme.js
import { createTheme } from '@mui/material/styles';

// 🛑 PERSONALIZA TUS COLORES AQUÍ 🛑

// Colores basados en un estilo moderno y elegante (ej. para una tienda de ropa)
const customTheme = createTheme({
  palette: {
    // Color principal (Usado en botones primarios, enlaces, etc.)
    primary: {
      main: '#2c3e50', // Azul Oscuro (Menú Lateral)
    },
    // Color secundario (Usado para resaltar éxito o botones de acción diferente)
    secondary: {
      main: '#e74c3c', // Rojo (Para "Peligro" o "Resaltar")
    },
    // Colores de estado (Éxito, Error, Advertencia)
    success: {
      main: '#2ecc71', // Verde de éxito (Botón COBRAR)
    },
    error: {
      main: '#c0392b', // Rojo oscuro para errores
    },
    // Fondo de página
    background: {
      default: '#f5f5f5', // Fondo principal gris claro
    },
  },
  typography: {
    fontFamily: [
      'Roboto', // Fuente principal
      'sans-serif',
    ].join(','),
    h4: {
      fontWeight: 700, // Hace que los títulos sean más impactantes
    },
  },
  components: {
    // Aplicar estilos a componentes específicos
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8, // Bordes más redondeados
          textTransform: 'none', // Quita mayúsculas automáticas
        },
      },
    },
    MuiPaper: {
        styleOverrides: {
            root: {
                borderRadius: 12, // Bordes redondeados para tarjetas
            }
        }
    }
  }
});

export default customTheme;