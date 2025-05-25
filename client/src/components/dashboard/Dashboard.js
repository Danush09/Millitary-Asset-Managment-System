import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container,
    Grid,
    Paper,
    Typography,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Divider,
} from '@mui/material';
import {
    Assignment as AssignmentIcon,
    Build as BuildIcon,
    SwapHoriz as TransferIcon,
    Warning as AlertIcon,
} from '@mui/icons-material';
import axiosInstance from '../../utils/axios';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard = () => {
    const [stats, setStats] = useState({
        totalAssets: 0,
        activeAssignments: 0,
        pendingTransfers: 0,
        scheduledMaintenance: 0,
    });
    const [recentActivities, setRecentActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user, isAuthenticated, checkAuthStatus } = useAuth();

    useEffect(() => {
        console.log('Dashboard mounted, auth state:', {
            isAuthenticated,
            user: user ? {
                id: user.id,
                email: user.email,
                role: user.role
            } : 'No user'
        });

        const initializeDashboard = async () => {
            try {
                console.log('Initializing dashboard...');
                // First verify authentication status
                await checkAuthStatus();
                console.log('Auth status verified, current user:', user);

                // Then fetch dashboard data
                await fetchDashboardData();
                console.log('Dashboard data fetched successfully');
            } catch (error) {
                console.error('Error initializing dashboard:', error);
                navigate('/login');
            }
        };

        if (isAuthenticated && user) {
            console.log('User authenticated, initializing dashboard');
            initializeDashboard();
        } else {
            console.log('User not authenticated or missing user data');
            setLoading(false);
        }
    }, [navigate, checkAuthStatus, isAuthenticated, user]);

    const fetchDashboardData = async () => {
        try {
            console.log('Fetching dashboard data for user:', {
                id: user.id,
                role: user.role
            });
            setLoading(true);
            const [statsResponse, activitiesResponse] = await Promise.all([
                axiosInstance.get('/dashboard/stats'),
                axiosInstance.get('/dashboard/activities'),
            ]);

            console.log('Dashboard data received:', {
                stats: statsResponse.data,
                activities: activitiesResponse.data
            });

            setStats(statsResponse.data);
            setRecentActivities(activitiesResponse.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            if (error.response?.status === 401) {
                console.log('Unauthorized, redirecting to login');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'assignment':
                return <AssignmentIcon />;
            case 'maintenance':
                return <BuildIcon />;
            case 'transfer':
                return <TransferIcon />;
            case 'alert':
                return <AlertIcon />;
            default:
                return null;
        }
    };

    if (!isAuthenticated || !user) {
        return null;
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Welcome, {user.fullName}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    {user.role === 'admin' ? 'System Administrator' :
                        user.role === 'base_commander' ? 'Base Commander' : 'Logistics Officer'}
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Stats Cards */}
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            bgcolor: 'primary.main',
                            color: 'white',
                        }}
                    >
                        <Typography component="h2" variant="h6" gutterBottom>
                            Total Assets
                        </Typography>
                        <Typography component="p" variant="h4">
                            {stats.totalAssets}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            bgcolor: 'success.main',
                            color: 'white',
                        }}
                    >
                        <Typography component="h2" variant="h6" gutterBottom>
                            Active Assignments
                        </Typography>
                        <Typography component="p" variant="h4">
                            {stats.activeAssignments}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            bgcolor: 'warning.main',
                            color: 'white',
                        }}
                    >
                        <Typography component="h2" variant="h6" gutterBottom>
                            Pending Transfers
                        </Typography>
                        <Typography component="p" variant="h4">
                            {stats.pendingTransfers}
                        </Typography>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            height: 140,
                            bgcolor: 'info.main',
                            color: 'white',
                        }}
                    >
                        <Typography component="h2" variant="h6" gutterBottom>
                            Scheduled Maintenance
                        </Typography>
                        <Typography component="p" variant="h4">
                            {stats.scheduledMaintenance}
                        </Typography>
                    </Paper>
                </Grid>

                {/* Recent Activities */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 2 }}>
                        <Typography component="h2" variant="h6" gutterBottom>
                            Recent Activities
                        </Typography>
                        <List>
                            {recentActivities.map((activity, index) => (
                                <React.Fragment key={activity._id}>
                                    <ListItem button onClick={() => navigate(activity.link)}>
                                        <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                                        <ListItemText
                                            primary={activity.title}
                                            secondary={new Date(activity.timestamp).toLocaleString()}
                                        />
                                    </ListItem>
                                    {index < recentActivities.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default Dashboard; 