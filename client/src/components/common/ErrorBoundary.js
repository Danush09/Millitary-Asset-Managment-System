import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({
            error: error,
            errorInfo: errorInfo,
        });
        // You can also log the error to an error reporting service
        console.error('Error caught by boundary:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '80vh',
                        p: 3,
                        textAlign: 'center',
                    }}
                >
                    <Typography variant="h4" color="error" gutterBottom>
                        Something went wrong
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        We apologize for the inconvenience. Please try refreshing the page or contact support if the problem persists.
                    </Typography>
                    {process.env.NODE_ENV === 'development' && (
                        <Box
                            sx={{
                                mt: 2,
                                p: 2,
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                maxWidth: '100%',
                                overflow: 'auto',
                            }}
                        >
                            <Typography variant="subtitle2" color="error">
                                {this.state.error && this.state.error.toString()}
                            </Typography>
                            <Typography variant="body2" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                                {this.state.errorInfo && this.state.errorInfo.componentStack}
                            </Typography>
                        </Box>
                    )}
                    <Button
                        variant="contained"
                        startIcon={<RefreshIcon />}
                        onClick={this.handleReset}
                        sx={{ mt: 3 }}
                    >
                        Try Again
                    </Button>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary; 