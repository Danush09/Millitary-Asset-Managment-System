import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NotFound = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default'
            }}
        >
            <Paper
                elevation={3}
                sx={{
                    p: 4,
                    maxWidth: 500,
                    width: '100%',
                    textAlign: 'center'
                }}
            >
                <Typography variant="h1" component="h1" gutterBottom>
                    404
                </Typography>
                <Typography variant="h4" component="h2" gutterBottom>
                    Page Not Found
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    The page you are looking for doesn't exist or has been moved.
                </Typography>
                <Box sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        onClick={() => navigate(user ? '/' : '/login')}
                        sx={{ mr: 2 }}
                    >
                        {user ? 'Go to Dashboard' : 'Go to Login'}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => navigate(-1)}
                    >
                        Go Back
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default NotFound; 