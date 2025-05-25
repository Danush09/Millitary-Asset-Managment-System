import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    TextField,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    IconButton,
    Card,
    CardContent,
    Divider,
    useTheme,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import axios from '../utils/axios';

const Dashboard = () => {
    const { user } = useAuth();
    const theme = useTheme();
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [selectedBase, setSelectedBase] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [bases, setBases] = useState([]);
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [metrics, setMetrics] = useState({
        openingBalance: 0,
        closingBalance: 0,
        netMovement: 0,
        assignedAssets: 0,
        expendedAssets: 0,
        purchases: 0,
        transferIn: 0,
        transferOut: 0,
        baseBreakdown: []
    });
    const [openMovementDialog, setOpenMovementDialog] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchBases();
        fetchEquipmentTypes();
    }, []);

    useEffect(() => {
        fetchMetrics();
    }, [startDate, endDate, selectedBase, selectedType]);

    const fetchBases = async () => {
        try {
            const response = await axios.get('/bases');
            // Only show base selection for admin users
            if (user.role === 'admin') {
                setBases(response.data);
            } else {
                setBases([]);
            }
        } catch (error) {
            console.error('Error fetching bases:', error);
            setError('Failed to fetch bases');
        }
    };

    const fetchEquipmentTypes = async () => {
        try {
            // Use the predefined asset types from the model
            const types = [
                { _id: 'weapon', name: 'Weapon' },
                { _id: 'vehicle', name: 'Vehicle' },
                { _id: 'ammunition', name: 'Ammunition' },
                { _id: 'equipment', name: 'Equipment' }
            ];
            setEquipmentTypes(types);
        } catch (error) {
            console.error('Error setting equipment types:', error);
            setError('Failed to set equipment types');
        }
    };

    const fetchMetrics = async () => {
        try {
            setLoading(true);
            const params = {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            };

            // Only add base and type to params if they are selected
            if (selectedBase) {
                params.base = selectedBase;
            }
            if (selectedType) {
                params.type = selectedType;
            }

            const response = await axios.get('/dashboard', { params });
            setMetrics({
                openingBalance: response.data.metrics.openingBalance || 0,
                closingBalance: response.data.metrics.closingBalance || 0,
                netMovement: response.data.metrics.netMovement || 0,
                assignedAssets: response.data.metrics.assigned || 0,
                expendedAssets: response.data.metrics.expended || 0,
                purchases: response.data.metrics.purchases || 0,
                transferIn: response.data.metrics.transfersIn || 0,
                transferOut: response.data.metrics.transfersOut || 0,
                baseBreakdown: response.data.distributions?.base || []
            });
            setError(null);
        } catch (error) {
            console.error('Error fetching metrics:', error);
            setError('Failed to fetch metrics');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => {
        return num?.toLocaleString() || '0';
    };

    const getRoleDisplay = (role) => {
        const roleMap = {
            'admin': 'Administrator',
            'base_commander': 'Base Commander',
            'logistics_officer': 'Logistics Officer'
        };
        return roleMap[role] || role;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Alert severity="error">{error}</Alert>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* Welcome Message */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <Typography variant="h4" gutterBottom>
                    Welcome, {user?.fullName || 'User'}
                </Typography>
                <Typography variant="subtitle1">
                    {getRoleDisplay(user?.role)}
                    {user?.base && ` | Base: ${user.base.name}`}
                </Typography>
            </Paper>

            <Typography variant="h4" gutterBottom>
                Dashboard
            </Typography>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={user.role === 'admin' ? 3 : 4}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={setStartDate}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>
                    <Grid item xs={12} md={user.role === 'admin' ? 3 : 4}>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={setEndDate}
                                renderInput={(params) => <TextField {...params} fullWidth />}
                            />
                        </LocalizationProvider>
                    </Grid>
                    {user.role === 'admin' && (
                        <Grid item xs={12} md={3}>
                            <TextField
                                select
                                label="Base"
                                value={selectedBase || 'all'}
                                onChange={(e) => setSelectedBase(e.target.value === 'all' ? '' : e.target.value)}
                                fullWidth
                            >
                                <MenuItem value="all">All Bases</MenuItem>
                                {bases.map((base) => (
                                    <MenuItem key={base._id} value={base._id}>
                                        {base.name}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>
                    )}
                    <Grid item xs={12} md={user.role === 'admin' ? 3 : 4}>
                        <TextField
                            select
                            label="Equipment Type"
                            value={selectedType || 'all'}
                            onChange={(e) => setSelectedType(e.target.value === 'all' ? '' : e.target.value)}
                            fullWidth
                        >
                            <MenuItem value="all">All Types</MenuItem>
                            {equipmentTypes.map((type) => (
                                <MenuItem key={type._id} value={type._id}>
                                    {type.name}
                                </MenuItem>
                            ))}
                        </TextField>
                    </Grid>
                </Grid>
            </Paper>

            {/* Metrics Cards */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Opening Balance
                            </Typography>
                            <Typography variant="h5">
                                {formatNumber(metrics.openingBalance)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Closing Balance
                            </Typography>
                            <Typography variant="h5">
                                {formatNumber(metrics.closingBalance)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Net Movement
                            </Typography>
                            <Typography variant="h5" color={metrics.netMovement >= 0 ? 'success.main' : 'error.main'}>
                                {formatNumber(metrics.netMovement)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Assigned Assets
                            </Typography>
                            <Typography variant="h5">
                                {formatNumber(metrics.assignedAssets)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Movement Details */}
            <Box mt={3}>
                <Button
                    variant="outlined"
                    startIcon={<InfoIcon />}
                    onClick={() => setOpenMovementDialog(true)}
                >
                    View Movement Details
                </Button>
            </Box>

            {/* Base Breakdown - Only show for admin */}
            {user.role === 'admin' && (
                <Box mt={3}>
                    <Typography variant="h6" gutterBottom>
                        Base-wise Distribution
                    </Typography>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Base</TableCell>
                                    <TableCell align="right">Total Assets</TableCell>
                                    <TableCell align="right">Assigned</TableCell>
                                    <TableCell align="right">Expended</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {metrics.baseBreakdown?.map((base) => (
                                    <TableRow key={base._id}>
                                        <TableCell>{base.name}</TableCell>
                                        <TableCell align="right">{formatNumber(base.total)}</TableCell>
                                        <TableCell align="right">{formatNumber(base.assigned)}</TableCell>
                                        <TableCell align="right">{formatNumber(base.expended)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Box>
            )}

            {/* Movement Details Dialog */}
            <Dialog
                open={openMovementDialog}
                onClose={() => setOpenMovementDialog(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    Movement Details
                    <IconButton
                        onClick={() => setOpenMovementDialog(false)}
                        sx={{ position: 'absolute', right: 8, top: 8 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Purchases
                                    </Typography>
                                    <Typography variant="h6">
                                        {formatNumber(metrics.purchases)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Transfers In
                                    </Typography>
                                    <Typography variant="h6">
                                        {formatNumber(metrics.transferIn)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Typography color="textSecondary" gutterBottom>
                                        Transfers Out
                                    </Typography>
                                    <Typography variant="h6">
                                        {formatNumber(metrics.transferOut)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default Dashboard; 