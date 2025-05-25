import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
    AppBar,
    Box,
    CssBaseline,
    Divider,
    Drawer,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    useTheme,
    useMediaQuery,
    Alert,
    Snackbar
} from '@mui/material';
import {
    Menu as MenuIcon,
    Dashboard as DashboardIcon,
    ShoppingCart as ShoppingCartIcon,
    SwapHoriz as SwapHorizIcon,
    Assignment as AssignmentIcon,
    MilitaryTech as MilitaryTechIcon,
    People as PeopleIcon,
    Logout as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 240;

const DashboardLayout = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, loading, logout } = useAuth();
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        loading: true,
        user: null,
        error: null
    });

    useEffect(() => {
        setAuthState({
            isAuthenticated,
            loading,
            user,
            error: null
        });
    }, [isAuthenticated, loading, user]);

    const handleDrawerToggle = useCallback(() => {
        setMobileOpen(prev => !prev);
    }, []);

    const handleNavigation = useCallback((path) => {
        if (path === location.pathname) return;
        if (!isAuthenticated) {
            setAuthState(prev => ({
                ...prev,
                error: 'Please log in to access this page'
            }));
            navigate('/login');
            return;
        }
        navigate(path);
        if (isMobile) {
            setMobileOpen(false);
        }
    }, [navigate, isMobile, location.pathname, isAuthenticated]);

    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    const handleCloseError = useCallback(() => {
        setAuthState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    const navigationItems = useMemo(() => {
        const baseItems = [
            { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
            { text: 'Assets', icon: <ShoppingCartIcon />, path: '/assets' },
            { text: 'Transfers', icon: <SwapHorizIcon />, path: '/transfers' },
            { text: 'Assignments', icon: <AssignmentIcon />, path: '/assignments' },
            { text: 'Bases', icon: <MilitaryTechIcon />, path: '/bases' }
        ];

        if (user?.role === 'admin') {
            return [
                ...baseItems,
                { text: 'Users', icon: <PeopleIcon />, path: '/users' }
            ];
        }

        return baseItems;
    }, [user?.role]);

    const currentPageTitle = useMemo(() => {
        return navigationItems.find(item => item.path === location.pathname)?.text || 'Dashboard';
    }, [navigationItems, location.pathname]);

    const drawer = useMemo(() => (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Military Asset Management
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {navigationItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            selected={location.pathname === item.path}
                            onClick={() => handleNavigation(item.path)}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon>
                            <LogoutIcon />
                        </ListItemIcon>
                        <ListItemText primary="Logout" />
                    </ListItemButton>
                </ListItem>
            </List>
        </div>
    ), [navigationItems, location.pathname, handleNavigation, handleLogout]);

    const drawerContent = useMemo(() => (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        >
            <Drawer
                variant={isMobile ? 'temporary' : 'permanent'}
                open={isMobile ? mobileOpen : true}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true,
                }}
                sx={{
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawer}
            </Drawer>
        </Box>
    ), [isMobile, mobileOpen, handleDrawerToggle, drawer]);

    const appBarContent = useMemo(() => (
        <AppBar
            position="fixed"
            sx={{
                width: { sm: `calc(100% - ${drawerWidth}px)` },
                ml: { sm: `${drawerWidth}px` },
            }}
        >
            <Toolbar>
                {isMobile && (
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>
                )}
                <Typography variant="h6" noWrap component="div">
                    {currentPageTitle}
                </Typography>
            </Toolbar>
        </AppBar>
    ), [isMobile, handleDrawerToggle, currentPageTitle]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>Loading...</Typography>
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Typography>Please log in to access the dashboard</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            {appBarContent}
            {drawerContent}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: { sm: `calc(100% - ${drawerWidth}px)` },
                    mt: '64px'
                }}
            >
                <Outlet />
            </Box>
            <Snackbar
                open={!!authState.error}
                autoHideDuration={6000}
                onClose={handleCloseError}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
                    {authState.error}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default DashboardLayout; 