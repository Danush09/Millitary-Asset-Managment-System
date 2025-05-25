const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Transfer = require('../models/Transfer');
const Asset = require('../models/Asset');
const { authenticate, isAdmin, isBaseCommander, isLogisticsOfficer, canManageBase, canManageAssets } = require('../middleware/auth');
const { validateBaseAccess } = require('../middleware/baseAccess');
const Base = require('../models/Base');

// Debug middleware
router.use((req, res, next) => {
    console.log('Transfer route accessed:', {
        method: req.method,
        path: req.path,
        body: req.body,
        headers: req.headers,
        user: req.user
    });
    next();
});

// Helper function to generate transfer number
const generateTransferNumber = () => {
    return `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};

// Get all transfers
router.get('/', authenticate, async (req, res) => {
    try {
        const query = {};

        // Apply role-based filtering
        if (req.user.role === 'base_commander') {
            const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
            query.$or = [
                { fromBase: userBaseId },
                { toBase: userBaseId }
            ];
        }

        const transfers = await Transfer.find(query)
            .populate('fromBase', 'name')
            .populate('toBase', 'name')
            .populate('asset', 'name serialNumber')
            .populate('initiatedBy', 'fullName')
            .populate('approvedBy', 'fullName');
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get transfers by base
router.get('/base/:baseId', authenticate, canManageBase, async (req, res) => {
    try {
        const transfers = await Transfer.find({
            $or: [
                { fromBase: req.params.baseId },
                { toBase: req.params.baseId }
            ]
        })
            .populate('fromBase', 'name')
            .populate('toBase', 'name')
            .populate('asset', 'name serialNumber')
            .populate('initiatedBy', 'fullName')
            .populate('approvedBy', 'fullName');
        res.json(transfers);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new transfer request
router.post('/', authenticate, async (req, res) => {
    try {
        const { assetId, fromBase, toBase, quantity, reason, transferDate } = req.body;

        // Validate base access
        if (req.user.role === 'base_commander') {
            const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
            if (fromBase !== userBaseId.toString()) {
                return res.status(403).json({ message: 'You can only create transfers from your base' });
            }
        }

        // Check if asset exists and is available
        const asset = await Asset.findById(assetId);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        if (asset.quantity < quantity) {
            return res.status(400).json({ message: 'Insufficient quantity available' });
        }

        const transfer = new Transfer({
            asset: assetId,
            fromBase,
            toBase,
            quantity,
            reason,
            transferDate: transferDate || new Date(), // Use provided date or current date
            initiatedBy: req.user._id,
            status: 'pending',
            transferNumber: generateTransferNumber()
        });

        await transfer.save();
        res.status(201).json(transfer);
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({
            message: 'Error creating transfer',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Approve transfer request
router.put('/:id/approve', authenticate, canManageAssets, async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        if (transfer.status !== 'pending') {
            return res.status(400).json({ message: 'Transfer is not pending approval' });
        }

        // Update asset quantities
        const asset = await Asset.findById(transfer.asset);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        asset.quantity -= transfer.quantity;
        await asset.save();

        // Create new asset at destination base
        const newAsset = new Asset({
            ...asset.toObject(),
            _id: undefined,
            base: transfer.toBase,
            quantity: transfer.quantity,
            lastUpdatedBy: req.user._id
        });
        await newAsset.save();

        // Update transfer status
        transfer.status = 'approved';
        transfer.approvedBy = req.user._id;
        transfer.approvedAt = new Date();
        await transfer.save();

        res.json(transfer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Reject transfer request
router.put('/:id/reject', authenticate, canManageAssets, async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        if (transfer.status !== 'pending') {
            return res.status(400).json({ message: 'Transfer is not pending approval' });
        }

        transfer.status = 'rejected';
        transfer.rejectedBy = req.user._id;
        transfer.rejectedAt = new Date();
        transfer.rejectionReason = req.body.reason;
        await transfer.save();

        res.json(transfer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get transfer by ID
router.get('/:id', authenticate, canManageAssets, async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id)
            .populate('fromBase', 'name')
            .populate('toBase', 'name')
            .populate('asset', 'name serialNumber')
            .populate('initiatedBy', 'fullName')
            .populate('approvedBy', 'fullName');

        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        res.json(transfer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update transfer status
router.patch('/:id/status', authenticate, async (req, res) => {
    try {
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const transfer = await Transfer.findById(req.params.id)
            .populate('asset', 'name serialNumber type quantity')
            .populate('fromBase', 'name location')
            .populate('toBase', 'name location');

        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        // Validate status transition
        const validTransitions = {
            pending: ['in_transit', 'cancelled'],
            in_transit: ['completed', 'cancelled'],
            completed: [],
            cancelled: []
        };

        if (!validTransitions[transfer.status].includes(status)) {
            return res.status(400).json({
                message: `Cannot transition from ${transfer.status} to ${status}`
            });
        }

        // Validate base access
        if (req.user.role === 'base_commander') {
            const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
            if (status === 'in_transit' && transfer.fromBase._id.toString() !== userBaseId.toString()) {
                return res.status(403).json({ message: 'Only source base can mark as in transit' });
            }
            if (status === 'completed' && transfer.toBase._id.toString() !== userBaseId.toString()) {
                return res.status(403).json({ message: 'Only destination base can complete transfer' });
            }
            if (status === 'cancelled' &&
                transfer.fromBase._id.toString() !== userBaseId.toString() &&
                transfer.toBase._id.toString() !== userBaseId.toString()) {
                return res.status(403).json({ message: 'Only source or destination base can cancel transfer' });
            }
        }

        // Update status and handle asset movement
        const asset = await Asset.findById(transfer.asset._id);

        if (status === 'in_transit') {
            transfer.status = 'in_transit';
            transfer.inTransitDate = new Date();
        } else if (status === 'completed') {
            transfer.status = 'completed';
            transfer.completedDate = new Date();
            transfer.approvedBy = req.user._id;

            // Update asset base and record movement
            asset.base = transfer.toBase._id;
            await asset.addMovement({
                date: new Date(),
                type: 'transfer',
                quantity: transfer.quantity,
                reference: transfer._id,
                referenceModel: 'Transfer',
                notes: `Transfer completed from ${transfer.fromBase.name}`
            });
        } else if (status === 'cancelled') {
            transfer.status = 'cancelled';
            transfer.cancelledDate = new Date();

            // Reverse the initial movement
            await asset.addMovement({
                date: new Date(),
                type: 'transfer',
                quantity: transfer.quantity,
                reference: transfer._id,
                referenceModel: 'Transfer',
                notes: 'Transfer cancelled - quantity restored'
            });
        }

        await Promise.all([transfer.save(), asset.save()]);

        // Fetch updated transfer
        const updatedTransfer = await Transfer.findById(transfer._id)
            .populate('asset', 'name serialNumber type quantity')
            .populate('fromBase', 'name location')
            .populate('toBase', 'name location')
            .populate('initiatedBy', 'fullName')
            .populate('approvedBy', 'fullName');

        res.json(updatedTransfer);
    } catch (error) {
        console.error('Error updating transfer status:', error);
        res.status(500).json({
            message: 'Error updating transfer status',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Update transfer (only notes and transfer date)
router.put('/:id', authenticate, canManageAssets, async (req, res) => {
    try {
        const { notes, transferDate } = req.body;
        const transfer = await Transfer.findById(req.params.id);

        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        // Validate base access for base commanders
        if (req.user.role === 'base_commander') {
            const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
            if (transfer.fromBase.toString() !== userBaseId.toString()) {
                return res.status(403).json({ message: 'You can only update transfers from your base' });
            }
        }

        // Only allow updating notes and transfer date
        if (notes !== undefined) transfer.notes = notes;
        if (transferDate !== undefined) transfer.transferDate = transferDate;

        await transfer.save();

        // Fetch updated transfer
        const updatedTransfer = await Transfer.findById(transfer._id)
            .populate('asset', 'name serialNumber type quantity')
            .populate('fromBase', 'name location')
            .populate('toBase', 'name location')
            .populate('initiatedBy', 'fullName')
            .populate('approvedBy', 'fullName');

        res.json(updatedTransfer);
    } catch (error) {
        console.error('Error updating transfer:', error);
        res.status(500).json({ message: 'Error updating transfer', error: error.message });
    }
});

// Delete transfer (only for pending transfers)
router.delete('/:id', authenticate, canManageAssets, async (req, res) => {
    try {
        const transfer = await Transfer.findById(req.params.id);

        if (!transfer) {
            return res.status(404).json({ message: 'Transfer not found' });
        }

        // Only allow deletion of pending transfers
        if (transfer.status !== 'pending') {
            return res.status(400).json({ message: 'Only pending transfers can be deleted' });
        }

        // Validate base access for base commanders
        if (req.user.role === 'base_commander') {
            const userBaseId = typeof req.user.base === 'object' ? req.user.base._id : req.user.base;
            if (transfer.fromBase.toString() !== userBaseId.toString()) {
                return res.status(403).json({ message: 'You can only delete transfers from your base' });
            }
        }

        // Reverse the initial movement
        const asset = await Asset.findById(transfer.asset);
        if (asset) {
            await asset.addMovement({
                date: new Date(),
                type: 'transfer',
                quantity: transfer.quantity,
                reference: transfer._id,
                referenceModel: 'Transfer',
                notes: 'Transfer deleted - quantity restored'
            });
        }

        await transfer.deleteOne();
        res.json({ message: 'Transfer deleted successfully' });
    } catch (error) {
        console.error('Error deleting transfer:', error);
        res.status(500).json({ message: 'Error deleting transfer', error: error.message });
    }
});

module.exports = router; 