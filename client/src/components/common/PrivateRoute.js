import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Loading from './Loading';

const PrivateRoute = ({ children, requiredRoles = [] }) => {
    const { user, isAuthenticated, loading, checkAuthStatus } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const verifyAuth = async () => {
            if (!isAuthenticated) {
                await checkAuthStatus();
            }
        };
        verifyAuth();
    }, [isAuthenticated, checkAuthStatus]);

    // Show loading state during initial auth check
    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                backgroundColor: '#f5f5f5'
            }}>
                <Loading message="Loading..." />
            </div>
        );
    }

    // If not authenticated, redirect to login
    if (!isAuthenticated || !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If no specific roles are required, allow access
    if (requiredRoles.length === 0) {
        return children;
    }

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (!hasRequiredRole) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default PrivateRoute; 