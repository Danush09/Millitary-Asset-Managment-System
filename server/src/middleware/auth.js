const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Ensure JWT_SECRET is set
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
if (!process.env.JWT_SECRET) {
    console.warn('Warning: Using default JWT_SECRET. Please set JWT_SECRET in environment variables for production.');
}

// Authentication middleware
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded || !decoded.userId) {
            return res.status(401).json({ message: 'Invalid token' });
        }

        // Get user from database
        const user = await User.findById(decoded.userId)
            .select('-password')
            .populate('base', '_id name')
            .populate('assignedBases', '_id name')
            .populate('primaryBase', '_id name');

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ message: 'User account is inactive' });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        res.status(500).json({ message: 'Authentication error' });
    }
};

// Authorization middleware
const authorize = (roles = []) => {
    if (typeof roles === 'string') {
        roles = [roles];
    }

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Access denied',
                userRole: req.user.role,
                requiredRoles: roles
            });
        }

        next();
    };
};

// Admin middleware
const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    next();
};

// Base commander middleware
const isBaseCommander = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role !== 'base_commander') {
        return res.status(403).json({ message: 'Base commander access required' });
    }

    next();
};

// Logistics officer middleware
const isLogisticsOfficer = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'User not authenticated' });
    }

    if (req.user.role !== 'logistics_officer') {
        return res.status(403).json({ message: 'Logistics officer access required' });
    }

    next();
};

// Middleware to check if user has access to a specific base
const hasBaseAccess = (req, res, next) => {
    const baseId = req.params.baseId || req.body.baseId;
    if (!baseId) {
        return res.status(400).json({ message: 'Base ID is required' });
    }

    if (!req.user.hasAccessToBase(baseId)) {
        return res.status(403).json({ message: 'Access denied to this base' });
    }
    next();
};

// Middleware to check if user can manage a specific base
const canManageBase = (req, res, next) => {
    const baseId = req.params.baseId || req.body.baseId;
    if (!baseId) {
        return res.status(400).json({ message: 'Base ID is required' });
    }

    if (!req.user.canManageBase(baseId)) {
        return res.status(403).json({ message: 'You do not have permission to manage this base' });
    }
    next();
};

// Middleware to check if user can manage assets
const canManageAssets = (req, res, next) => {
    // For DELETE operations, we need to get the base from the asset
    if (req.method === 'DELETE') {
        return next(); // Skip base check for DELETE, we'll check in the route handler
    }

    // For GET requests with an ID parameter, skip the base check
    // We'll check base access in the route handler after fetching the asset
    if (req.method === 'GET' && req.params.id) {
        return next();
    }

    const baseId = req.params.baseId || req.body.base;
    if (!baseId) {
        return res.status(400).json({ message: 'Base ID is required' });
    }

    if (!req.user.canManageBase(baseId)) {
        return res.status(403).json({ message: 'You do not have permission to manage assets in this base' });
    }
    next();
};

module.exports = {
    authenticate,
    authorize,
    isAdmin,
    isBaseCommander,
    isLogisticsOfficer,
    hasBaseAccess,
    canManageBase,
    canManageAssets
}; 