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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const MaintenanceForm = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        asset: '',
        type: '',
        description: '',
        status: 'scheduled',
        startDate: new Date(),
        endDate: null,
        cost: '',
        technician: '',
        notes: '',
    });
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAssets();
        if (isEdit) {
            fetchMaintenanceRecord();
        }
    }, [id]);

    const fetchAssets = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/assets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssets(response.data);
        } catch (error) {
            console.error('Error fetching assets:', error);
        }
    };

    const fetchMaintenanceRecord = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/maintenance/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                ...response.data,
                startDate: new Date(response.data.startDate),
                endDate: response.data.endDate ? new Date(response.data.endDate) : null,
            });
        } catch (error) {
            console.error('Error fetching maintenance record:', error);
            setError('Failed to fetch maintenance record details');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleDateChange = (name) => (date) => {
        setFormData((prev) => ({
            ...prev,
            [name]: date,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            if (isEdit) {
                await axios.put(`http://localhost:5000/api/maintenance/${id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/maintenance', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            navigate('/maintenance');
        } catch (error) {
            console.error('Error saving maintenance record:', error);
            setError(error.response?.data?.message || 'Failed to save maintenance record');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        {isEdit ? 'Edit Maintenance Record' : 'New Maintenance Record'}
                    </Typography>
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <form onSubmit={handleSubmit}>
                        <FormControl fullWidth margin="normal">
                            <InputLabel>Asset</InputLabel>
                            <Select
                                name="asset"
                                value={formData.asset}
                                onChange={handleChange}
                                required
                            >
                                {assets.map((asset) => (
                                    <MenuItem key={asset._id} value={asset._id}>
                                        {asset.name} ({asset.serialNumber})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal">
                            <InputLabel>Maintenance Type</InputLabel>
                            <Select
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                            >
                                <MenuItem value="preventive">Preventive</MenuItem>
                                <MenuItem value="corrective">Corrective</MenuItem>
                                <MenuItem value="predictive">Predictive</MenuItem>
                                <MenuItem value="condition_based">Condition Based</MenuItem>
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            margin="normal"
                            multiline
                            rows={3}
                            required
                        />

                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <Box sx={{ mt: 2, mb: 2 }}>
                                <DatePicker
                                    label="Start Date"
                                    value={formData.startDate}
                                    onChange={handleDateChange('startDate')}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </Box>
                            <Box sx={{ mt: 2, mb: 2 }}>
                                <DatePicker
                                    label="End Date (Optional)"
                                    value={formData.endDate}
                                    onChange={handleDateChange('endDate')}
                                    renderInput={(params) => <TextField {...params} fullWidth />}
                                />
                            </Box>
                        </LocalizationProvider>

                        <TextField
                            fullWidth
                            label="Cost"
                            name="cost"
                            type="number"
                            value={formData.cost}
                            onChange={handleChange}
                            margin="normal"
                            InputProps={{
                                startAdornment: '$',
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Technician"
                            name="technician"
                            value={formData.technician}
                            onChange={handleChange}
                            margin="normal"
                        />

                        {isEdit && (
                            <FormControl fullWidth margin="normal">
                                <InputLabel>Status</InputLabel>
                                <Select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    required
                                >
                                    <MenuItem value="scheduled">Scheduled</MenuItem>
                                    <MenuItem value="in_progress">In Progress</MenuItem>
                                    <MenuItem value="completed">Completed</MenuItem>
                                    <MenuItem value="cancelled">Cancelled</MenuItem>
                                </Select>
                            </FormControl>
                        )}

                        <TextField
                            fullWidth
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            margin="normal"
                            multiline
                            rows={4}
                        />

                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading}
                                sx={{ minWidth: 120 }}
                            >
                                {loading ? <CircularProgress size={24} /> : isEdit ? 'Update' : 'Submit'}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/maintenance')}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
};

export default MaintenanceForm; 