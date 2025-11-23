import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, CircularProgress } from '@mui/material';
import { Search as SearchIcon, Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const getStatusColor = (status) => {
    if (status.includes('Clear')) return 'success';
    if (status.includes('Discrepancy')) return 'error';
    if (status.includes('Amber')) return 'warning';
    if (status.includes('Insufficiency')) return 'info';
    return 'default'; // For 'Pending' and other statuses
};

const ClientDashboardPage = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClientCases = async () => {
            try {
                // The same endpoint works because the backend filters by the user's token
                const response = await api.get('/cases');
                setCases(response.data.cases);
            } catch (error) {
                console.error("Failed to fetch client cases:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchClientCases();
    }, []);

    console.log("Data being rendered in the dashboard:", cases);

    const filteredCases = cases.filter(caseItem =>
        (caseItem.candidateInfo?.candidateName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">Your Cases</Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/client/create-case')}>
                    Create New Case
                </Button>
            </Box>
            <TextField
                fullWidth
                placeholder="Search by candidate name..."
                sx={{ mb: 3 }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                    startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>
                }}
            />
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Candidate Name</TableCell>
                            <TableCell>Designation</TableCell>
                            <TableCell>Date Submitted</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.map((row) => (
                            <TableRow key={row._id}>
                                <TableCell>{row.candidateInfo?.candidateName || 'N/A'}</TableCell>
                                <TableCell>{row.candidateInfo?.designation || 'N/A'}</TableCell>
                                <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Chip label={row.status} color={getStatusColor(row.status)} size="small" />
                                </TableCell>
                                <TableCell align="right">
                                    <Button variant="contained" size="small" onClick={() => navigate(`/client/case/${row._id}`)}>
                                        View Report
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default ClientDashboardPage;