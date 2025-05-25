import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
    CircularProgress,
    Chip,
    Alert
} from '@mui/material';
import {
    Add as AddIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    LocalShipping as LocalShippingIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../utils/axios';

const Transfers = () => {
    const theme = useTheme();
    const { user } = useAuth();
    const [transfers, setTransfers] = useState([]);
    const [assets, setAssets] = useState([]);
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [formData, setFormData] = useState({
        asset: '',
        fromBase: '',
        toBase: '',
        quantity: '',
        transferDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        notes: ''
    });

    const [statusUpdateLoading, setStatusUpdateLoading] = useState(null);

    const equipmentTypes = [
        'Vehicles',
        'Weapons',
        'Ammunition',
        'Communication Equipment',
        'Medical Supplies'
    ];

    const transferStatuses = [
        'Pending',
        'In Transit',
        'Completed',
        'Cancelled'
    ];

    useEffect(() => {
        if (!user) {
            setError('Please log in to access this page');
            setLoading(false);
            return;
        }

        fetchTransfers();
        fetchAssets();
        fetchBases();
    }, [user]);

    const fetchTransfers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await axiosInstance.get('/transfers');
            setTransfers(response.data);
        } catch (err) {
            console.error('Error fetching transfers:', err);
            setError(err.response?.data?.message || 'Failed to fetch transfers. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAssets = useCallback(async () => {
        try {
            setError(null);
            const response = await axiosInstance.get('/assets');
            setAssets(response.data);
        } catch (err) {
            console.error('Failed to fetch assets:', err);
            setError(err.response?.data?.message || 'Failed to fetch assets. Please try again.');
        }
    }, []);

    const fetchBases = useCallback(async () => {
        try {
            setError(null);
            const response = await axiosInstance.get('/bases');
            setBases(response.data);
        } catch (err) {
            console.error('Failed to fetch bases:', err);
            setError(err.response?.data?.message || 'Failed to fetch bases. Please try again.');
        }
    }, []);

    const handleOpenDialog = (transfer = null) => {
        if (transfer) {
            setFormData({
                asset: transfer.asset._id,
                fromBase: transfer.fromBase._id,
                toBase: transfer.toBase._id,
                quantity: transfer.quantity,
                transferDate: transfer.transferDate.split('T')[0],
                status: transfer.status,
                notes: transfer.notes || ''
            });
            setSelectedTransfer(transfer);
        } else {
            const defaultBaseId = user?.role === 'base_commander' && user?.base ?
                (typeof user.base === 'object' ? user.base._id : user.base) : '';

            setFormData({
                asset: '',
                fromBase: defaultBaseId,
                toBase: '',
                quantity: '',
                transferDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                notes: ''
            });
            setSelectedTransfer(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedTransfer(null);
        setFormData({
            asset: '',
            fromBase: '',
            toBase: '',
            quantity: '',
            transferDate: new Date().toISOString().split('T')[0],
            status: 'pending',
            notes: ''
        });
    };

    const handleCreateTransfer = async (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        try {
            console.log('Starting transfer creation with form data:', formData);

            if (!user || !user._id) {
                console.error('Invalid user session:', user);
                setError('User session is invalid. Please log in again.');
                return;
            }

            // Validate base selection
            if (formData.fromBase === formData.toBase) {
                console.error('Invalid base selection - same source and destination');
                setError('Source and destination bases cannot be the same');
                return;
            }

            // Validate quantity
            const selectedAsset = assets.find(a => a._id === formData.asset);
            if (selectedAsset && parseInt(formData.quantity) > selectedAsset.quantity) {
                console.error('Invalid quantity:', {
                    selected: formData.quantity,
                    available: selectedAsset.quantity
                });
                setError('Transfer quantity cannot exceed available quantity');
                return;
            }

            // Format the date properly
            const transferDate = formData.transferDate ? new Date(formData.transferDate).toISOString() : new Date().toISOString();

            const submitData = {
                assetId: formData.asset,
                fromBase: formData.fromBase,
                toBase: formData.toBase,
                quantity: parseInt(formData.quantity),
                transferDate,
                reason: formData.notes || ''
            };

            console.log('Submitting transfer data:', submitData);

            let response;
            if (selectedTransfer) {
                console.log('Updating existing transfer:', selectedTransfer._id);
                response = await axiosInstance.put(`/transfers/${selectedTransfer._id}`, submitData);
            } else {
                console.log('Creating new transfer');
                response = await axiosInstance.post('/transfers', submitData);
            }

            console.log('Transfer API response:', response.data);

            await fetchTransfers();
            handleCloseDialog();
            setError(null);
        } catch (err) {
            console.error('Transfer submission error:', err);
            console.error('Error details:', {
                message: err.message,
                response: err.response?.data,
                status: err.response?.status,
                headers: err.response?.headers
            });
            setError(err.response?.data?.message || 'Failed to save transfer');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            setStatusUpdateLoading(id);
            setError(null);

            const response = await axiosInstance.patch(`/transfers/${id}/status`, { status });

            setTransfers(prevTransfers =>
                prevTransfers.map(transfer =>
                    transfer._id === id ? response.data : transfer
                )
            );

            setError(null);
        } catch (err) {
            console.error('Error updating transfer status:', err);
            setError(err.response?.data?.message || 'Failed to update transfer status');
        } finally {
            setStatusUpdateLoading(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this transfer?')) {
            return;
        }

        try {
            await axiosInstance.delete(`/transfers/${id}`);
            await fetchTransfers();
        } catch (err) {
            console.error('Error deleting transfer:', err);
            setError(err.response?.data?.message || 'Failed to delete transfer');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const canUpdateStatus = (transfer) => {
        if (!user) return false;

        // Admin and logistics officers can update any transfer
        if (user.role === 'admin' || user.role === 'logistics_officer') return true;

        // Base commanders can only update transfers involving their base
        if (user.role === 'base_commander') {
            const userBaseId = typeof user.base === 'object' ? user.base._id : user.base;
            return transfer.fromBase._id === userBaseId || transfer.toBase._id === userBaseId;
        }

        return false;
    };

    const canDelete = (transfer) => {
        if (!user) return false;

        // Only allow deletion of pending transfers
        if (transfer.status !== 'pending') return false;

        // Admin and logistics officers can delete any pending transfer
        if (user.role === 'admin' || user.role === 'logistics_officer') return true;

        // Base commanders can only delete pending transfers from their base
        if (user.role === 'base_commander') {
            const userBaseId = typeof user.base === 'object' ? user.base._id : user.base;
            return transfer.fromBase._id === userBaseId;
        }

        return false;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'success';
            case 'in_transit':
                return 'info';
            case 'pending':
                return 'warning';
            case 'cancelled':
                return 'error';
            default:
                return 'default';
        }
    };

    const getAvailableAssets = () => {
        if (!assets) return [];

        // Admin and logistics officers can see all assets
        if (user?.role === 'admin' || user?.role === 'logistics_officer') {
            return assets.filter(asset => asset.quantity > 0);
        }

        // Base commanders can only see assets from their base
        const userBaseId = typeof user?.base === 'object' ? user.base._id : user?.base;
        return assets.filter(asset => {
            const assetBaseId = typeof asset.base === 'object' ? asset.base._id : asset.base;
            return assetBaseId === userBaseId && asset.quantity > 0;
        });
    };

    const getAvailableBases = () => {
        if (!bases) return [];

        // Admin and logistics officers can see all bases
        if (user?.role === 'admin' || user?.role === 'logistics_officer') {
            return bases;
        }

        // Base commanders can only see their base
        const userBaseId = typeof user?.base === 'object' ? user.base._id : user?.base;
        return bases.filter(base => {
            const baseId = typeof base === 'object' ? base._id : base;
            return baseId === userBaseId;
        });
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error && error.includes('No base assigned')) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Typography variant="body1" color="text.secondary">
                    You need to have a base assigned to your account to access the transfers system.
                    Please contact your administrator to assign a base to your account.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography variant="h5" component="h2">
                                    Transfers Management
                                </Typography>
                                {(user?.role === 'admin' || user?.role === 'logistics_officer' || user?.role === 'base_commander') && (
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenDialog()}
                                    >
                                        New Transfer
                                    </Button>
                                )}
                            </Box>

                            {error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {error}
                                </Alert>
                            )}

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
                                            <TableCell>Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {transfers.map((transfer) => (
                                            <TableRow key={transfer._id}>
                                                <TableCell>{transfer.transferNumber}</TableCell>
                                                <TableCell>
                                                    {transfer.asset?.name} ({transfer.asset?.serialNumber})
                                                </TableCell>
                                                <TableCell>{transfer.fromBase?.name}</TableCell>
                                                <TableCell>{transfer.toBase?.name}</TableCell>
                                                <TableCell>{transfer.quantity}</TableCell>
                                                <TableCell>
                                                    {new Date(transfer.transferDate).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={transfer.status}
                                                        color={getStatusColor(transfer.status)}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {transfer.status === 'pending' && canUpdateStatus(transfer) && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleStatusUpdate(transfer._id, 'in_transit')}
                                                            title="Mark as In Transit"
                                                            disabled={statusUpdateLoading === transfer._id}
                                                        >
                                                            {statusUpdateLoading === transfer._id ? (
                                                                <CircularProgress size={20} />
                                                            ) : (
                                                                <LocalShippingIcon />
                                                            )}
                                                        </IconButton>
                                                    )}
                                                    {transfer.status === 'in_transit' && canUpdateStatus(transfer) && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleStatusUpdate(transfer._id, 'completed')}
                                                            title="Complete Transfer"
                                                            disabled={statusUpdateLoading === transfer._id}
                                                        >
                                                            {statusUpdateLoading === transfer._id ? (
                                                                <CircularProgress size={20} />
                                                            ) : (
                                                                <CheckCircleIcon />
                                                            )}
                                                        </IconButton>
                                                    )}
                                                    {(transfer.status === 'pending' || transfer.status === 'in_transit') && canUpdateStatus(transfer) && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleStatusUpdate(transfer._id, 'cancelled')}
                                                            title="Cancel Transfer"
                                                            disabled={statusUpdateLoading === transfer._id}
                                                        >
                                                            {statusUpdateLoading === transfer._id ? (
                                                                <CircularProgress size={20} />
                                                            ) : (
                                                                <CancelIcon />
                                                            )}
                                                        </IconButton>
                                                    )}
                                                    {canDelete(transfer) && (
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleDelete(transfer._id)}
                                                            title="Delete Transfer"
                                                        >
                                                            <CancelIcon />
                                                        </IconButton>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {selectedTransfer ? 'Edit Transfer' : 'New Transfer'}
                </DialogTitle>
                <form onSubmit={handleCreateTransfer}>
                    <DialogContent>
                        <Box sx={{ mt: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Select
                                        fullWidth
                                        value={formData.asset}
                                        onChange={handleChange}
                                        name="asset"
                                        displayEmpty
                                        required
                                    >
                                        <MenuItem value="">Select Asset</MenuItem>
                                        {getAvailableAssets().map((asset) => (
                                            <MenuItem key={asset._id} value={asset._id}>
                                                {asset.name} (Available: {asset.quantity})
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Select
                                        fullWidth
                                        value={formData.fromBase}
                                        onChange={handleChange}
                                        name="fromBase"
                                        displayEmpty
                                        required
                                        disabled={user?.role === 'base_commander'}
                                    >
                                        <MenuItem value="">Select From Base</MenuItem>
                                        {getAvailableBases().map((base) => (
                                            <MenuItem key={base._id} value={base._id}>
                                                {base.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Select
                                        fullWidth
                                        value={formData.toBase}
                                        onChange={handleChange}
                                        name="toBase"
                                        displayEmpty
                                        required
                                    >
                                        <MenuItem value="">Select To Base</MenuItem>
                                        {getAvailableBases().map((base) => (
                                            <MenuItem key={base._id} value={base._id}>
                                                {base.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Quantity"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        required
                                        inputProps={{ min: 1 }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="date"
                                        label="Transfer Date"
                                        name="transferDate"
                                        value={formData.transferDate}
                                        onChange={handleChange}
                                        InputLabelProps={{ shrink: true }}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        multiline
                                        rows={4}
                                        label="Notes"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                    />
                                </Grid>
                            </Grid>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDialog}>Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                        >
                            {selectedTransfer ? 'Update' : 'Create'}
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default Transfers; 