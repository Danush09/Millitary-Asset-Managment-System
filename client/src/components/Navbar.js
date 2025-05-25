import React from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    IconButton,
    Menu,
    MenuItem,
} from '@mui/material';
import {
    AccountCircle,
    Dashboard as DashboardIcon,
    Inventory as InventoryIcon,
    SwapHoriz as TransferIcon,
    Assignment as AssignmentIcon,
    LocationOn as BaseIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = React.useState(null);

    const handleMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        handleClose();
        logout();
        navigate('/login');
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography
                    variant="h6"
                    component={RouterLink}
                    to="/dashboard"
                    sx={{
                        flexGrow: 1,
                        textDecoration: 'none',
                        color: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    Military Asset Management
                </Typography>

                {isAuthenticated ? (
                    <>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/dashboard"
                                startIcon={<DashboardIcon />}
                            >
                                Dashboard
                            </Button>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/assets"
                                startIcon={<InventoryIcon />}
                            >
                                Assets
                            </Button>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/transfers"
                                startIcon={<TransferIcon />}
                            >
                                Transfers
                            </Button>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/assignments"
                                startIcon={<AssignmentIcon />}
                            >
                                Assignments
                            </Button>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/bases"
                                startIcon={<BaseIcon />}
                            >
                                Bases
                            </Button>
                        </Box>

                        <IconButton
                            size="large"
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            onClick={handleMenu}
                            color="inherit"
                        >
                            <AccountCircle />
                        </IconButton>
                        <Menu
                            id="menu-appbar"
                            anchorEl={anchorEl}
                            anchorOrigin={{
                                vertical: 'bottom',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorEl)}
                            onClose={handleClose}
                        >
                            <MenuItem disabled>
                                {user?.fullName} ({user?.role})
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>Logout</MenuItem>
                        </Menu>
                    </>
                ) : (
                    <Box>
                        <Button color="inherit" component={RouterLink} to="/login">
                            Login
                        </Button>
                        <Button color="inherit" component={RouterLink} to="/register">
                            Register
                        </Button>
                    </Box>
                )}
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;