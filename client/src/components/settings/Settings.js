import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    TextField,
    Button,
    Switch,
    FormControlLabel,
    Divider,
    CircularProgress,
    Alert,
} from '@mui/material';
import axiosInstance from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState({
        emailNotifications: true,
        maintenanceAlerts: true,
        transferNotifications: true,
        assignmentNotifications: true,
        defaultBase: '',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
        language: 'en',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axiosInstance.get('/settings');
            setSettings(response.data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setError('Failed to fetch settings');
        }
    };

    const handleChange = (e) => {
        const { name, value, checked } = e.target;
        setSettings((prev) => ({
            ...prev,
            [name]: e.target.type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setSuccess('');
        setError('');

        try {
            await axiosInstance.put('/settings', settings);
            setSuccess('Settings updated successfully');
        } catch (error) {
            console.error('Error updating settings:', error);
            setError(error.response?.data?.message || 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="md">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom>
                        Settings
                    </Typography>

                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            {success}
                        </Alert>
                    )}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Notifications
                                </Typography>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.emailNotifications}
                                            onChange={handleChange}
                                            name="emailNotifications"
                                        />
                                    }
                                    label="Email Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.maintenanceAlerts}
                                            onChange={handleChange}
                                            name="maintenanceAlerts"
                                        />
                                    }
                                    label="Maintenance Alerts"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.transferNotifications}
                                            onChange={handleChange}
                                            name="transferNotifications"
                                        />
                                    }
                                    label="Transfer Notifications"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={settings.assignmentNotifications}
                                            onChange={handleChange}
                                            name="assignmentNotifications"
                                        />
                                    }
                                    label="Assignment Notifications"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Divider />
                            </Grid>

                            <Grid item xs={12}>
                                <Typography variant="h6" gutterBottom>
                                    Preferences
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Default Base"
                                    name="defaultBase"
                                    value={settings.defaultBase}
                                    onChange={handleChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Timezone"
                                    name="timezone"
                                    value={settings.timezone}
                                    onChange={handleChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Date Format"
                                    name="dateFormat"
                                    value={settings.dateFormat}
                                    onChange={handleChange}
                                    margin="normal"
                                />
                                <TextField
                                    fullWidth
                                    label="Language"
                                    name="language"
                                    value={settings.language}
                                    onChange={handleChange}
                                    margin="normal"
                                />
                            </Grid>

                            <Grid item xs={12}>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={loading}
                                        sx={{ minWidth: 120 }}
                                    >
                                        {loading ? <CircularProgress size={24} /> : 'Save Changes'}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={fetchSettings}
                                        disabled={loading}
                                    >
                                        Reset
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

export default Settings; 