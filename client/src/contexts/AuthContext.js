import React, { createContext, useContext, useEffect, useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, logout, verifyToken, register } from '../store/slices/authSlice';
import axios from '../utils/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, isAuthenticated, loading, token, error } = useSelector((state) => state.auth);

    useEffect(() => {
        console.log('[AuthContext] Current auth state:', { user, isAuthenticated, loading, token });
    }, [user, isAuthenticated, loading, token]);

    const initializeAuth = useCallback(async () => {
        console.log('[AuthContext] initializeAuth started');
        try {
            const storedToken = localStorage.getItem('token');
            console.log('[AuthContext] Stored token:', storedToken ? 'exists' : 'not found');

            if (!storedToken || storedToken === 'null' || storedToken === 'undefined') {
                console.log('[AuthContext] No valid token found, logging out');
                dispatch(logout());
                return;
            }

            // Set the token in axios headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            console.log('[AuthContext] Token set in axios headers');

            // Verify the token
            const result = await dispatch(verifyToken()).unwrap();
            console.log('[AuthContext] Token verification result:', result);

            if (!result || (!result._id && !result.id)) {
                throw new Error('Invalid user data received');
            }

            // Normalize user object to use _id
            if (result.id && !result._id) {
                result._id = result.id;
            }
        } catch (error) {
            console.error('[AuthContext] Auth initialization error:', error);
            // Clear invalid token
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            dispatch(logout());
            console.log('[AuthContext] Dispatched logout due to error');
        }
    }, [dispatch]);

    // Initialize auth on mount
    useEffect(() => {
        console.log('[AuthContext] Running initializeAuth effect');
        initializeAuth();
    }, [initializeAuth]);

    // Periodically verify token
    useEffect(() => {
        if (isAuthenticated && token) {
            const interval = setInterval(() => {
                console.log('[AuthContext] Running periodic token verification');
                initializeAuth();
            }, 5 * 60 * 1000); // Check every 5 minutes

            return () => clearInterval(interval);
        }
    }, [isAuthenticated, token, initializeAuth]);

    const loginUser = async (credentials) => {
        console.log('[AuthContext] Login attempt with credentials');
        try {
            const result = await dispatch(login(credentials)).unwrap();
            console.log('[AuthContext] Login successful:', result);
            if (result) {
                navigate('/dashboard');
            }
            return result;
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        }
    };

    const registerUser = async (userData) => {
        console.log('[AuthContext] Registration attempt with user data');
        try {
            const result = await dispatch(register(userData)).unwrap();
            console.log('[AuthContext] Registration successful:', result);

            // Set the token in axios headers
            if (result.token) {
                axios.defaults.headers.common['Authorization'] = `Bearer ${result.token}`;
            }

            // Navigate to dashboard after successful registration
            navigate('/dashboard', { replace: true });

            return result;
        } catch (error) {
            console.error('[AuthContext] Registration failed:', error);
            throw error;
        }
    };

    const logoutUser = () => {
        console.log('[AuthContext] Logout called');
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        dispatch(logout());
        navigate('/login');
    };

    const value = useMemo(() => ({
        user,
        isAuthenticated,
        loading,
        token,
        error,
        login: loginUser,
        logout: logoutUser,
        register: registerUser
    }), [user, isAuthenticated, loading, token, error, loginUser, logoutUser, registerUser]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 