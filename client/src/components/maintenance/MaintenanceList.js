import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Box,
    CircularProgress,
    Chip,
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const MaintenanceList = () => {
    const [maintenanceRecords, setMaintenanceRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchMaintenanceRecords();
    }, []);

    const fetchMaintenanceRecords = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/maintenance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMaintenanceRecords(response.data);
        } catch (error) {
            console.error('Error fetching maintenance records:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this maintenance record?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/maintenance/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchMaintenanceRecords();
            } catch (error) {
                console.error('Error deleting maintenance record:', error);
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'scheduled':
                return 'info';
            case 'in_progress':
                return 'warning';
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Maintenance Records</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/maintenance/new')}
                >
                    New Maintenance Record
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Asset</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {maintenanceRecords.map((record) => (
                            <TableRow key={record._id}>
                                <TableCell>{record.asset.name}</TableCell>
                                <TableCell>{record.type}</TableCell>
                                <TableCell>{record.description}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={record.status}
                                        color={getStatusColor(record.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {new Date(record.startDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    {record.endDate
                                        ? new Date(record.endDate).toLocaleDateString()
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        color="primary"
                                        onClick={() => navigate(`/maintenance/${record._id}/edit`)}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        color="error"
                                        onClick={() => handleDelete(record._id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default MaintenanceList; 