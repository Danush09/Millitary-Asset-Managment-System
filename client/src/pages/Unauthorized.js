import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Unauthorized = () => {
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
                <Typography variant="h4" component="h1" gutterBottom>
                    Access Denied
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Sorry, you don't have permission to access this page.
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    Your current role: <strong>{user?.role || 'Not assigned'}</strong>
                </Typography>
                <Box sx={{ mt: 3 }}>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/')}
                        sx={{ mr: 2 }}
                    >
                        Go to Dashboard
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

export default Unauthorized; 