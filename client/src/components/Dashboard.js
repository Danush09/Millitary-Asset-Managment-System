import React, { useState, useEffect } from 'react';
import axios from '../utils/axios';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    CircularProgress,
    Paper,
    Divider
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/dashboard');
            console.log('Dashboard data:', response.data); // Debug log
            setDashboardData(response.data);
            setError(null);
        } catch (err) {
            console.error('Dashboard data error:', err);
            setError(err.response?.data?.message || 'Error fetching dashboard data');
        } finally {
            setLoading(false);
        }
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
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography color="error">{error}</Typography>
            </Box>
        );
    }

    if (!dashboardData) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <Typography color="error">No data available</Typography>
            </Box>
        );
    }

    return (
        <Box p={3}>
            {/* User Info */}
            <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
                <Typography variant="h5" gutterBottom>
                    Welcome, {dashboardData.userInfo?.fullName || 'User'}
                </Typography>
                <Typography variant="subtitle1" color="textSecondary">
                    Role: {dashboardData.userInfo?.role || 'N/A'}
                    {dashboardData.userInfo?.base && ` | Base: ${dashboardData.userInfo.base.name}`}
                </Typography>
            </Paper>

            {/* Count Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Assets
                            </Typography>
                            <Typography variant="h4">
                                {dashboardData.counts?.assets || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Transfers
                            </Typography>
                            <Typography variant="h4">
                                {dashboardData.counts?.transfers || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Assignments
                            </Typography>
                            <Typography variant="h4">
                                {dashboardData.counts?.assignments || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" gutterBottom>
                                Total Bases
                            </Typography>
                            <Typography variant="h4">
                                {dashboardData.counts?.bases || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Asset Metrics */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Asset Metrics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography color="textSecondary">Opening Balance</Typography>
                                    <Typography variant="h6">{dashboardData.metrics?.openingBalance || 0}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography color="textSecondary">Closing Balance</Typography>
                                    <Typography variant="h6">{dashboardData.metrics?.closingBalance || 0}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography color="textSecondary">Net Movement</Typography>
                                    <Typography variant="h6">{dashboardData.metrics?.netMovement || 0}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography color="textSecondary">Assigned</Typography>
                                    <Typography variant="h6">{dashboardData.metrics?.assigned || 0}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography color="textSecondary">Expended</Typography>
                                    <Typography variant="h6">{dashboardData.metrics?.expended || 0}</Typography>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Asset Distribution */}
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Asset Distribution by Type
                            </Typography>
                            <Box height={300}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={dashboardData.distributions?.type || []}
                                            dataKey="count"
                                            nameKey="_id"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label
                                        >
                                            {(dashboardData.distributions?.type || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Recent Activities */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Activities
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="subtitle1" gutterBottom>
                                Recent Assets
                            </Typography>
                            {(dashboardData.recentActivities?.assets || []).map((asset) => (
                                <Box key={asset._id} mb={1}>
                                    <Typography variant="body2">
                                        {asset.name} - {asset.base?.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="subtitle1" gutterBottom>
                                Recent Transfers
                            </Typography>
                            {(dashboardData.recentActivities?.transfers || []).map((transfer) => (
                                <Box key={transfer._id} mb={1}>
                                    <Typography variant="body2">
                                        {transfer.fromBase?.name} → {transfer.toBase?.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Typography variant="subtitle1" gutterBottom>
                                Recent Assignments
                            </Typography>
                            {(dashboardData.recentActivities?.assignments || []).map((assignment) => (
                                <Box key={assignment._id} mb={1}>
                                    <Typography variant="body2">
                                        {assignment.asset?.name} - {assignment.base?.name}
                                    </Typography>
                                </Box>
                            ))}
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
};

export default Dashboard; 