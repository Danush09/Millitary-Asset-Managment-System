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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const AssignmentForm = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        asset: '',
        assignedTo: '',
        base: '',
        assignmentDate: new Date(),
        returnDate: null,
        status: 'active',
        quantity: 1,
        purpose: '',
        notes: '',
    });
    const [assets, setAssets] = useState([]);
    const [users, setUsers] = useState([]);
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAssets();
        fetchUsers();
        fetchBases();
        if (isEdit) {
            fetchAssignment();
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

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchBases = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/bases', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBases(response.data);
        } catch (error) {
            console.error('Error fetching bases:', error);
        }
    };

    const fetchAssignment = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/assignments/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData({
                ...response.data,
                assignmentDate: new Date(response.data.assignmentDate),
                returnDate: response.data.returnDate ? new Date(response.data.returnDate) : null,
            });
        } catch (error) {
            console.error('Error fetching assignment:', error);
            setError('Failed to fetch assignment details');
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
            const assignmentData = {
                ...formData,
                assignedBy: user._id,
                assignmentDate: formData.assignmentDate.toISOString(),
                returnDate: formData.returnDate ? formData.returnDate.toISOString() : null,
            };

            if (isEdit) {
                await axios.put(`http://localhost:5000/api/assignments/${id}`, assignmentData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/assignments', assignmentData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            navigate('/assignments');
        } catch (error) {
            console.error('Error saving assignment:', error);
            setError(error.response?.data?.message || 'Failed to save assignment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        {isEdit ? 'Edit Assignment' : 'New Assignment'}
                    </Typography>
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Asset</InputLabel>
                                    <Select
                                        name="asset"
                                        value={formData.asset}
                                        onChange={handleChange}
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
                                    <InputLabel>Assigned To</InputLabel>
                                    <Select
                                        name="assignedTo"
                                        value={formData.assignedTo}
                                        onChange={handleChange}
                                    >
                                        {users.map((user) => (
                                            <MenuItem key={user._id} value={user._id}>
                                                {user.fullName}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth required>
                                    <InputLabel>Base</InputLabel>
                                    <Select
                                        name="base"
                                        value={formData.base}
                                        onChange={handleChange}
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
                                    required
                                    type="number"
                                    label="Quantity"
                                    name="quantity"
                                    value={formData.quantity}
                                    onChange={handleChange}
                                    inputProps={{ min: 1 }}
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    required
                                    label="Purpose"
                                    name="purpose"
                                    value={formData.purpose}
                                    onChange={handleChange}
                                />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label="Assignment Date"
                                        value={formData.assignmentDate}
                                        onChange={handleDateChange('assignmentDate')}
                                        renderInput={(params) => <TextField {...params} fullWidth required />}
                                    />
                                </LocalizationProvider>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <LocalizationProvider dateAdapter={AdapterDateFns}>
                                    <DatePicker
                                        label="Return Date (Optional)"
                                        value={formData.returnDate}
                                        onChange={handleDateChange('returnDate')}
                                        renderInput={(params) => <TextField {...params} fullWidth />}
                                    />
                                </LocalizationProvider>
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
                                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
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
                                        onClick={() => navigate('/assignments')}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
};

export default AssignmentForm; 