import React from 'react';
import { Box, CssBaseline, Container } from '@mui/material';
import ClientHeader from './ClientHeader';
import Footer from '../common/Footer';

const ClientLayout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <CssBaseline />
            <ClientHeader />
            <Container component="main" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                {children}
            </Container>
            <Footer />
        </Box>
    );
};

export default ClientLayout;