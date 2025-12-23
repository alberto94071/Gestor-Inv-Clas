import React from 'react';
import { Box, Typography, Link } from '@mui/material';

const Footer = () => {
    return (
        <Box 
            component="footer" 
            sx={{ 
                py: 2, 
                px: 2, 
                mt: 'auto', 
                backgroundColor: (theme) => theme.palette.grey[100],
                textAlign: 'center',
                borderTop: '1px solid #e0e0e0'
            }}
        >
            <Typography variant="body2" color="text.secondary">
                {'© '}
                {new Date().getFullYear()} 
                {' | Desarrollado por '}
                <Link color="inherit" href="#" sx={{ fontWeight: 'bold', textDecoration: 'none' }}>
                    Rony Alberto Méndez Fuentes
                </Link>
                {' | Ingeniería en Sistemas UMG'}
            </Typography>
        </Box>
    );
};

export default Footer;