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
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

const BaseForm = () => {
    const { id } = useParams();
    const isEdit = Boolean(id);
    const navigate = useNavigate();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        name: '',
        location: '',
        type: '',
        capacity: '',
        status: 'active',
        description: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isEdit) {
            fetchBase();
        }
    }, [id]);

    const fetchBase = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`http://localhost:5000/api/bases/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFormData(response.data);
        } catch (error) {
            console.error('Error fetching base:', error);
            setError('Failed to fetch base details');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const baseData = {
                ...formData,
                createdBy: user._id,
                type: formData.type || 'air',
                description: formData.description || '',
                capacity: Number(formData.capacity)
            };

            if (isEdit) {
                await axios.put(`http://localhost:5000/api/bases/${id}`, baseData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('http://localhost:5000/api/bases', baseData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            navigate('/bases');
        } catch (error) {
            console.error('Error saving base:', error);
            setError(error.response?.data?.message || 'Failed to save base');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        {isEdit ? 'Edit Base' : 'Add New Base'}
                    </Typography>
                    {error && (
                        <Typography color="error" sx={{ mb: 2 }}>
                            {error}
                        </Typography>
                    )}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Location"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            select
                            label="Type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            <MenuItem value="air">Air Base</MenuItem>
                            <MenuItem value="naval">Naval Base</MenuItem>
                            <MenuItem value="army">Army Base</MenuItem>
                            <MenuItem value="joint">Joint Base</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Capacity"
                            name="capacity"
                            type="number"
                            value={formData.capacity}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            select
                            label="Status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            <MenuItem value="active">Active</MenuItem>
                            <MenuItem value="inactive">Inactive</MenuItem>
                            <MenuItem value="maintenance">Under Maintenance</MenuItem>
                        </TextField>
                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description}
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
                                {loading ? <CircularProgress size={24} /> : isEdit ? 'Update' : 'Create'}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => navigate('/bases')}
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

export default BaseForm; 