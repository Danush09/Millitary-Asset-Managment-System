import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Link,
    Box,
    Alert,
    MenuItem,
    CircularProgress,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import axiosInstance from '../../utils/axios';

const Register = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'logistics_officer',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { register } = useAuth();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
            setError('Please fill in all required fields');
            return false;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            setError('Please enter a valid email address');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Log the registration attempt
            console.log('Attempting registration with:', {
                email: formData.email,
                fullName: formData.fullName,
                role: formData.role
            });

            // Try direct axios call first to test the API
            try {
                const response = await axiosInstance.post('/auth/register', {
                    email: formData.email,
                    password: formData.password,
                    fullName: formData.fullName,
                    role: formData.role,
                });
                console.log('Registration response:', response.data);
            } catch (axiosError) {
                console.error('Axios registration error:', {
                    message: axiosError.message,
                    response: axiosError.response?.data,
                    status: axiosError.response?.status
                });
            }

            const result = await register({
                email: formData.email,
                password: formData.password,
                fullName: formData.fullName,
                role: formData.role,
            });

            console.log('Registration result:', result);

            if (result.success) {
                console.log('Registration successful, navigating to dashboard...');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 100);
            } else {
                console.error('Registration failed:', result.error);
                setError(result.error || 'Failed to create account. Please try again.');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setError(error.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="sm">
            <Box sx={{ mt: 8 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Typography component="h1" variant="h5" align="center" gutterBottom>
                        Register
                    </Typography>
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}
                    <form onSubmit={handleSubmit}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="fullName"
                            label="Full Name"
                            name="fullName"
                            autoComplete="name"
                            autoFocus
                            value={formData.fullName}
                            onChange={handleChange}
                            disabled={loading}
                            error={!!error}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="email"
                            label="Email Address"
                            name="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            error={!!error}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="Password"
                            type="password"
                            id="password"
                            autoComplete="new-password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            error={!!error}
                            helperText="Password must be at least 6 characters long"
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Confirm Password"
                            type="password"
                            id="confirmPassword"
                            autoComplete="new-password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            error={!!error}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            select
                            name="role"
                            label="Role"
                            value={formData.role}
                            onChange={handleChange}
                            disabled={loading}
                        >
                            <MenuItem value="logistics_officer">Logistics Officer</MenuItem>
                            <MenuItem value="base_commander">Base Commander</MenuItem>
                        </TextField>
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}
                        >
                            {loading ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                'Register'
                            )}
                        </Button>
                        <Box sx={{ textAlign: 'center' }}>
                            <Link component={RouterLink} to="/login" variant="body2">
                                {'Already have an account? Sign In'}
                            </Link>
                        </Box>
                    </form>
                </Paper>
            </Box>
        </Container>
    );
};

export default Register; 