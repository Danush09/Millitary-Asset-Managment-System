import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import theme from './theme';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transfers from './pages/Transfers';
import Assignments from './pages/Assignments';
import Bases from './pages/Bases';
import Users from './pages/Users';
import NotFound from './pages/NotFound';
import Unauthorized from './pages/Unauthorized';

// Components
import PrivateRoute from './components/PrivateRoute';
import AssetList from './components/assets/AssetList';
import AssetForm from './components/assets/AssetForm';

const AppRoutes = () => {
    return (
        <Routes>
            {/* Auth Routes */}
            <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected Routes */}
            <Route element={<DashboardLayout />}>
                {/* Dashboard - Accessible by all authenticated users */}
                <Route
                    path="/dashboard"
                    element={
                        <PrivateRoute>
                            <Dashboard />
                        </PrivateRoute>
                    }
                />

                {/* Assets - Accessible by admin and logistics */}
                <Route
                    path="/assets"
                    element={
                        <PrivateRoute requiredRoles={['admin', 'logistics_officer']}>
                            <AssetList />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/assets/new"
                    element={
                        <PrivateRoute requiredRoles={['admin', 'logistics_officer']}>
                            <AssetForm />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/assets/:id"
                    element={
                        <PrivateRoute requiredRoles={['admin', 'logistics_officer']}>
                            <AssetForm />
                        </PrivateRoute>
                    }
                />

                {/* Transfers - Accessible by admin and logistics */}
                <Route
                    path="/transfers"
                    element={
                        <PrivateRoute requiredRoles={['admin', 'logistics_officer']}>
                            <Transfers />
                        </PrivateRoute>
                    }
                />

                {/* Assignments - Accessible by admin, logistics, and commander */}
                <Route
                    path="/assignments"
                    element={
                        <PrivateRoute requiredRoles={['admin', 'logistics_officer', 'base_commander']}>
                            <Assignments />
                        </PrivateRoute>
                    }
                />

                {/* Bases - Accessible by admin and commander */}
                <Route
                    path="/bases"
                    element={
                        <PrivateRoute requiredRoles={['admin', 'base_commander']}>
                            <Bases />
                        </PrivateRoute>
                    }
                />

                {/* Users - Accessible by admin only */}
                <Route
                    path="/users"
                    element={
                        <PrivateRoute requiredRoles={['admin']}>
                            <Users />
                        </PrivateRoute>
                    }
                />
            </Route>

            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Error Routes */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
};

export default App; 