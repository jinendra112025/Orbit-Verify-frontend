import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, TextField, Grid, FormControl, InputLabel, Select, MenuItem, Alert, CircularProgress, InputAdornment, IconButton } from '@mui/material';
import { VpnKey as VpnKeyIcon } from '@mui/icons-material';
import api from '../../services/api';
import { toast } from 'react-toastify';

const AdminCreateUserPage = () => {
    const initialState = { 
        name: '', 
        email: '', 
        password: '', 
        role: 'organization', 
        clientOrganizationName: '' 
    };
    const [formData, setFormData] = useState(initialState);
    const [clients, setClients] = useState([]);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await api.get('/clients'); 
                
                setClients(response.data);

            } catch (error) {
                console.error("Failed to fetch clients:", error);
            }
        };

        fetchClients();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const generatePassword = () => {
        const randomPassword = Math.random().toString(36).slice(-10); // Simple 10-character random string
        setFormData({ ...formData, password: randomPassword });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');
        try {
            const response = await api.post('/auth/create-user', formData);
            toast.success(response.data.msg);
            setFormData(initialState);
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Failed to create user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper sx={{ p: 3 }} component="form" onSubmit={handleSubmit}>
            <Typography variant="h5" gutterBottom>Create New Client User</Typography>
            <Grid container spacing={3} mt={1}>
                <Grid item xs={12}>
                    <TextField fullWidth required label="Full Name" name="name" value={formData.name} onChange={handleChange} />
                </Grid>
                <Grid item xs={12}>
                    <TextField fullWidth required label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
                </Grid>
                <Grid item xs={12}>
                    <TextField
                        fullWidth
                        required
                        label="Temporary Password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="generate password"
                                        onClick={generatePassword}
                                        edge="end"
                                    >
                                        <VpnKeyIcon />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                        <InputLabel>Role</InputLabel>
                        <Select name="role" value={formData.role} label="Role" onChange={handleChange}>
                            <MenuItem value="organization">Organization</MenuItem>
                            <MenuItem value="individual">Individual</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth required label="Client Company Name" name="clientOrganizationName" value={formData.clientOrganizationName} onChange={handleChange}
                        helperText="A new company will be created if it doesn't exist."
                    />
                </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained" disabled={loading}>
                    {loading ? <CircularProgress size={24} /> : 'Create User'}
                </Button>
            </Box>
            {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Paper>
    );
};

export default AdminCreateUserPage;