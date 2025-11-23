import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Download as DownloadIcon } from '@mui/icons-material';
import api from '../../services/api';


const calculateTAT = (start, end) => {
    if (!start || !end) return 'N/A';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const differenceInTime = endDate.getTime() - startDate.getTime();
    const differenceInDays = differenceInTime / (1000 * 3600 * 24);
    return differenceInDays.toFixed(2);
};


// Helper function to convert detailed case data to CSV
const convertCasesToCSV = (data) => {
    const headers = ['Client Name', 'Candidate Name', 'Case Create Date', 'Case Start Date', 'Report Closed Date', 'Status', 'TAT (Days)'];
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = [
            row.clientOrganization?.name || 'N/A',
            row.candidateInfo?.candidateName,
            new Date(row.createdAt).toLocaleDateString(),
            row.caseStartDate ? new Date(row.caseStartDate).toLocaleDateString() : 'Not Started',
            row.reportClosedDate ? new Date(row.reportClosedDate).toLocaleDateString() : 'In Progress',
            row.status,
            calculateTAT(row.caseStartDate, row.reportClosedDate)
        ].map(val => `"${String(val || '').replace(/"/g, '""')}"`);
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

const MisReportsPage = () => {
    const [cases, setCases] = useState([]);
    const [clients, setClients] = useState([]);
    const [clientFilter, setClientFilter] = useState('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [casesResponse, clientsResponse] = await Promise.all([
                    api.get('/reports/admin-detailed'), // <-- Call the new endpoint
                    api.get('/clients')
                ]);
                setCases(casesResponse.data);
                setClients(clientsResponse.data);
            } catch (error) {
                console.error("Failed to fetch MIS data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    
    // Filter cases based on the dropdown selection
    const filteredCases = cases.filter(c => {
        return clientFilter === 'all' ? true : c.clientOrganization?._id === clientFilter;
    });

    const handleDownloadCSV = () => {
        if (!filteredCases || filteredCases.length === 0) return;

        const csvData = convertCasesToCSV(filteredCases);
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        const date = new Date().toISOString().split('T')[0];
        link.setAttribute('href', url);
        link.setAttribute('download', `Full_MIS_Report_${date}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">MIS Detailed Report</Typography>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownloadCSV}>
                    Download as CSV
                </Button>
            </Box>
            
            {/* Filter by Organization Dropdown */}
            <FormControl sx={{ minWidth: 240, mb: 2 }} size="small">
                <InputLabel>Filter by Organization</InputLabel>
                <Select
                    value={clientFilter}
                    label="Filter by Organization"
                    onChange={(e) => setClientFilter(e.target.value)}
                >
                    <MenuItem value="all"><em>Show All Organizations</em></MenuItem>
                    {clients.map((client) => (
                        <MenuItem key={client._id} value={client._id}>
                            {client.name}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Client Name</TableCell>
                            <TableCell>Candidate Name</TableCell>
                            <TableCell>Case Create Date</TableCell>
                            <TableCell>Case Start Date</TableCell>
                            <TableCell>Report Closed Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>TAT (Days)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredCases.map((row) => (
                            <TableRow key={row._id}>
                                <TableCell>{row.clientOrganization?.name || 'N/A'}</TableCell>
                                <TableCell>{row.candidateInfo?.candidateName}</TableCell>
                                <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>{row.caseStartDate ? new Date(row.caseStartDate).toLocaleDateString() : 'Not Started'}</TableCell>
                                <TableCell>{row.reportClosedDate ? new Date(row.reportClosedDate).toLocaleDateString() : 'In Progress'}</TableCell>
                                <TableCell>{row.status}</TableCell>
                                <TableCell>{calculateTAT(row.caseStartDate, row.reportClosedDate)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default MisReportsPage;