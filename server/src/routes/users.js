const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize, isAdmin, canManageBase } = require('../middleware/auth');
const Base = require('../models/Base');

// Get all users
router.get('/', authenticate, authorize(['admin', 'base_commander']), async (req, res) => {
    try {
        let query = {};

        // If user is base commander
        if (req.user.role === 'base_commander') {
            // If commander has no base assigned, show all users
            // This allows them to see users when creating assignments
            if (!req.user.base) {
                console.log('Base commander has no base assigned, showing all users');
            } else {
                // If commander has a base, only show users from their base
                query.base = req.user.base;
            }
        }

        let users = await User.find(query)
            .select('-password')
            .populate('base', 'name')
            .populate('assignedBases', 'name')
            .populate('primaryBase', 'name');

        // For base commanders without a base, filter out admin users
        if (req.user.role === 'base_commander' && !req.user.base) {
            users = users.filter(user => user.role !== 'admin');
        }

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({
            message: 'Error fetching users',
            error: error.message
        });
    }
});

// Create new user (admin only)
router.post('/', authenticate, isAdmin, async (req, res) => {
    try {
        const { email, fullName, role, base, isActive } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Validate base if provided
        if (base) {
            const baseExists = await Base.findById(base);
            if (!baseExists) {
                return res.status(400).json({ message: 'Invalid base' });
            }
        }

        // Create user
        const user = new User({
            email,
            fullName,
            role,
            base,
            isActive,
            // Generate a random password
            password: Math.random().toString(36).slice(-8)
        });

        await user.save();

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.status(201).json(userResponse);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Update user (admin only)
router.put('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const { email, fullName, role, base, isActive } = req.body;

        // Validate base if provided
        if (base) {
            const baseExists = await Base.findById(base);
            if (!baseExists) {
                return res.status(400).json({ message: 'Invalid base' });
            }
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update user fields
        user.email = email;
        user.fullName = fullName;
        user.role = role;
        user.base = base;
        user.isActive = isActive;

        await user.save();

        // Remove password from response
        const userResponse = user.toObject();
        delete userResponse.password;

        res.json(userResponse);
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent deleting the last admin
        if (user.role === 'admin') {
            const adminCount = await User.countDocuments({ role: 'admin' });
            if (adminCount <= 1) {
                return res.status(400).json({ message: 'Cannot delete the last admin user' });
            }
        }

        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// Get user by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('base', 'name');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If not admin, only allow viewing users from the same base
        if (req.user.role !== 'admin' && user.base._id.toString() !== req.user.base.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current user's details
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password')
            .populate('base', '_id name');

        console.log('Current user details:', {
            id: user._id,
            email: user.email,
            role: user.role,
            base: user.base
        });

        res.json(user);
    } catch (error) {
        console.error('Error fetching user details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user details',
            error: error.message
        });
    }
});

// Update user's base (admin only)
router.patch('/:id/base', authenticate, isAdmin, async (req, res) => {
    try {
        const { baseId } = req.body;
        if (!baseId) {
            return res.status(400).json({
                success: false,
                message: 'Base ID is required'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { base: baseId },
            { new: true }
        ).select('-password').populate('base', '_id name');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        console.log('User base updated:', {
            userId: user._id,
            email: user.email,
            base: user.base
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating user base:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user base',
            error: error.message
        });
    }
});

// Assign base to user (admin only)
router.post('/:userId/assign-base', authenticate, isAdmin, async (req, res) => {
    try {
        const { baseId } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const base = await Base.findById(baseId);
        if (!base) {
            return res.status(404).json({ message: 'Base not found' });
        }

        // Check if base already has a commander
        if (user.role === 'base_commander') {
            const existingCommander = await User.findOne({
                role: 'base_commander',
                base: baseId,
                _id: { $ne: user._id }
            });

            if (existingCommander) {
                return res.status(400).json({ message: 'This base already has a commander' });
            }
        }

        // Assign base based on role
        if (user.role === 'base_commander') {
            user.base = baseId;
            user.assignedBases = [baseId];
            user.primaryBase = baseId;
        } else if (user.role === 'logistics_officer') {
            await user.addAssignedBase(baseId);
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Remove base from user (admin only)
router.delete('/:userId/remove-base/:baseId', authenticate, isAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'base_commander') {
            user.base = null;
            user.assignedBases = [];
            user.primaryBase = null;
        } else if (user.role === 'logistics_officer') {
            await user.removeAssignedBase(req.params.baseId);
        }

        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Set primary base for logistics officer (admin only)
router.put('/:userId/set-primary-base', authenticate, isAdmin, async (req, res) => {
    try {
        const { baseId } = req.body;
        const user = await User.findById(req.params.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role !== 'logistics_officer') {
            return res.status(400).json({ message: 'Only logistics officers can have a primary base' });
        }

        await user.setPrimaryBase(baseId);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's assigned bases
router.get('/:userId/bases', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId)
            .populate('base', 'name')
            .populate('assignedBases', 'name')
            .populate('primaryBase', 'name');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if requesting user has permission to view
        if (req.user.role !== 'admin' && req.user._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            base: user.base,
            assignedBases: user.assignedBases,
            primaryBase: user.primaryBase
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 