import React, { useState, useEffect } from 'react';

import {
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Alert,
    Chip,
    Stack
} from '@mui/material';
import axios from 'axios';

const BaseAssignment = ({ user, onUpdate }) => {
    const [open, setOpen] = useState(false);
    const [bases, setBases] = useState([]);
    const [selectedBase, setSelectedBase] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchBases();
    }, []);

    const fetchBases = async () => {
        try {
            const response = await axios.get('/bases');
            setBases(response.data);
        } catch (error) {
            console.error('Error fetching bases:', error);
            setError('Failed to fetch bases');
        }
    };

    const handleAssignBase = async () => {
        try {
            setLoading(true);
            setError('');

            await axios.post(`/users/${user._id}/assign-base`, {
                baseId: selectedBase
            });

            onUpdate();
            setOpen(false);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to assign base');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBase = async (baseId) => {
        try {
            setLoading(true);
            setError('');

            await axios.delete(`/users/${user._id}/remove-base/${baseId}`);
            onUpdate();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to remove base');
        } finally {
            setLoading(false);
        }
    };

    const handleSetPrimaryBase = async (baseId) => {
        try {
            setLoading(true);
            setError('');

            await axios.put(`/users/${user._id}/set-primary-base`, {
                baseId
            });
            onUpdate();
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to set primary base');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box>
            <Button
                variant="contained"
                color="primary"
                onClick={() => setOpen(true)}
                disabled={loading}
            >
                Manage Base Assignment
            </Button>

            {/* Current Base Assignments */}
            <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Current Base Assignments
                </Typography>
                <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    {user.role === 'base_commander' && user.base && (
                        <Chip
                            label={`Base: ${user.base.name}`}
                            color="primary"
                            onDelete={() => handleRemoveBase(user.base._id)}
                        />
                    )}
                    {user.role === 'logistics_officer' && (
                        <>
                            {user.assignedBases.map((base) => (
                                <Chip
                                    key={base._id}
                                    label={`${base.name}${base._id === user.primaryBase?._id ? ' (Primary)' : ''}`}
                                    color={base._id === user.primaryBase?._id ? 'primary' : 'default'}
                                    onDelete={() => handleRemoveBase(base._id)}
                                    onClick={() => handleSetPrimaryBase(base._id)}
                                />
                            ))}
                        </>
                    )}
                </Stack>
            </Box>

            {/* Assign Base Dialog */}
            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>Assign Base</DialogTitle>
                <DialogContent>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Select Base</InputLabel>
                        <Select
                            value={selectedBase}
                            onChange={(e) => setSelectedBase(e.target.value)}
                            label="Select Base"
                        >
                            {bases.map((base) => (
                                <MenuItem
                                    key={base._id}
                                    value={base._id}
                                    disabled={
                                        user.role === 'base_commander' &&
                                        base.commander &&
                                        base.commander !== user._id
                                    }
                                >
                                    {base.name}
                                    {base.commander && user.role === 'base_commander' && ' (Has Commander)'}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAssignBase}
                        variant="contained"
                        disabled={!selectedBase || loading}
                    >
                        Assign
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BaseAssignment; 