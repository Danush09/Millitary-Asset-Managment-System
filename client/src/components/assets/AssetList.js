import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    IconButton,
    MenuItem,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    Alert,
    Tooltip,
    Chip,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axiosInstance from '../../utils/axios';

const AssetList = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        type: '',
        status: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        fetchAssets();
    }, [filters, location.state?.refresh]);

    // Clear the refresh state after fetching
    useEffect(() => {
        if (location.state?.refresh) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.refresh, navigate, location.pathname]);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            setError(null);
            const queryParams = new URLSearchParams();
            if (filters.type) queryParams.append('type', filters.type);
            if (filters.status) queryParams.append('status', filters.status);
            if (filters.startDate) queryParams.append('startDate', filters.startDate);
            if (filters.endDate) queryParams.append('endDate', filters.endDate);

            const response = await axiosInstance.get(`/assets?${queryParams}`);
            setAssets(response.data);
        } catch (err) {
            console.error('Error fetching assets:', err);
            setError(err.response?.data?.message || 'Failed to fetch assets. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this asset?')) {
            try {
                setError(null);
                await axiosInstance.delete(`/assets/${id}`);
                await fetchAssets();
            } catch (err) {
                console.error('Error deleting asset:', err);
                setError(err.response?.data?.message || 'Failed to delete asset. Please try again.');
            }
        }
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
                <CircularProgress />
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
                                <TableCell>
                                    <Tooltip title="View Details">
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/assets/${asset._id}/view`)}
                                        >
                                            <ViewIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Edit">
                                        <IconButton
                                            color="primary"
                                            onClick={() => navigate(`/assets/${asset._id}`)}
                                        >
                                            <EditIcon />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Delete">
                                        <IconButton
                                            color="error"
                                            onClick={() => handleDelete(asset._id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default AssetList; 