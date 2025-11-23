import React from 'react';
import { AppBar, Toolbar, Typography, IconButton, Button } from '@mui/material';
// 1. Import the MenuIcon
import { Notifications as NotificationsIcon, AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../features/auth/authSlice';

// 2. Accept a prop to handle the menu click
const Header = ({ onMobileMenuClick }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/portal-admin/login');
    };

    return (
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
            <Toolbar>
                {/* --- 3. HAMBURGER ICON BUTTON (Mobile Only) --- */}
                <IconButton
                    color="inherit"
                    aria-label="open drawer"
                    edge="start"
                    onClick={onMobileMenuClick}
                    sx={{ mr: 2, display: { sm: 'none' } }} // Only displays on extra-small screens
                >
                    <MenuIcon />
                </IconButton>
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                    Admin Dashboard
                </Typography>
                <IconButton color="inherit"><NotificationsIcon /></IconButton>
                <IconButton color="inherit"><AccountCircle /></IconButton>
                <Button color="inherit" onClick={handleLogout}>Logout</Button>
            </Toolbar>
        </AppBar>
    );
};

export default Header;