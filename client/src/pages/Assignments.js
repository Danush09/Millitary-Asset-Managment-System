import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    TextField,
    Grid,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    IconButton,
    Tooltip,
    Alert,
    CircularProgress
} from '@mui/material';
import {
    Add as AddIcon,
    FilterList as FilterIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';

const Assignments = () => {
    const { user } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [assets, setAssets] = useState([]);
    const [bases, setBases] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [formData, setFormData] = useState({
        asset: '',
        base: '',
        assignedTo: '',
        status: 'active',
        notes: '',
        quantity: 1,
        purpose: '',
        assignmentDate: new Date().toISOString().split('T')[0]
    });

    const equipmentTypes = [
        'Vehicles',
        'Weapons',
        'Ammunition',
        'Communication Equipment',
        'Medical Supplies'
    ];

    const assignmentStatuses = [
        'active',
        'returned',
        'expended',
        'lost'
    ];

    const fetchAssignments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get('/assignments');
            setAssignments(response.data);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchAssets = useCallback(async () => {
        try {
            const response = await axios.get('/assets');
            setAssets(response.data);
        } catch (err) {
            console.error('Failed to fetch assets:', err);
        }
    }, []);

    const fetchBases = useCallback(async () => {
        try {
            const response = await axios.get('/bases');
            setBases(response.data);
        } catch (err) {
            console.error('Failed to fetch bases:', err);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get('/users');
            setUsers(response.data);
        } catch (err) {
            console.error('Failed to fetch users:', err);
        }
    }, []);

    useEffect(() => {
        fetchAssignments();
        fetchAssets();
        fetchBases();
        fetchUsers();
    }, [fetchAssignments, fetchAssets, fetchBases, fetchUsers]);

    const handleOpenDialog = (assignment = null) => {
        if (assignment) {
            setFormData({
                asset: assignment.asset._id,
                base: assignment.base._id,
                assignedTo: assignment.assignedTo._id,
                status: assignment.status,
                notes: assignment.notes || '',
                quantity: assignment.quantity || 1,
                purpose: assignment.purpose || '',
                assignmentDate: assignment.assignmentDate ? new Date(assignment.assignmentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            });
            setSelectedAssignment(assignment);
        } else {
            setFormData({
                asset: '',
                base: '',
                assignedTo: '',
                status: 'active',
                notes: '',
                quantity: 1,
                purpose: '',
                assignmentDate: new Date().toISOString().split('T')[0]
            });
            setSelectedAssignment(null);
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedAssignment(null);
        setFormData({
            asset: '',
            base: '',
            assignedTo: '',
            status: 'active',
            notes: '',
            quantity: 1,
            purpose: '',
            assignmentDate: new Date().toISOString().split('T')[0]
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const submitData = {
                ...formData,
                assignedBy: user._id
            };

            if (selectedAssignment) {
                await axios.put(`/assignments/${selectedAssignment._id}`, submitData);
            } else {
                await axios.post('/assignments', submitData);
            }
            fetchAssignments();
            handleCloseDialog();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save assignment');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active':
                return 'success';
            case 'returned':
                return 'info';
            case 'expended':
                return 'error';
            case 'lost':
                return 'warning';
            default:
                return 'default';
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this assignment?')) {
            try {
                await axios.delete(`/assignments/${id}`);
                fetchAssignments();
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete assignment');
            }
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
                    Asset Assignments
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleOpenDialog()}
                >
                    New Assignment
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
                            <TableCell>Asset</TableCell>
                            <TableCell>Base</TableCell>
                            <TableCell>Assigned To</TableCell>
                            <TableCell>Quantity</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {assignments.map((assignment) => (
                            <TableRow key={assignment._id}>
                                <TableCell>
                                    {assignment.asset?.name || 'Unknown Asset'}
                                </TableCell>
                                <TableCell>
                                    {assignment.base?.name || 'Unknown Base'}
                                </TableCell>
                                <TableCell>
                                    {assignment.assignedTo?.fullName || 'Unknown User'}
                                </TableCell>
                                <TableCell>
                                    {assignment.quantity}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={assignment.status}
                                        color={getStatusColor(assignment.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{assignment.notes}</TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Tooltip title="Edit">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleOpenDialog(assignment)}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDelete(assignment._id)}
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

            <Dialog open={openDialog} onClose={handleCloseDialog}>
                <DialogTitle>
                    {selectedAssignment ? 'Edit Assignment' : 'New Assignment'}
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <TextField
                            select
                            fullWidth
                            label="Asset"
                            name="asset"
                            value={formData.asset}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            {assets.map((asset) => (
                                <MenuItem key={asset._id} value={asset._id}>
                                    {asset.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Base"
                            name="base"
                            value={formData.base}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            {bases.map((base) => (
                                <MenuItem key={base._id} value={base._id}>
                                    {base.name}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Assigned To"
                            name="assignedTo"
                            value={formData.assignedTo}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            {users.map((user) => (
                                <MenuItem key={user._id} value={user._id}>
                                    {user.fullName}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            select
                            fullWidth
                            label="Status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            margin="normal"
                            required
                        >
                            {assignmentStatuses.map((status) => (
                                <MenuItem key={status} value={status}>
                                    {status}
                                </MenuItem>
                            ))}
                        </TextField>
                        <TextField
                            fullWidth
                            label="Purpose"
                            name="purpose"
                            value={formData.purpose}
                            onChange={handleChange}
                            margin="normal"
                            required
                        />
                        <TextField
                            fullWidth
                            label="Quantity"
                            name="quantity"
                            type="number"
                            value={formData.quantity}
                            onChange={handleChange}
                            margin="normal"
                            required
                            inputProps={{ min: 1 }}
                        />
                        <TextField
                            fullWidth
                            label="Assignment Date"
                            name="assignmentDate"
                            type="date"
                            value={formData.assignmentDate}
                            onChange={handleChange}
                            margin="normal"
                            required
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />
                        <TextField
                            fullWidth
                            label="Notes"
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            margin="normal"
                            multiline
                            rows={3}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                    >
                        {selectedAssignment ? 'Update' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Assignments; 