import React, { useState, useEffect } from 'react';
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
    Alert,
    Tooltip,
    Chip
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    FilterList as FilterIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Assets = () => {
    const theme = useTheme();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        startDate: '',
        endDate: ''
    });

    const [formData, setFormData] = useState({
        name: '',
        type: '',
        serialNumber: '',
        base: '',
        quantity: 0,
        openingBalance: 0,
        closingBalance: 0,
        purchaseDate: '',
        purchaseDetails: {
            supplier: '',
            cost: 0,
            purchaseOrderNumber: ''
        }
    });

    useEffect(() => {
        fetchAssets();
    }, [filters]);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams();
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/assets?${queryParams}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssets(response.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch assets');
            console.error('Error fetching assets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (asset = null) => {
        if (asset) {
            setSelectedAsset(asset);
            setFormData(asset);
        } else {
            setSelectedAsset(null);
            setFormData({
                name: '',
                type: '',
                serialNumber: '',
                base: user.base,
                quantity: 0,
                openingBalance: 0,
                closingBalance: 0,
                purchaseDate: new Date().toISOString().split('T')[0],
                purchaseDetails: {
                    supplier: '',
                    cost: 0,
                    purchaseOrderNumber: ''
                }
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedAsset(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedAsset) {
                await axios.put(`/api/assets/${selectedAsset._id}`, formData);
            } else {
                await axios.post('/api/assets', formData);
            }
            handleCloseDialog();
            fetchAssets();
        } catch (err) {
            setError('Failed to save asset');
            console.error('Error saving asset:', err);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this asset?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`http://localhost:5000/api/assets/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchAssets();
            } catch (err) {
                setError('Failed to delete asset');
                console.error('Error deleting asset:', err);
            }
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'available':
                return 'success';
            case 'assigned':
                return 'info';
            case 'maintenance':
                return 'warning';
            case 'expended':
                return 'error';
            default:
                return 'default';
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Assets
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/assets/new')}
                >
                    New Asset
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                select
                                label="Type"
                                value={filters.type}
                                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="weapon">Weapon</MenuItem>
                                <MenuItem value="vehicle">Vehicle</MenuItem>
                                <MenuItem value="ammunition">Ammunition</MenuItem>
                                <MenuItem value="equipment">Equipment</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                select
                                label="Status"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <MenuItem value="">All</MenuItem>
                                <MenuItem value="available">Available</MenuItem>
                                <MenuItem value="assigned">Assigned</MenuItem>
                                <MenuItem value="maintenance">Maintenance</MenuItem>
                                <MenuItem value="expended">Expended</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="Start Date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                type="date"
                                label="End Date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Serial Number</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Opening Balance</TableCell>
                            <TableCell>Closing Balance</TableCell>
                            <TableCell>Purchase Date</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assets.map((asset) => (
                            <TableRow key={asset._id}>
                                <TableCell>{asset.name}</TableCell>
                                <TableCell>{asset.type}</TableCell>
                                <TableCell>{asset.serialNumber}</TableCell>
                                <TableCell>{asset.location}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={asset.status}
                                        color={getStatusColor(asset.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{asset.quantity}</TableCell>
                                <TableCell>{asset.openingBalance}</TableCell>
                                <TableCell>{asset.closingBalance}</TableCell>
                                <TableCell>{new Date(asset.purchaseDate).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(asset)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(asset._id)}
                                                color="error"
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>
                    {selectedAsset ? 'Edit Asset' : 'Add New Asset'}
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Select
                                    fullWidth
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    displayEmpty
                                    required
                                >
                                    <MenuItem value="">Select Type</MenuItem>
                                    <MenuItem value="weapon">Weapon</MenuItem>
                                    <MenuItem value="vehicle">Vehicle</MenuItem>
                                    <MenuItem value="ammunition">Ammunition</MenuItem>
                                    <MenuItem value="equipment">Equipment</MenuItem>
                                </Select>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Serial Number"
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Quantity"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Opening Balance"
                                    value={formData.openingBalance}
                                    onChange={(e) => setFormData({ ...formData, openingBalance: parseInt(e.target.value) })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Closing Balance"
                                    value={formData.closingBalance}
                                    onChange={(e) => setFormData({ ...formData, closingBalance: parseInt(e.target.value) })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Purchase Date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Supplier"
                                    value={formData.purchaseDetails.supplier}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        purchaseDetails: { ...formData.purchaseDetails, supplier: e.target.value }
                                    })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Cost"
                                    value={formData.purchaseDetails.cost}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        purchaseDetails: { ...formData.purchaseDetails, cost: parseFloat(e.target.value) }
                                    })}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Purchase Order Number"
                                    value={formData.purchaseDetails.purchaseOrderNumber}
                                    onChange={(e) => setFormData({
                                        ...formData,
                                        purchaseDetails: { ...formData.purchaseDetails, purchaseOrderNumber: e.target.value }
                                    })}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained">
                        {selectedAsset ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assets; 