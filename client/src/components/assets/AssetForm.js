import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    TextField,
    Typography,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const AssetForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bases, setBases] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        serialNumber: '',
        base: '',
        location: '',
        status: 'available',
        quantity: 0,
        openingBalance: '',
        closingBalance: '',
        netMovement: '',
        purchaseDate: new Date(),
        purchaseDetails: {
            supplier: '',
            cost: 0,
            purchaseOrderNumber: ''
        }
    });
    const [validationErrors, setValidationErrors] = useState({});

    const fetchBases = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/bases', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBases(response.data);

            // If user has a base assigned, set it as default
            if (user?.base && !id) {
                setFormData(prev => ({
                    ...prev,
                    base: user.base._id
                }));
            }
        } catch (err) {
            setError('Failed to fetch bases');
            console.error('Error fetching bases:', err);
        }
    }, [user, id]);

    const fetchAsset = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/assets/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Format numeric values with proper handling of null/undefined
            const formatNumericValue = (value) => {
                if (value === null || value === undefined || value === '') return '';
                const num = Number(value);
                return isNaN(num) ? '' : num.toString();
            };

            // Format date with proper handling
            const formatDate = (dateString) => {
                if (!dateString) return new Date();
                const date = new Date(dateString);
                return isNaN(date.getTime()) ? new Date() : date;
            };

            // Calculate initial balances
            const openingBalance = Number(response.data.openingBalance);
            const netMovement = Number(response.data.netMovement);
            const closingBalance = Number(response.data.closingBalance);

            // Ensure all fields are properly initialized
            const assetData = {
                ...response.data,
                name: response.data.name?.trim() || '',
                type: response.data.type || '',
                serialNumber: response.data.serialNumber?.trim() || '',
                base: response.data.base || '',
                location: response.data.location?.trim() || '',
                status: response.data.status || 'available',
                quantity: formatNumericValue(response.data.quantity),
                openingBalance: formatNumericValue(openingBalance),
                closingBalance: formatNumericValue(closingBalance),
                netMovement: formatNumericValue(netMovement),
                purchaseDate: formatDate(response.data.purchaseDate),
                purchaseDetails: {
                    supplier: response.data.purchaseDetails?.supplier?.trim() || '',
                    cost: formatNumericValue(response.data.purchaseDetails?.cost),
                    purchaseOrderNumber: response.data.purchaseDetails?.purchaseOrderNumber?.trim() || ''
                }
            };

            setFormData(assetData);
        } catch (err) {
            setError('Failed to fetch asset');
            console.error('Error fetching asset:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchBases();
        if (id) {
            fetchAsset();
        }
    }, [id, fetchBases, fetchAsset]);

    const validateForm = () => {
        const errors = {};
        if (!formData.name) errors.name = 'Name is required';
        if (!formData.type) errors.type = 'Type is required';
        if (!formData.serialNumber) errors.serialNumber = 'Serial Number is required';
        if (!formData.base) errors.base = 'Base is required';
        if (!formData.location) errors.location = 'Location is required';
        if (!formData.status) errors.status = 'Status is required';
        if (formData.quantity < 0) errors.quantity = 'Quantity cannot be negative';
        if (formData.openingBalance < 0) errors.openingBalance = 'Opening Balance cannot be negative';
        if (formData.closingBalance < 0) errors.closingBalance = 'Closing Balance cannot be negative';
        if (!formData.purchaseDate) errors.purchaseDate = 'Purchase Date is required';
        if (!formData.purchaseDetails.supplier) errors['purchaseDetails.supplier'] = 'Supplier is required';
        if (formData.purchaseDetails.cost < 0) errors['purchaseDetails.cost'] = 'Cost cannot be negative';
        if (!formData.purchaseDetails.purchaseOrderNumber) errors['purchaseDetails.purchaseOrderNumber'] = 'Purchase Order Number is required';

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name.includes('.')) {
            const [parent, child] = name.split('.');
            setFormData(prev => ({
                ...prev,
                [parent]: {
                    ...prev[parent],
                    [child]: value
                }
            }));
        } else {
            if (name === 'openingBalance') {
                const newOpeningBalance = value === '' ? 0 : Number(value);
                const currentNetMovement = formData.netMovement === '' ? 0 : Number(formData.netMovement);
                const newClosingBalance = newOpeningBalance + currentNetMovement;

                setFormData(prev => ({
                    ...prev,
                    openingBalance: value,
                    closingBalance: newClosingBalance.toString(),
                    netMovement: currentNetMovement.toString()
                }));
            } else if (name === 'netMovement') {
                const newNetMovement = value === '' ? 0 : Number(value);
                const currentOpeningBalance = formData.openingBalance === '' ? 0 : Number(formData.openingBalance);
                const newClosingBalance = currentOpeningBalance + newNetMovement;

                setFormData(prev => ({
                    ...prev,
                    netMovement: value,
                    closingBalance: newClosingBalance.toString()
                }));
            } else if (['quantity', 'closingBalance'].includes(name)) {
                setFormData(prev => ({
                    ...prev,
                    [name]: value
                }));
            } else {
                setFormData(prev => ({
                    ...prev,
                    [name]: value
                }));
            }
        }

        // Clear validation error when field is modified
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleDateChange = (date) => {
        setFormData(prev => ({
            ...prev,
            purchaseDate: date
        }));
        if (validationErrors.purchaseDate) {
            setValidationErrors(prev => ({
                ...prev,
                purchaseDate: undefined
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = id ? `http://localhost:5000/api/assets/${id}` : 'http://localhost:5000/api/assets';
            const method = id ? 'put' : 'post';

            // Calculate final balances
            const openingBalance = parseFloat(formData.openingBalance) || 0;
            const netMovement = parseFloat(formData.netMovement) || 0;
            const closingBalance = openingBalance + netMovement;

            // Format date for submission
            const purchaseDate = formData.purchaseDate instanceof Date ?
                formData.purchaseDate.toISOString() :
                new Date(formData.purchaseDate).toISOString();

            // Prepare the data for submission according to the schema
            const submitData = {
                ...formData,
                name: formData.name.trim(),
                type: formData.type,
                serialNumber: formData.serialNumber.trim(),
                base: formData.base,
                location: formData.location.trim(),
                status: formData.status,
                quantity: parseFloat(formData.quantity) || 0,
                openingBalance,
                closingBalance,
                netMovement,
                purchaseDate,
                purchaseDetails: {
                    supplier: formData.purchaseDetails.supplier.trim(),
                    cost: parseFloat(formData.purchaseDetails.cost) || 0,
                    purchaseOrderNumber: formData.purchaseDetails.purchaseOrderNumber.trim()
                }
            };

            console.log('Submitting asset data:', submitData);

            await axios[method](url, submitData, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Navigate back to the list and trigger a refresh
            navigate('/assets', { state: { refresh: true } });
        } catch (err) {
            console.error('Error saving asset:', err);
            console.error('Request data:', formData);
            console.error('Response data:', err.response?.data);
            const errorMessage = err.response?.data?.message ||
                err.response?.data?.error ||
                'Failed to save asset';
            setError(errorMessage);
            if (err.response?.data?.errors) {
                console.error('Validation errors:', err.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && id) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" component="h1" gutterBottom>
                {id ? 'Edit Asset' : 'New Asset'}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Card>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    error={!!validationErrors.name}
                                    helperText={validationErrors.name}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    error={!!validationErrors.type}
                                    helperText={validationErrors.type}
                                    required
                                >
                                    <MenuItem value="weapon">Weapon</MenuItem>
                                    <MenuItem value="vehicle">Vehicle</MenuItem>
                                    <MenuItem value="ammunition">Ammunition</MenuItem>
                                    <MenuItem value="equipment">Equipment</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Serial Number"
                                    name="serialNumber"
                                    value={formData.serialNumber}
                                    onChange={handleChange}
                                    error={!!validationErrors.serialNumber}
                                    helperText={validationErrors.serialNumber}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Base"
                                    name="base"
                                    value={formData.base}
                                    onChange={handleChange}
                                    error={!!validationErrors.base}
                                    helperText={validationErrors.base}
                                    required
                                >
                                    {bases.map((base) => (
                                        <MenuItem key={base._id} value={base._id}>
                                            {base.name}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    error={!!validationErrors.location}
                                    helperText={validationErrors.location}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    select
                                    label="Status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    error={!!validationErrors.status}
                                    helperText={validationErrors.status}
                                    required
                                >
                                    <MenuItem value="available">Available</MenuItem>
                                    <MenuItem value="assigned">Assigned</MenuItem>
                                    <MenuItem value="maintenance">Maintenance</MenuItem>
                                    <MenuItem value="expended">Expended</MenuItem>
                                </TextField>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    error={!!validationErrors.quantity}
                                    helperText={validationErrors.quantity}
                                    required
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Opening Balance"
                                    name="openingBalance"
                                    value={formData.openingBalance}
                                    onChange={handleChange}
                                    error={!!validationErrors.openingBalance}
                                    helperText={validationErrors.openingBalance}
                                    required
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Closing Balance"
                                    name="closingBalance"
                                    value={formData.closingBalance}
                                    onChange={handleChange}
                                    error={!!validationErrors.closingBalance}
                                    helperText={validationErrors.closingBalance}
                                    required
                                    disabled
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Net Movement"
                                    name="netMovement"
                                    value={formData.netMovement}
                                    onChange={handleChange}
                                    error={!!validationErrors.netMovement}
                                    helperText={validationErrors.netMovement}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label="Purchase Date"
                                        value={formData.purchaseDate}
                                        onChange={handleDateChange}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                fullWidth
                                                error={!!validationErrors.purchaseDate}
                                                helperText={validationErrors.purchaseDate}
                                                required
                                            />
                                        )}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Purchase Details
                                </Typography>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Supplier"
                                    name="purchaseDetails.supplier"
                                    value={formData.purchaseDetails.supplier}
                                    onChange={handleChange}
                                    error={!!validationErrors['purchaseDetails.supplier']}
                                    helperText={validationErrors['purchaseDetails.supplier']}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="number"
                                    label="Cost"
                                    name="purchaseDetails.cost"
                                    value={formData.purchaseDetails.cost}
                                    onChange={handleChange}
                                    error={!!validationErrors['purchaseDetails.cost']}
                                    helperText={validationErrors['purchaseDetails.cost']}
                                    required
                                    inputProps={{ min: 0 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Purchase Order Number"
                                    name="purchaseDetails.purchaseOrderNumber"
                                    value={formData.purchaseDetails.purchaseOrderNumber}
                                    onChange={handleChange}
                                    error={!!validationErrors['purchaseDetails.purchaseOrderNumber']}
                                    helperText={validationErrors['purchaseDetails.purchaseOrderNumber']}
                                    required
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                    <Button
                                        variant="outlined"
                                        onClick={() => navigate('/assets')}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        disabled={loading}
                                    >
                                        {loading ? <CircularProgress size={24} /> : 'Save'}
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
};

export default AssetForm; 