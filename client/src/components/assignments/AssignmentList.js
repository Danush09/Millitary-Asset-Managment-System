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

const AssignmentList = () => {
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchAssignments();
    }, []);

    const fetchAssignments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/assignments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssignments(response.data);
        } catch (error) {
            console.error('Error fetching assignments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/assignments/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('Assignment deleted successfully');
                fetchAssignments();
            } catch (error) {
                console.error('Error deleting assignment:', error);
                alert(error.response?.data?.message || 'Failed to delete assignment');
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'warning';
            case 'active':
                return 'success';
            case 'completed':
                return 'info';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const canEditAssignment = (assignment) => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'base_commander' && assignment.base._id === user.base._id) return true;
        if (user?.role === 'logistics_officer' && assignment.base._id === user.base._id) return true;
        return false;
    };

    const canDeleteAssignment = (assignment) => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'base_commander' && assignment.base._id === user.base._id) return true;
        return false;
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
                <Typography variant="h4">Assignments</Typography>
                {(user?.role === 'admin' || user?.role === 'base_commander' || user?.role === 'logistics_officer') && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/assignments/new')}
                    >
                        New Assignment
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Asset</TableCell>
                            <TableCell>Assigned To</TableCell>
                            <TableCell>Base</TableCell>
                            <TableCell>Start Date</TableCell>
                            <TableCell>End Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assignments.map((assignment) => (
                            <TableRow key={assignment._id}>
                                <TableCell>{assignment.asset.name}</TableCell>
                                <TableCell>{assignment.assignedTo.fullName}</TableCell>
                                <TableCell>{assignment.base.name}</TableCell>
                                <TableCell>
                                    {new Date(assignment.startDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell>
                                    {assignment.endDate
                                        ? new Date(assignment.endDate).toLocaleDateString()
                                        : 'N/A'}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={assignment.status}
                                        color={getStatusColor(assignment.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {canEditAssignment(assignment) && (
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/assignments/${assignment._id}/edit`)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    )}
                                    {canDeleteAssignment(assignment) && (
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDelete(assignment._id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default AssignmentList; 