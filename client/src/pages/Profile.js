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
    TextField,
    Typography,
    useTheme,
    Avatar,
    Divider
} from '@mui/material';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const Profile = () => {
    const theme = useTheme();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: '',
        base: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [bases, setBases] = useState([]);
    const [stats, setStats] = useState({
        totalAssets: 0,
        activeAssignments: 0,
        pendingTransfers: 0
    });

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                role: user.role || '',
                base: user.base || '',
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
        }
        fetchBases();
        fetchStats();
    }, [user]);

    const fetchBases = async () => {
        try {
            const response = await axios.get('/api/bases');
            setBases(response.data);
        } catch (err) {
            console.error('Error fetching bases:', err);
        }
    };

    const fetchStats = async () => {
        try {
            const [assetsRes, assignmentsRes, transfersRes] = await Promise.all([
                axios.get('/api/assets/metrics/summary'),
                axios.get('/api/assignments/metrics/summary'),
                axios.get('/api/transfers/metrics/summary')
            ]);

            setStats({
                totalAssets: assetsRes.data.totalAssets || 0,
                activeAssignments: assignmentsRes.data.activeAssignments || 0,
                pendingTransfers: transfersRes.data.pendingTransfers || 0
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const handleOpenDialog = () => {
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setFormData({
            ...formData,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError(null);

            // Validate passwords if changing
            if (formData.newPassword) {
                if (formData.newPassword !== formData.confirmPassword) {
                    setError('New passwords do not match');
                    return;
                }
                if (!formData.currentPassword) {
                    setError('Current password is required');
                    return;
                }
            }

            const response = await axios.put(`/api/users/${user._id}`, {
                fullName: formData.fullName,
                email: formData.email,
                currentPassword: formData.currentPassword,
                newPassword: formData.newPassword
            });

            updateUser(response.data);
            handleCloseDialog();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
                                <Avatar
                                    sx={{
                                        width: 100,
                                        height: 100,
                                        bgcolor: theme.palette.primary.main,
                                        fontSize: '2rem',
                                        mb: 2
                                    }}
                                >
                                    {user?.fullName?.charAt(0)}
                                </Avatar>
                                <Typography variant="h5" component="h2">
                                    {user?.fullName}
                                </Typography>
                                <Typography color="textSecondary" gutterBottom>
                                    {user?.role}
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Email
                                </Typography>
                                <Typography>{user?.email}</Typography>
                            </Box>

                            <Box sx={{ mb: 2 }}>
                                <Typography variant="subtitle2" color="textSecondary">
                                    Base
                                </Typography>
                                <Typography>
                                    {bases.find(b => b._id === user?.base)?.name || 'Not assigned'}
                                </Typography>
                            </Box>

                            <Button
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={handleOpenDialog}
                                fullWidth
                            >
                                Edit Profile
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Total Assets
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.totalAssets}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Active Assignments
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.activeAssignments}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} sm={4}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Pending Transfers
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.pendingTransfers}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>Edit Profile</DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Full Name"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Typography variant="subtitle1" gutterBottom>
                                    Change Password
                                </Typography>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Current Password"
                                    type="password"
                                    value={formData.currentPassword}
                                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Password"
                                    type="password"
                                    value={formData.newPassword}
                                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Confirm New Password"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                />
                            </Grid>
                            {error && (
                                <Grid item xs={12}>
                                    <Typography color="error">{error}</Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        disabled={loading}
                        startIcon={<SaveIcon />}
                    >
                        Save Changes
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Profile; 