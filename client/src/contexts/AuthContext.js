import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../utils/axios';

const AuthContext = createContext();

export const useAuth = () => {
    return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);

    const initializeAuth = async () => {
        try {
            console.log('[AuthContext] initializeAuth started');
            const storedToken = localStorage.getItem('token');
            console.log('[AuthContext] Stored token:', storedToken ? 'found' : 'not found');

            if (storedToken) {
                // Set the token in axios headers
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                setToken(storedToken);

                try {
                    // Verify token by making a request to get user info
                    const response = await axios.get('/auth/me');
                    if (response.data) {
                        setUser(response.data);
                        setIsAuthenticated(true);
                    } else {
                        throw new Error('Invalid user data');
                    }
                } catch (error) {
                    console.error('[AuthContext] Token validation failed:', error);
                    logout();
                }
            } else {
                console.log('[AuthContext] No token found, initializing as logged out');
                logout();
            }
        } catch (error) {
            console.error('[AuthContext] Error during initialization:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeAuth();
    }, []);

    const login = async (credentials) => {
        try {
            setLoading(true);
            const response = await axios.post('/auth/login', credentials);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setToken(token);
            setUser(user);
            setIsAuthenticated(true);

            return { success: true };
        } catch (error) {
            console.error('[AuthContext] Login error:', error);
            return {
                success: false,
                error: error.response?.data?.message || 'Login failed'
            };
        } finally {
            setLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        token,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}; 