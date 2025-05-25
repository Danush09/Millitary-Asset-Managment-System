const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Asset = require('../models/Asset');
const { authenticate, authorize } = require('../middleware/auth');
const { validateBaseAccess } = require('../middleware/baseAccess');

// Generate unique assignment number
const generateAssignmentNumber = async () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Get count of assignments for today
    const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const count = await Assignment.countDocuments({
        assignmentDate: { $gte: today }
    });

    // Format: ASN-YYMMDD-XXX (where XXX is a sequential number)
    return `ASN-${year}${month}${day}-${(count + 1).toString().padStart(3, '0')}`;
};

// Get all assignments
router.get('/', authenticate, async (req, res) => {
    try {
        const query = {};

        // Apply filters
        if (req.query.status) query.status = req.query.status;
        if (req.query.startDate || req.query.endDate) {
            query.assignmentDate = {};
            if (req.query.startDate) query.assignmentDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) query.assignmentDate.$lte = new Date(req.query.endDate);
        }

        // Base access restrictions - only apply if base is specified in query
        if (req.query.base) {
            query.base = req.query.base;
        }

        const assignments = await Assignment.find(query)
            .populate('asset', 'name serialNumber type')
            .populate('assignedTo', 'fullName')
            .populate('assignedBy', 'fullName')
            .populate('base', 'name')
            .sort({ assignmentDate: -1 });

        res.json(assignments);
    } catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get assignment by ID
router.get('/:id', authenticate, async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('asset', 'name serialNumber type')
            .populate('assignedTo', 'fullName')
            .populate('assignedBy', 'fullName')
            .populate('base', 'name');

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Validate base access
        if (!await validateBaseAccess(req.user, assignment.base)) {
            return res.status(403).json({ message: 'Access denied to this base' });
        }

        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new assignment
router.post('/', authenticate, authorize(['admin', 'base_commander', 'logistics_officer']), async (req, res) => {
    try {
        // Validate base access for base commanders
        if (req.user.role === 'base_commander') {
            // If base commander has a base assigned, ensure they can only create assignments for their base
            if (req.user.base) {
                const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
                if (req.body.base && req.body.base !== userBaseId.toString()) {
                    return res.status(403).json({ message: 'You can only create assignments for your assigned base' });
                }
            }
        }

        // Check asset availability
        const asset = await Asset.findById(req.body.asset);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Validate quantity
        if (asset.quantity < req.body.quantity) {
            return res.status(400).json({
                message: `Insufficient quantity available. Requested: ${req.body.quantity}, Available: ${asset.quantity}`
            });
        }

        // Generate assignment number
        const assignmentNumber = await generateAssignmentNumber();

        const assignment = new Assignment({
            ...req.body,
            status: 'active',
            assignedBy: req.user._id,
            assignmentNumber
        });

        // Save assignment first
        const savedAssignment = await assignment.save();

        // Update asset quantity and record movement
        asset.quantity -= req.body.quantity;
        await asset.addMovement({
            date: new Date(),
            type: 'assignment',
            quantity: -req.body.quantity,
            reference: savedAssignment._id,
            referenceModel: 'Assignment',
            notes: `Assigned to ${assignment.assignedTo.fullName}`
        });

        // Fetch the saved assignment with populated fields
        const populatedAssignment = await Assignment.findById(savedAssignment._id)
            .populate('asset', 'name serialNumber type')
            .populate('assignedTo', 'fullName')
            .populate('assignedBy', 'fullName')
            .populate('base', 'name');

        res.status(201).json(populatedAssignment);
    } catch (error) {
        console.error('Error creating assignment:', error);
        res.status(400).json({
            message: 'Error creating assignment',
            error: error.message
        });
    }
});

// Return asset
router.patch('/:id/return', authenticate, authorize(['admin', 'logistics_officer']), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Validate base access
        if (!await validateBaseAccess(req.user, assignment.base)) {
            return res.status(403).json({ message: 'Access denied to this base' });
        }

        if (assignment.status !== 'active') {
            return res.status(400).json({ message: 'Assignment is not active' });
        }

        const asset = await Asset.findById(assignment.asset);

        // Update assignment
        assignment.status = 'returned';
        assignment.returnDate = new Date();
        await assignment.save();

        // Record movement in asset history
        await asset.addMovement({
            date: new Date(),
            type: 'return',
            quantity: assignment.quantity,
            reference: assignment._id,
            referenceModel: 'Assignment',
            notes: `Returned by ${assignment.assignedTo.fullName}`
        });

        res.json(assignment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update assignment status
router.patch('/:id/status', authenticate, authorize(['admin', 'logistics_officer']), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Validate base access
        if (!await validateBaseAccess(req.user, assignment.base)) {
            return res.status(403).json({ message: 'Access denied to this base' });
        }

        // Validate status transition
        const validTransitions = {
            active: ['returned', 'lost', 'damaged'],
            returned: [],
            lost: [],
            damaged: []
        };

        if (!validTransitions[assignment.status].includes(req.body.status)) {
            return res.status(400).json({ message: 'Invalid status transition' });
        }

        const asset = await Asset.findById(assignment.asset);

        // Handle status update
        if (req.body.status === 'returned') {
            assignment.status = 'returned';
            assignment.returnDate = new Date();

            // Record return movement
            await asset.addMovement({
                date: new Date(),
                type: 'return',
                quantity: assignment.quantity,
                reference: assignment._id,
                referenceModel: 'Assignment',
                notes: `Returned by ${assignment.assignedTo.fullName}`
            });
        } else if (req.body.status === 'lost' || req.body.status === 'damaged') {
            assignment.status = req.body.status;
            assignment.returnDate = new Date();

            // Record loss/damage movement
            await asset.addMovement({
                date: new Date(),
                type: 'adjustment',
                quantity: -assignment.quantity,
                reference: assignment._id,
                referenceModel: 'Assignment',
                notes: `Asset ${req.body.status} - written off`
            });
        }

        await assignment.save();
        await asset.save();

        res.json(assignment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update assignment
router.put('/:id', authenticate, authorize(['admin', 'base_commander', 'logistics_officer']), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('base', '_id name')
            .populate('asset', '_id name quantity');

        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check asset availability if quantity is being changed
        if (req.body.quantity && req.body.quantity !== assignment.quantity) {
            const asset = await Asset.findById(assignment.asset._id);
            if (!asset) {
                return res.status(404).json({ message: 'Asset not found' });
            }

            const quantityDifference = assignment.quantity - req.body.quantity;
            if (asset.quantity + quantityDifference < 0) {
                return res.status(400).json({ message: 'Insufficient asset quantity' });
            }

            // Record movement in asset history
            await asset.addMovement({
                date: new Date(),
                type: 'adjustment',
                quantity: quantityDifference,
                reference: assignment._id,
                referenceModel: 'Assignment',
                notes: `Quantity adjusted from ${assignment.quantity} to ${req.body.quantity}`
            });
        }

        // Update assignment
        Object.assign(assignment, req.body);
        await assignment.save();

        // Fetch updated assignment with populated fields
        const updatedAssignment = await Assignment.findById(assignment._id)
            .populate('asset', 'name serialNumber type')
            .populate('assignedTo', 'fullName')
            .populate('assignedBy', 'fullName')
            .populate('base', 'name');

        res.json(updatedAssignment);
    } catch (error) {
        console.error('Error updating assignment:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get assignment metrics
router.get('/metrics/summary', authenticate, async (req, res) => {
    try {
        const query = {};
        if (req.query.startDate || req.query.endDate) {
            query.assignmentDate = {};
            if (req.query.startDate) query.assignmentDate.$gte = new Date(req.query.startDate);
            if (req.query.endDate) query.assignmentDate.$lte = new Date(req.query.endDate);
        }

        // Base access restrictions
        if (req.user.role !== 'admin') {
            query.base = req.user.base;
        } else if (req.query.base) {
            query.base = req.query.base;
        }

        const assignments = await Assignment.find(query)
            .populate('base', 'name')
            .populate('assignedTo', 'fullName');

        const summary = {
            totalAssignments: assignments.length,
            totalQuantity: assignments.reduce((sum, a) => sum + (a.quantity || 0), 0),
            byStatus: {},
            byBase: {},
            byPersonnel: {}
        };

        assignments.forEach(assignment => {
            // Aggregate by status
            summary.byStatus[assignment.status] = (summary.byStatus[assignment.status] || 0) + 1;

            // Aggregate by base
            if (assignment.base) {
                const baseId = assignment.base._id.toString();
                if (!summary.byBase[baseId]) {
                    summary.byBase[baseId] = {
                        name: assignment.base.name || 'Unknown Base',
                        total: 0,
                        active: 0,
                        returned: 0
                    };
                }
                summary.byBase[baseId].total += (assignment.quantity || 0);
                if (assignment.status === 'active') {
                    summary.byBase[baseId].active += (assignment.quantity || 0);
                } else if (assignment.status === 'returned') {
                    summary.byBase[baseId].returned += (assignment.quantity || 0);
                }
            }

            // Aggregate by personnel
            if (assignment.assignedTo) {
                const personnelId = assignment.assignedTo._id.toString();
                if (!summary.byPersonnel[personnelId]) {
                    summary.byPersonnel[personnelId] = {
                        name: assignment.assignedTo.fullName || 'Unknown Personnel',
                        total: 0,
                        active: 0
                    };
                }
                summary.byPersonnel[personnelId].total += (assignment.quantity || 0);
                if (assignment.status === 'active') {
                    summary.byPersonnel[personnelId].active += (assignment.quantity || 0);
                }
            }
        });

        res.json(summary);
    } catch (error) {
        console.error('Error fetching assignment metrics:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete assignment
router.delete('/:id', authenticate, authorize(['admin', 'base_commander', 'logistics_officer']), async (req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Get the asset and restore its quantity
        const asset = await Asset.findById(assignment.asset);
        if (asset) {
            // Record movement in asset history
            await asset.addMovement({
                date: new Date(),
                type: 'adjustment',
                quantity: assignment.quantity,
                reference: assignment._id,
                referenceModel: 'Assignment',
                notes: `Assignment deleted - quantity restored`
            });
        }

        // Delete the assignment
        await assignment.deleteOne();

        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router; 