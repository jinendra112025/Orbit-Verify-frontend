import React from 'react';
import { Box, Typography, Paper } from '@mui/material';

const Footer = () => {
    return (
        <Paper 
            component="footer" 
            square 
            elevation={0}
            sx={{ 
                p: 2, 
                mt: 'auto', // This is the magic property
                backgroundColor: 'background.default',
                borderTop: '1px solid #dfe4e8'
            }}
        >
            <Typography variant="body2" color="text.secondary" align="center">
                {'© Copyright '}
                Orbit Verify {new Date().getFullYear()}
                {'.'}
            </Typography>
        </Paper>
    );
};

export default Footer;