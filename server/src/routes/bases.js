const express = require('express');
const router = express.Router();
const Base = require('../models/Base');
const { authenticate, isAdmin, authorize } = require('../middleware/auth');
const User = require('../models/User');

// Get all bases
router.get('/', authenticate, async (req, res) => {
    try {
        // Allow all authenticated users to see bases
        const bases = await Base.find();
        res.json(bases);
    } catch (error) {
        console.error('Error fetching bases:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get base by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const base = await Base.findById(req.params.id);
        if (!base) {
            return res.status(404).json({ message: 'Base not found' });
        }
        res.json(base);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new base
router.post('/', authenticate, authorize(['admin', 'base_commander']), async (req, res) => {
    try {
        const baseData = {
            ...req.body,
            createdBy: req.user._id
        };
        const base = new Base(baseData);
        const savedBase = await base.save();
        res.status(201).json(savedBase);
    } catch (error) {
        console.error('Base creation error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update base
router.put('/:id', authenticate, authorize(['admin', 'base_commander']), async (req, res) => {
    try {
        const base = await Base.findById(req.params.id);
        if (!base) {
            return res.status(404).json({ message: 'Base not found' });
        }

        // If user is base commander
        if (req.user.role === 'base_commander') {
            // If commander has no base assigned, assign this base to them
            if (!req.user.base) {
                // Check if base already has a commander
                const existingCommander = await User.findOne({
                    role: 'base_commander',
                    base: base._id,
                    _id: { $ne: req.user._id }
                });

                if (existingCommander) {
                    return res.status(403).json({ message: 'This base already has a commander assigned' });
                }

                // Assign base to commander
                req.user.base = base._id;
                req.user.assignedBases = [base._id];
                req.user.primaryBase = base._id;
                await req.user.save();
            } else {
                // If commander has a base, verify it's the same base
                const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
                if (base._id.toString() !== userBaseId.toString()) {
                    return res.status(403).json({ message: 'You can only update your assigned base' });
                }
            }
        }

        const updatedBase = await Base.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedBase) {
            return res.status(404).json({ message: 'Failed to update base' });
        }

        res.json(updatedBase);
    } catch (error) {
        console.error('Error updating base:', error);
        res.status(400).json({
            message: 'Error updating base',
            error: error.message
        });
    }
});

// Delete base
router.delete('/:id', authenticate, authorize(['admin', 'base_commander']), async (req, res) => {
    try {
        const base = await Base.findById(req.params.id);
        if (!base) {
            return res.status(404).json({ message: 'Base not found' });
        }

        // If user is base commander
        if (req.user.role === 'base_commander') {
            // Verify they can only delete their own base
            const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
            if (!userBaseId || base._id.toString() !== userBaseId.toString()) {
                return res.status(403).json({ message: 'You can only delete your assigned base' });
            }

            // Remove base assignment from commander
            req.user.base = null;
            req.user.assignedBases = [];
            req.user.primaryBase = null;
            await req.user.save();
        }

        // Delete the base
        await base.deleteOne();
        res.json({ message: 'Base deleted successfully' });
    } catch (error) {
        console.error('Error deleting base:', error);
        res.status(500).json({
            message: 'Error deleting base',
            error: error.message
        });
    }
});

module.exports = router; 