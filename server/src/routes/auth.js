const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const Base = require('../models/Base');

// Ensure JWT_SECRET is set
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
if (!process.env.JWT_SECRET) {
    console.warn('Warning: Using default JWT_SECRET. Please set JWT_SECRET in environment variables for production.');
}

// Register new user
router.post('/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body);
        const { email, password, fullName, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('User already exists:', email);
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            email,
            password: hashedPassword,
            fullName,
            role: role || 'logistics_officer', // Default role if not specified
            isActive: true, // Set user as active by default
            // Initialize base-related fields based on role
            base: null, // No base assigned initially
            assignedBases: [], // Empty array for logistics officers
            primaryBase: null // No primary base initially
        });

        console.log('Attempting to save user:', {
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            base: user.base,
            assignedBases: user.assignedBases,
            primaryBase: user.primaryBase
        });

        await user.save();
        console.log('User saved successfully:', user._id);

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('JWT token generated for user:', user._id);

        res.status(201).json({
            success: true,
            data: {
                token,
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('Registration error:', {
            message: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        console.log('Login attempt for email:', email);

        // Input validation
        if (!email || !password) {
            console.log('Missing credentials');
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email - include password field for comparison
        const user = await User.findOne({ email: email.toLowerCase() });
        console.log('Found user:', user ? {
            id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        } : 'No user found');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if user is active
        if (!user.isActive) {
            console.log('Inactive user attempt:', user.email);
            return res.status(401).json({
                success: false,
                message: 'Account is inactive. Please contact administrator.'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('Password validation result:', isValidPassword);

        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('Login successful for user:', {
            id: user._id,
            email: user.email,
            role: user.role
        });

        // Return user data and token - exclude password from response
        const userResponse = {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            base: user.base,
            lastLogin: user.lastLogin
        };

        res.json({
            success: true,
            data: {
                token,
                user: userResponse
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred during login'
        });
    }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('base', 'name');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
    try {
        const { fullName, email, currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (fullName) user.fullName = fullName;
        if (email) user.email = email;

        // Update password if provided
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: 'Current password is incorrect' });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
        }

        await user.save();
        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify token route
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        console.log('Token verification request received');

        if (!token) {
            console.log('No token provided');
            return res.status(401).json({
                success: false,
                message: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('Token decoded:', decoded);

        const user = await User.findById(decoded.userId)
            .select('-password')
            .populate('base', 'name');

        console.log('Found user for token:', user ? {
            id: user._id,
            email: user.email,
            role: user.role,
            isActive: user.isActive
        } : 'No user found');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            console.log('Inactive user token verification:', user.email);
            return res.status(401).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        console.log('Token verification successful for user:', {
            id: user._id,
            email: user.email,
            role: user.role
        });

        res.json({
            success: true,
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    base: user.base,
                    lastLogin: user.lastLogin
                }
            }
        });

    } catch (error) {
        console.error('Token verification error:', error);

        if (error.name === 'JsonWebTokenError') {
            console.error('Invalid token:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        if (error.name === 'TokenExpiredError') {
            console.error('Expired token:', error.message);
            return res.status(401).json({
                success: false,
                message: 'Session expired. Please login again.'
            });
        }

        console.error('Token verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error verifying token'
        });
    }
});

module.exports = router; 