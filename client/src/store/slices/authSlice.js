import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../../utils/axios';

// Async thunks
export const register = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            console.log('Registration attempt with data:', userData);
            const response = await axios.post('/auth/register', userData);
            console.log('Registration response:', response.data);

            if (!response.data.success) {
                console.error('Registration failed:', response.data.message);
                return rejectWithValue(response.data.message);
            }

            const { token, user } = response.data.data;

            if (!token || !user) {
                console.error('Invalid response data:', response.data);
                return rejectWithValue('Invalid response from server');
            }

            // Store token in localStorage
            localStorage.setItem('token', token);
            console.log('Token stored in localStorage');

            // Set token in axios headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token set in axios headers');

            // Return the user and token
            return {
                user: {
                    ...user,
                    _id: user.id || user._id // Normalize user ID
                },
                token
            };
        } catch (error) {
            console.error('Registration error:', error.response?.data || error.message);
            // Don't clear token on registration error
            return rejectWithValue(error.response?.data?.message || 'Registration failed');
        }
    }
);

export const login = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            console.log('Login attempt with credentials:', credentials);
            const response = await axios.post('/auth/login', credentials);
            console.log('Login response:', response.data);

            if (!response.data.success) {
                console.error('Login failed:', response.data.message);
                return rejectWithValue(response.data.message);
            }

            const { token, user } = response.data.data;

            if (!token || !user) {
                console.error('Invalid response data:', response.data);
                return rejectWithValue('Invalid response from server');
            }

            // Store token in localStorage
            localStorage.setItem('token', token);
            console.log('Token stored in localStorage');

            // Set token in axios headers
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token set in axios headers');

            return { user, token };
        } catch (error) {
            console.error('Login error:', error.response?.data || error.message);
            // Clear any existing invalid token
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            return rejectWithValue(error.response?.data?.message || 'Login failed');
        }
    }
);

export const verifyToken = createAsyncThunk(
    'auth/verifyToken',
    async (_, { rejectWithValue }) => {
        try {
            const token = localStorage.getItem('token');
            console.log('Verifying token:', token ? 'Token exists' : 'No token found');

            if (!token || token === 'null' || token === 'undefined') {
                console.error('No valid token found in storage');
                return rejectWithValue('No valid token found in storage');
            }

            // Ensure the token is set in axios headers for this specific request
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            console.log('Token set in axios headers for verification');

            const response = await axios.get('/auth/verify');
            console.log('Token verification response:', response.data);

            if (!response.data.success) {
                console.error('Token verification failed:', response.data.message);
                return rejectWithValue(response.data.message);
            }

            const user = response.data.data.user;
            if (!user || (!user._id && !user.id)) {
                console.error('Invalid user data in verification response');
                return rejectWithValue('Invalid user data received');
            }

            // Normalize user object to use _id
            if (user.id && !user._id) {
                user._id = user.id;
            }

            return user;
        } catch (error) {
            console.error('Token verification error:', error.response?.data || error.message);
            // Clear invalid token
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            return rejectWithValue(error.response?.data?.message || 'Token verification failed');
        }
    }
);

const initialState = {
    user: null,
    token: localStorage.getItem('token') || null,
    isAuthenticated: false,
    loading: true,
    error: null
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            console.log('Logout action dispatched');
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            state.loading = false;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Register
            .addCase(register.pending, (state) => {
                console.log('[authSlice] register.pending');
                state.loading = true;
                state.error = null;
            })
            .addCase(register.fulfilled, (state, action) => {
                console.log('[authSlice] register.fulfilled, payload:', action.payload);
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.error = null;
            })
            .addCase(register.rejected, (state, action) => {
                console.error('[authSlice] register.rejected, error payload:', action.payload);
                state.loading = false;
                state.error = action.payload;
            })
            // Login
            .addCase(login.pending, (state) => {
                console.log('[authSlice] login.pending');
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                console.log('[authSlice] login.fulfilled, payload:', action.payload);
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload.user;
                state.token = action.payload.token;
                state.error = null;
            })
            .addCase(login.rejected, (state, action) => {
                console.error('[authSlice] login.rejected, error payload:', action.payload);
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = action.payload;
            })
            // Verify Token
            .addCase(verifyToken.pending, (state) => {
                console.log('[authSlice] verifyToken.pending');
                state.loading = true;
                state.error = null;
            })
            .addCase(verifyToken.fulfilled, (state, action) => {
                console.log('[authSlice] verifyToken.fulfilled, payload:', action.payload);
                state.loading = false;
                state.isAuthenticated = true;
                state.user = action.payload;
                state.error = null;
            })
            .addCase(verifyToken.rejected, (state, action) => {
                console.error('[authSlice] verifyToken.rejected, error payload:', action.payload);
                state.loading = false;
                state.isAuthenticated = false;
                state.user = null;
                state.token = null;
                state.error = action.payload;
            });
    }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer; 