import React, { useState } from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from '../common/Footer';

const Layout = ({ children }) => {
    // 1. Add state for the mobile drawer
    const [mobileOpen, setMobileOpen] = useState(false);

    // 2. Create a handler to toggle the state
    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            {/* 3. Pass the handler to the Header */}
            <Header onMobileMenuClick={handleDrawerToggle} />
            {/* 4. Pass the state and handler to the Sidebar */}
            <Sidebar mobileOpen={mobileOpen} onMobileClose={handleDrawerToggle} />

            <Box
                component="main"
                sx={{ 
                    flexGrow: 1, 
                    bgcolor: 'background.default', 
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    width: { sm: `calc(100% - 240px)` },
                    overflow: 'auto',
                }}
            >
                <Toolbar />
                <Box component="div" sx={{ flexGrow: 1 }}>
                    {children}
                </Box>
                <Footer />
            </Box>
        </Box>
    );
};

export default Layout;