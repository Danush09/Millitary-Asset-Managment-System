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
    LocalShipping as LocalShippingIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Update as UpdateIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../utils/axios';

const TransferList = () => {
    const [transfers, setTransfers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        fetchTransfers();
    }, []);

    const fetchTransfers = async () => {
        try {
            setError(null);
            const response = await axiosInstance.get('/transfers');

            // Format the transfers data
            const formattedTransfers = response.data.map(transfer => ({
                ...transfer,
                asset: transfer.asset || { name: 'N/A', serialNumber: 'N/A', type: 'N/A' },
                fromBase: transfer.fromBase || { name: 'N/A' },
                toBase: transfer.toBase || { name: 'N/A' },
                initiatedBy: transfer.initiatedBy || { fullName: 'N/A' },
                approvedBy: transfer.approvedBy || { fullName: 'N/A' },
                quantity: transfer.quantity || 0,
                status: transfer.status || 'pending',
                transferDate: transfer.transferDate ? new Date(transfer.transferDate).toLocaleDateString() : 'N/A',
                transferNumber: transfer.transferNumber || 'N/A',
                notes: transfer.notes || ''
            }));

            setTransfers(formattedTransfers);
        } catch (error) {
            console.error('Error fetching transfers:', error);
            setError(error.response?.data?.message || 'Failed to fetch transfers. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this transfer?')) {
            try {
                await axiosInstance.delete(`/transfers/${id}`);
                fetchTransfers();
            } catch (error) {
                console.error('Error deleting transfer:', error);
            }
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            setStatusUpdateLoading(id);
            setError(null);

            console.log('Starting status update:', { id, newStatus });

            const response = await axiosInstance.patch(
                `/transfers/${id}/status`,
                { status: newStatus }
            );

            console.log('Server response:', response.data);

            // Update the transfers list with the new data
            setTransfers(prevTransfers =>
                prevTransfers.map(transfer =>
                    transfer._id === id ? response.data : transfer
                )
            );

            setError(null);
        } catch (error) {
            console.error('Error updating transfer status:', error);
            setError(error.response?.data?.message || 'Failed to update transfer status');
        } finally {
            setStatusUpdateLoading(null);
        }
    };

    const getStatusColor = (status) => {
        console.log('Getting color for status:', status);
        switch (status) {
            case 'pending':
                return 'warning';
            case 'in_transit':
                return 'info';
            case 'completed':
                return 'success';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getStatusActions = (transfer) => {
        const actions = [];
        const isSourceBase = user?.base?._id === transfer.fromBase._id;
        const isDestinationBase = user?.base?._id === transfer.toBase._id;
        const isAdmin = user?.role === 'admin';

        console.log('Transfer status check:', {
            transferId: transfer._id,
            currentStatus: transfer.status,
            userBase: user?.base?._id,
            fromBase: transfer.fromBase._id,
            toBase: transfer.toBase._id,
            isSourceBase,
            isDestinationBase,
            isAdmin,
            userRole: user?.role
        });

        if (!user) {
            console.error('User information not available');
            return actions;
        }

        if (transfer.status === 'pending' && (isAdmin || isSourceBase)) {
            actions.push(
                <IconButton
                    key="in_transit"
                    color="primary"
                    onClick={() => {
                        if (window.confirm('Are you sure you want to mark this transfer as in transit?')) {
                            handleStatusUpdate(transfer._id, 'in_transit');
                        }
                    }}
                    title="Mark as In Transit"
                    disabled={statusUpdateLoading === transfer._id}
                >
                    {statusUpdateLoading === transfer._id ? (
                        <CircularProgress size={24} />
                    ) : (
                        <LocalShippingIcon />
                    )}
                </IconButton>
            );
        }

        if (transfer.status === 'in_transit' && (isAdmin || isDestinationBase)) {
            actions.push(
                <IconButton
                    key="complete"
                    color="success"
                    onClick={() => {
                        if (window.confirm('Are you sure you want to complete this transfer?')) {
                            handleStatusUpdate(transfer._id, 'completed');
                        }
                    }}
                    title="Complete Transfer"
                    disabled={statusUpdateLoading === transfer._id}
                >
                    {statusUpdateLoading === transfer._id ? (
                        <CircularProgress size={24} />
                    ) : (
                        <CheckCircleIcon />
                    )}
                </IconButton>
            );
        }

        if (['pending', 'in_transit'].includes(transfer.status) && (isAdmin || isSourceBase || isDestinationBase)) {
            actions.push(
                <IconButton
                    key="cancel"
                    color="error"
                    onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this transfer?')) {
                            handleStatusUpdate(transfer._id, 'cancelled');
                        }
                    }}
                    title="Cancel Transfer"
                    disabled={statusUpdateLoading === transfer._id}
                >
                    {statusUpdateLoading === transfer._id ? (
                        <CircularProgress size={24} />
                    ) : (
                        <CancelIcon />
                    )}
                </IconButton>
            );
        }

        return actions;
    };

    const canEditTransfer = (transfer) => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'base_commander' && transfer.fromBase._id === user.base._id) return true;
        if (user?.role === 'logistics_officer' && transfer.fromBase._id === user.base._id) return true;
        return false;
    };

    const canDeleteTransfer = (transfer) => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'base_commander' && transfer.fromBase._id === user.base._id) return true;
        return false;
    };

    const canUpdateStatus = (transfer) => {
        if (user?.role === 'admin') return true;
        if (user?.role === 'base_commander') {
            if (transfer.status === 'pending' && transfer.fromBase._id === user.base._id) return true;
            if (transfer.status === 'in_transit' && transfer.toBase._id === user.base._id) return true;
        }
        return false;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                    <Typography color="error">{error}</Typography>
                    <Button variant="contained" onClick={fetchTransfers}>
                        Retry
                    </Button>
                </Box>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Transfers</Typography>
                {(user?.role === 'admin' || user?.role === 'base_commander' || user?.role === 'logistics_officer') && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => navigate('/transfers/new')}
                    >
                        New Transfer
                    </Button>
                )}
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Transfer #</TableCell>
                            <TableCell>Asset</TableCell>
                            <TableCell>From Base</TableCell>
                            <TableCell>To Base</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Transfer Date</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transfers.map((transfer) => (
                            <TableRow key={transfer._id}>
                                <TableCell>{transfer.transferNumber}</TableCell>
                                <TableCell>{transfer.asset?.name || 'N/A'}</TableCell>
                                <TableCell>{transfer.fromBase?.name || 'N/A'}</TableCell>
                                <TableCell>{transfer.toBase?.name || 'N/A'}</TableCell>
                                <TableCell>{transfer.quantity || 0}</TableCell>
                                <TableCell>{transfer.transferDate}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={transfer.status}
                                        color={getStatusColor(transfer.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" noWrap style={{ maxWidth: 150 }}>
                                        {transfer.notes || '-'}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    {canEditTransfer(transfer) && (
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/transfers/${transfer._id}/edit`)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    )}
                                    {canDeleteTransfer(transfer) && (
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDelete(transfer._id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    )}
                                    {getStatusActions(transfer)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Container>
    );
};

export default TransferList; 