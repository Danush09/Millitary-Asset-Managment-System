import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    MenuItem,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    Grid,
    Alert
} from '@mui/material';
import axios from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const TransferForm = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({
        asset: '',
        fromBase: '',
        toBase: '',
        quantity: 1,
        transferDate: new Date(),
        notes: '',
        status: 'pending'
    });

    const [assets, setAssets] = useState([]);
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isAuthenticated || !user) {
            navigate('/login');
            return;
        }

        console.log('TransferForm mounted/updated:', {
            isEdit,
            user: {
                id: user?._id,
                role: user?.role,
                base: user?.base
            },
            formData
        });

        fetchAssets();
        fetchBases();
        if (isEdit) {
            fetchTransfer();
        }
    }, [id, isAuthenticated, user, navigate]);

    const fetchAssets = async () => {
        try {
            console.log('Fetching assets...');
            const response = await axios.get('/assets');
            console.log('Assets fetched:', response.data);
            setAssets(response.data);
        } catch (error) {
            console.error('Error fetching assets:', error);
            setError('Failed to fetch assets');
        }
    };

    const fetchBases = async () => {
        try {
            console.log('Fetching bases...');
            const response = await axios.get('/bases');
            console.log('Bases fetched:', response.data);
            setBases(response.data);
        } catch (error) {
            console.error('Error fetching bases:', error);
            setError('Failed to fetch bases');
        }
    };

    const fetchTransfer = async () => {
        try {
            console.log('Fetching transfer details for ID:', id);
            setLoading(true);
            const response = await axios.get(`/transfers/${id}`);
            console.log('Transfer details fetched:', response.data);
            const transferData = response.data;
            setFormData({
                ...transferData,
                transferDate: new Date(transferData.transferDate),
                asset: transferData.asset._id,
                fromBase: transferData.fromBase._id,
                toBase: transferData.toBase._id,
                initiatedBy: transferData.initiatedBy._id,
                notes: transferData.notes || ''
            });
        } catch (error) {
            console.error('Error fetching transfer:', error);
            setError('Failed to fetch transfer details');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (!isAuthenticated || !user) {
                setError('User session is invalid. Please log in again.');
                setLoading(false);
                return;
            }

            console.log('Starting transfer submission...', {
                user: {
                    id: user?._id,
                    role: user?.role,
                    base: user?.base
                },
                formData
            });

            // Validate required fields
            const requiredFields = ['asset', 'fromBase', 'toBase', 'quantity', 'transferDate'];
            const missingFields = requiredFields.filter(field => !formData[field]);

            if (missingFields.length > 0) {
                setError(`Missing required fields: ${missingFields.join(', ')}`);
                setLoading(false);
                return;
            }

            let finalFromBase;
            if (user.role === 'admin' || user.role === 'logistics_officer') {
                finalFromBase = formData.fromBase;
            } else if (user.role === 'base_commander') {
                finalFromBase = user.base;
            } else {
                setError('Invalid user role for transfer creation');
                setLoading(false);
                return;
            }

            if (!finalFromBase) {
                setError('Source base (From Base) is required');
                setLoading(false);
                return;
            }

            const transferData = {
                ...formData,
                quantity: Number(formData.quantity),
                initiatedBy: user._id,
                fromBase: finalFromBase,
                transferDate: new Date(formData.transferDate).toISOString()
            };

            console.log('Prepared transfer data:', transferData);

            if (isEdit) {
                const updateData = {
                    notes: transferData.notes,
                    transferDate: transferData.transferDate
                };
                await axios.put(`/transfers/${id}`, updateData);
            } else {
                const response = await axios.post('/transfers', transferData);
                console.log('Transfer creation response:', response.data);
            }

            navigate('/transfers');
        } catch (error) {
            console.error('Transfer submission error:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status,
                config: error.config
            });

            let errorMessage = 'Failed to save transfer';
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message === 'Network Error') {
                errorMessage = 'Unable to connect to the server. Please check your connection.';
            } else if (error.response?.status === 401) {
                errorMessage = 'Your session has expired. Please log in again.';
                navigate('/login');
            } else if (error.response?.status === 403) {
                errorMessage = 'You do not have permission to perform this action.';
            }

            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated || !user) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Please log in to access this page.
                </Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth="md">
                <Box sx={{ mt: 4, mb: 4 }}>
                    <Paper elevation={3} sx={{ p: 4 }}>
                        <Typography variant="h5" gutterBottom>
                            {isEdit ? 'Edit Transfer' : 'New Transfer Request'}
                        </Typography>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>Asset</InputLabel>
                                        <Select
                                            name="asset"
                                            value={formData.asset}
                                            onChange={handleChange}
                                            label="Asset"
                                            disabled={isEdit}
                                        >
                                            {assets.map((asset) => (
                                                <MenuItem key={asset._id} value={asset._id}>
                                                    {asset.name} ({asset.serialNumber})
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>From Base</InputLabel>
                                        <Select
                                            name="fromBase"
                                            value={formData.fromBase}
                                            onChange={handleChange}
                                            label="From Base"
                                            disabled={isEdit || user.role === 'base_commander'}
                                        >
                                            {bases.map((base) => (
                                                <MenuItem key={base._id} value={base._id}>
                                                    {base.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth required>
                                        <InputLabel>To Base</InputLabel>
                                        <Select
                                            name="toBase"
                                            value={formData.toBase}
                                            onChange={handleChange}
                                            label="To Base"
                                            disabled={isEdit}
                                        >
                                            {bases.map((base) => (
                                                <MenuItem key={base._id} value={base._id}>
                                                    {base.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Quantity"
                                        name="quantity"
                                        type="number"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        required
                                        inputProps={{ min: 1 }}
                                        disabled={isEdit}
                                    />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <DatePicker
                                        label="Transfer Date"
                                        value={formData.transferDate}
                                        onChange={(newValue) => {
                                            setFormData(prev => ({
                                                ...prev,
                                                transferDate: newValue
                                            }));
                                        }}
                                        slotProps={{
                                            textField: {
                                                fullWidth: true,
                                                required: true
                                            }
                                        }}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Notes"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        multiline
                                        rows={4}
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                                        <Button
                                            variant="outlined"
                                            onClick={() => navigate('/transfers')}
                                            disabled={loading}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            disabled={loading}
                                            sx={{ minWidth: 120 }}
                                        >
                                            {loading ? <CircularProgress size={24} /> : isEdit ? 'Update' : 'Submit'}
                                        </Button>
                                    </Box>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Box>
            </Container>
        </LocalizationProvider>
    );
};

export default TransferForm; 