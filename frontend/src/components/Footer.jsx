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
                <Link
                    href="https://www.chronos-dev.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        color: 'text.secondary',
                        transition: 'color 0.2s',
                        '&:hover': { color: 'primary.main' },
                    }}
                >
                    Chronos-Dev
                </Link>
                {' |'}
            </Typography>
        </Box>
    );
};

export default Footer;