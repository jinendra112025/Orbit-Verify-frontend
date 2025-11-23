import React from 'react';
import { Box, Paper, CssBaseline, Typography, Fade } from '@mui/material';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import Footer from '../../components/common/Footer';

const AdminLoginPage = () => {
    const { isAuthenticated, user } = useSelector((state) => state.auth);

    // If an admin is already logged in, redirect them to the dashboard
    if (isAuthenticated && user?.role === 'admin') {
        return <Navigate to="/admin" />;
    }

    return (
        <Box
            sx={{
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                // This sets the background image for the entire page
                backgroundImage: 'url(https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1632&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                // Adds a dark overlay for better text readability
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                }
            }}
        >
            <CssBaseline />
            <Fade in={true} timeout={1000}>
                <Paper
                    elevation={6}
                    sx={{
                        p: 4,
                        zIndex: 1, // Ensures the form is on top of the overlay
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        width: '100%',
                        maxWidth: '400px',
                        borderRadius: 2,
                    }}
                >
                    <Typography 
                        variant="h5" 
                        noWrap 
                        component="div" 
                        sx={{ color: 'primary.main', fontWeight: 700, mb: 2 }}
                    >
                        Orbit Verify
                    </Typography>
                    <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                        Admin Portal Sign In
                    </Typography>
                    
                    {/* The isAdminLogin prop is crucial here */}
                    <LoginForm isAdminLogin={true} />

                </Paper>
            </Fade>
            <Box sx={{ zIndex: 1, position: 'absolute', bottom: 0, width: '100%' }}>
                <Footer />
            </Box>
        </Box>
    );
};

export default AdminLoginPage;