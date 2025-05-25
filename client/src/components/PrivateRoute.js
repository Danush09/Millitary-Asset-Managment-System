import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children, requiredRoles = [] }) => {
    const { user, isAuthenticated, loading, error } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    backgroundColor: '#f5f5f5'
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        console.error('Auth error:', error);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if the user has any of the required roles
    if (requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.includes(user.role);
        if (!hasRequiredRole) {
            console.log('Access denied: User role', user.role, 'not in required roles', requiredRoles);
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};

export default PrivateRoute; 