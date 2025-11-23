import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, TextField, Grid, CircularProgress, Alert } from '@mui/material';
import api from '../../services/api';

const ClientProfilePage = () => {
    const [profile, setProfile] = useState({ name: '', gstin: '', address: '' });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await api.get('/profile');
                setProfile(response.data);
            } catch (error) { console.error("Failed to fetch profile", error); }
            finally { setLoading(false); }
        };
        fetchProfile();
    }, []);


    const handleChange = (e) => setProfile({ ...profile, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            await api.put('/profile', { gstin: profile.gstin, address: profile.address });
            setMessage('Profile updated successfully!');
        } catch (error) {
            setMessage('Failed to update profile.');
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper sx={{ p: 3 }} component="form" onSubmit={handleSubmit}>
            <Typography variant="h5" gutterBottom>My Profile</Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
                Manage your company's details.
            </Typography>
            <Grid container spacing={3} mt={1}>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Company Name" name="companyName" value={profile.companyName} disabled />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Contact Email" name="email" value={profile.email} disabled />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Company GSTIN"
                        name="gstin"
                        value={profile.gstin}
                        onChange={handleChange}
                        helperText="Your company's Goods and Services Taxpayer Identification Number."
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField fullWidth label="Company Address" name="address" value={profile.address} onChange={handleChange} multiline rows={3} />
                </Grid>
            </Grid>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="contained">Save Changes</Button>
            </Box>
            {message && <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert>}
        </Paper>
    );
};

export default ClientProfilePage;