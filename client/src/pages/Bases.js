import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Menu,
    MenuItem,
    Alert,
    CircularProgress
} from '@mui/material';
import { MoreVert as MoreVertIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';

const Bases = () => {
    const { user } = useAuth();
    const [bases, setBases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedBase, setSelectedBase] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        capacity: '',
        status: 'active',
        type: 'army'
    });

    const fetchBases = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/bases');
            setBases(response.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch bases');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBases();
    }, [fetchBases]);

    const handleOpenDialog = (base = null) => {
        if (base) {
            setFormData({
                name: base.name,
                location: base.location,
                capacity: base.capacity,
                status: base.status,
                type: base.type
            });
            setSelectedBase(base);
        } else {
            setFormData({
                name: '',
                location: '',
                capacity: '',
                status: 'active',
                type: 'army'
            });
            setSelectedBase(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedBase(null);
        setFormData({
            name: '',
            location: '',
            capacity: '',
            status: 'active',
            type: 'army'
        });
    };

    const handleMenuOpen = (event, base) => {
        setAnchorEl(event.currentTarget);
        setSelectedBase(base);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedBase(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            console.log('Current user:', user);
            const submitData = {
                ...formData
            };
            console.log('Submitting data:', submitData);
            if (selectedBase) {
                await axios.put(`/bases/${selectedBase._id}`, submitData);
            } else {
                await axios.post('/bases', submitData);
            }
            fetchBases();
            handleCloseDialog();
        } catch (err) {
            console.error('Base save error:', err.response?.data);
            setError(
                err.response?.data?.message ||
                err.message ||
                'Failed to save base. Please check your permissions and try again.'
            );
        }
    };

    const handleDelete = async () => {
        try {
            await axios.delete(`/bases/${selectedBase._id}`);
            fetchBases();
            handleMenuClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete base');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
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
                    Military Bases
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenDialog()}
                >
                    Add New Base
                </Button>
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
                            <TableCell>Name</TableCell>
                            <TableCell>Location</TableCell>
                            <TableCell>Capacity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {bases.map((base) => (
                            <TableRow key={base._id}>
                                <TableCell>{base.name}</TableCell>
                                <TableCell>{base.location}</TableCell>
                                <TableCell>{base.capacity}</TableCell>
                                <TableCell>{base.status}</TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        onClick={(e) => handleMenuOpen(e, base)}
                                    >
                                        <MoreVertIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={() => {
                    handleMenuClose();
                    handleOpenDialog(selectedBase);
                }}>
                    Edit
                </MenuItem>
                <MenuItem onClick={handleDelete}>
                    Delete
                </MenuItem>
            </Menu>

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>
                    {selectedBase ? 'Edit Base' : 'Add New Base'}
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
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
                            <MenuItem value="maintenance">Maintenance</MenuItem>
                        </TextField>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        {selectedBase ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Bases; 