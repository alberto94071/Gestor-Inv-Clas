// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from '@mui/material/styles'; // 🛑 IMPORTACIÓN NUEVA
import customTheme from './theme.js'; // 🛑 IMPORTACIÓN NUEVA

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 🛑 ENVOLVEMOS LA APLICACIÓN EN EL THEME PROVIDER 🛑 */}
    <ThemeProvider theme={customTheme}>
        <App />
    </ThemeProvider>
  </React.StrictMode>,
)