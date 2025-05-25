const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Asset = require('../models/Asset');
const { authenticate, isAdmin, isBaseCommander, canManageBase, canManageAssets } = require('../middleware/auth');
const { validateBaseAccess } = require('../middleware/baseAccess');

// Get all assets
router.get('/', authenticate, async (req, res) => {
    try {
        const query = {};

        // Apply filters
        if (req.query.status) {
            query.status = req.query.status.toLowerCase();
        }
        if (req.query.type) {
            query.type = req.query.type;
        }
        if (req.query.base) {
            query.base = req.query.base;
        }
        if (req.query.search) {
            query.$or = [
                { name: { $regex: req.query.search, $options: 'i' } },
                { serialNumber: { $regex: req.query.search, $options: 'i' } },
                { description: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Add quantity filter if specified
        if (req.query.minQuantity) {
            query.quantity = { $gte: parseInt(req.query.minQuantity) };
        }
        if (req.query.maxQuantity) {
            query.quantity = { ...query.quantity, $lte: parseInt(req.query.maxQuantity) };
        }

        // Add date filters if specified
        if (req.query.startDate || req.query.endDate) {
            query.lastMaintenanceDate = {};
            if (req.query.startDate) {
                query.lastMaintenanceDate.$gte = new Date(req.query.startDate);
            }
            if (req.query.endDate) {
                query.lastMaintenanceDate.$lte = new Date(req.query.endDate);
            }
        }

        console.log('Asset query:', query); // Debug log

        const assets = await Asset.find(query)
            .populate('base', 'name')
            .populate('createdBy', 'fullName')
            .populate('updatedBy', 'fullName')
            .sort({ createdAt: -1 });

        console.log('Found assets:', assets.length); // Debug log

        res.json(assets);
    } catch (error) {
        console.error('Error fetching assets:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get assets by base
router.get('/base/:baseId', authenticate, canManageBase, async (req, res) => {
    try {
        const assets = await Asset.find({ base: req.params.baseId })
            .populate('base', 'name')
            .populate('createdBy', 'fullName')
            .populate('updatedBy', 'fullName');
        res.json(assets);
    } catch (error) {
        console.error('Error fetching assets by base:', error);
        res.status(500).json({
            message: 'Error fetching assets by base',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Get asset metrics
router.get('/metrics', authenticate, async (req, res) => {
    try {
        console.log('Fetching metrics...');

        // Get total assets count
        const totalAssets = await Asset.countDocuments();
        console.log('Total assets:', totalAssets);

        // Get assigned assets count
        const assignedAssets = await Asset.countDocuments({ status: 'assigned' });
        console.log('Assigned assets:', assignedAssets);

        // Get expended assets count
        const expendedAssets = await Asset.countDocuments({ status: 'expended' });
        console.log('Expended assets:', expendedAssets);

        // Calculate opening balance (total assets at start of month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const openingBalance = await Asset.countDocuments({
            createdAt: { $lt: startOfMonth }
        });
        console.log('Opening balance:', openingBalance);

        // Calculate closing balance (total assets now)
        const closingBalance = totalAssets;
        console.log('Closing balance:', closingBalance);

        // Calculate net movement
        const netMovement = closingBalance - openingBalance;
        console.log('Net movement:', netMovement);

        const metrics = {
            openingBalance: openingBalance || 0,
            closingBalance: closingBalance || 0,
            netMovement: netMovement || 0,
            assigned: assignedAssets || 0,
            expended: expendedAssets || 0
        };

        console.log('Sending metrics:', metrics);
        res.json(metrics);
    } catch (error) {
        console.error('Error fetching asset metrics:', error);
        res.status(500).json({
            message: 'Error fetching asset metrics',
            error: error.message,
            stack: error.stack
        });
    }
});

// Get asset movement overview
router.get('/movement-overview', authenticate, async (req, res) => {
    try {
        console.log('Fetching movement overview...');

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const months = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            months.unshift({
                name: date.toLocaleString('default', { month: 'short' }),
                startDate: new Date(date.getFullYear(), date.getMonth(), 1),
                endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0)
            });
        }

        const movementData = await Promise.all(months.map(async (month) => {
            try {
                const purchases = await Asset.countDocuments({
                    type: 'purchase',
                    createdAt: {
                        $gte: month.startDate,
                        $lte: month.endDate
                    }
                });

                const transfersIn = await Asset.countDocuments({
                    type: 'transfer',
                    transferType: 'in',
                    createdAt: {
                        $gte: month.startDate,
                        $lte: month.endDate
                    }
                });

                const transfersOut = await Asset.countDocuments({
                    type: 'transfer',
                    transferType: 'out',
                    createdAt: {
                        $gte: month.startDate,
                        $lte: month.endDate
                    }
                });

                return {
                    name: month.name,
                    purchases: purchases || 0,
                    transfersIn: transfersIn || 0,
                    transfersOut: transfersOut || 0
                };
            } catch (error) {
                console.error('Error fetching data for month:', month.name, error);
                return {
                    name: month.name,
                    purchases: 0,
                    transfersIn: 0,
                    transfersOut: 0
                };
            }
        }));

        console.log('Sending movement data:', movementData);
        res.json(movementData);
    } catch (error) {
        console.error('Error fetching movement overview:', error);
        res.status(500).json({
            message: 'Error fetching movement overview',
            error: error.message,
            stack: error.stack
        });
    }
});

// Get aggregated metrics for all assets
router.get('/metrics/summary', authenticate, async (req, res) => {
    try {
        const query = {};
        if (req.query.base) {
            query.base = req.query.base;
            // Validate base access
            if (!await validateBaseAccess(req.user, req.query.base)) {
                return res.status(403).json({ message: 'Access denied to this base' });
            }
        }

        const assets = await Asset.find(query);

        const summary = {
            totalAssets: assets.length,
            totalQuantity: assets.reduce((sum, asset) => sum + asset.quantity, 0),
            totalValue: assets.reduce((sum, asset) => sum + (asset.purchaseDetails?.cost || 0) * asset.quantity, 0),
            byType: {},
            byStatus: {},
            byBase: {}
        };

        assets.forEach(asset => {
            // Aggregate by type
            summary.byType[asset.type] = (summary.byType[asset.type] || 0) + asset.quantity;

            // Aggregate by status
            summary.byStatus[asset.status] = (summary.byStatus[asset.status] || 0) + asset.quantity;

            // Aggregate by base
            const baseId = asset.base.toString();
            if (!summary.byBase[baseId]) {
                summary.byBase[baseId] = {
                    name: asset.base.name,
                    total: 0,
                    byType: {},
                    byStatus: {}
                };
            }
            summary.byBase[baseId].total += asset.quantity;
            summary.byBase[baseId].byType[asset.type] = (summary.byBase[baseId].byType[asset.type] || 0) + asset.quantity;
            summary.byBase[baseId].byStatus[asset.status] = (summary.byBase[baseId].byStatus[asset.status] || 0) + asset.quantity;
        });

        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get asset by ID
router.get('/:id', authenticate, canManageAssets, async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id)
            .populate('base', 'name')
            .populate('createdBy', 'fullName')
            .populate('updatedBy', 'fullName');

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Check if user has permission to access this asset's base
        if (!req.user.canManageBase(asset.base)) {
            return res.status(403).json({ message: 'You do not have permission to access assets in this base' });
        }

        res.json(asset);
    } catch (error) {
        console.error('Error fetching asset:', error);
        res.status(500).json({
            message: 'Error fetching asset',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Create new asset
router.post('/', authenticate, canManageAssets, async (req, res) => {
    try {
        console.log('Creating asset with data:', req.body);
        const asset = new Asset({
            ...req.body,
            lastUpdatedBy: req.user._id,
            createdBy: req.user._id
        });
        await asset.save();
        res.status(201).json(asset);
    } catch (error) {
        console.error('Error creating asset:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Validation Error',
                errors: Object.keys(error.errors).reduce((acc, key) => {
                    acc[key] = error.errors[key].message;
                    return acc;
                }, {})
            });
        }
        res.status(500).json({ message: error.message });
    }
});

// Update asset
router.put('/:id', authenticate, canManageAssets, async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        Object.assign(asset, {
            ...req.body,
            lastUpdatedBy: req.user._id
        });
        await asset.save();
        res.json(asset);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete asset
router.delete('/:id', authenticate, canManageAssets, async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Check if user has permission to manage this asset's base
        if (!req.user.canManageBase(asset.base)) {
            return res.status(403).json({ message: 'You do not have permission to delete assets in this base' });
        }

        await asset.deleteOne();
        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        console.error('Error deleting asset:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get asset movement history
router.get('/:id/movements', authenticate, async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Validate base access
        if (!await validateBaseAccess(req.user, asset.base)) {
            return res.status(403).json({ message: 'Access denied to this base' });
        }

        const movements = asset.getMovementHistory(req.query.startDate, req.query.endDate);
        res.json(movements);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get asset tracking metrics
router.get('/:id/metrics', authenticate, async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);
        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        // Validate base access
        if (!await validateBaseAccess(req.user, asset.base)) {
            return res.status(403).json({ message: 'Access denied to this base' });
        }

        const metrics = asset.calculatePeriodMetrics(req.query.startDate, req.query.endDate);
        res.json(metrics);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all asset types
router.get('/types', authenticate, (req, res) => {
    // Asset type enum is defined in the schema
    const types = Asset.schema.path('type').enumValues;
    res.json(types.map(type => ({
        _id: type,
        name: type.charAt(0).toUpperCase() + type.slice(1)
    })));
});

module.exports = router; 