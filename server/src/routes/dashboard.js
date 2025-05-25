const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/auth');
const Asset = require('../models/Asset');
const Assignment = require('../models/Assignment');
const Transfer = require('../models/Transfer');
const Purchase = require('../models/Purchase');
const Base = require('../models/Base');

// This file provides /dashboard/metrics and other dashboard endpoints

// Get dashboard stats
router.get('/stats', authenticate, async (req, res) => {
    try {
        const [totalAssets, activeAssignments, pendingTransfers, scheduledMaintenance] = await Promise.all([
            Asset.countDocuments(),
            Assignment.countDocuments({ status: 'active' }),
            Transfer.countDocuments({ status: 'pending' }),
            Asset.countDocuments({ 'maintenance.scheduled': true })
        ]);

        res.json({
            totalAssets,
            activeAssignments,
            pendingTransfers,
            scheduledMaintenance
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ message: 'Error fetching dashboard stats' });
    }
});

// Get recent activities
router.get('/activities', authenticate, async (req, res) => {
    try {
        const recentActivities = await Promise.all([
            // Get recent assignments
            Assignment.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('asset', 'name')
                .populate('assignedTo', 'fullName')
                .then(assignments => assignments.map(a => ({
                    _id: a._id,
                    type: 'assignment',
                    title: `Asset ${a.asset.name} assigned to ${a.assignedTo.fullName}`,
                    timestamp: a.createdAt,
                    link: `/assignments/${a._id}`
                }))),

            // Get recent transfers
            Transfer.find()
                .sort({ createdAt: -1 })
                .limit(5)
                .populate('asset', 'name')
                .populate('fromBase', 'name')
                .populate('toBase', 'name')
                .then(transfers => transfers.map(t => ({
                    _id: t._id,
                    type: 'transfer',
                    title: `Asset ${t.asset.name} transferred from ${t.fromBase.name} to ${t.toBase.name}`,
                    timestamp: t.createdAt,
                    link: `/transfers/${t._id}`
                })))
        ]);

        // Combine and sort all activities
        const allActivities = recentActivities.flat()
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);

        res.json(allActivities);
    } catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({ message: 'Error fetching recent activities' });
    }
});

// Get dashboard metrics
router.get('/metrics', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, base, type } = req.query;
        const query = {};

        // Add date range filter
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Add type filter if provided
        if (type) {
            query.type = type;
        }

        // Base filter based on user role
        if (req.user.role === 'admin') {
            // Admin can see all bases or filter by specific base
            if (base) {
                query.base = base;
            }
        } else if (req.user.role === 'base_commander') {
            // Base commander can only see their base
            query.base = req.user.base;
        } else if (req.user.role === 'logistics_officer') {
            // Logistics officer can see their assigned bases
            if (base) {
                // If specific base is requested, check if they have access
                if (!req.user.hasAccessToBase(base)) {
                    return res.status(403).json({ message: 'Access denied to this base' });
                }
                query.base = base;
            } else {
                // If no specific base, show all their assigned bases
                query.base = { $in: req.user.assignedBases };
            }
        }

        // Get opening balance (sum of all assets before start date)
        const openingBalanceQuery = {};

        // Add type filter if provided
        if (type) {
            openingBalanceQuery.type = type;
        }

        // Add base filter if provided and user is admin
        if (base && req.user.role === 'admin') {
            openingBalanceQuery.base = base;
        }

        // Add date condition for opening balance
        const startOfPeriod = startDate ? new Date(startDate) : new Date();
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);
        openingBalanceQuery.createdAt = { $lt: startOfPeriod };

        console.log('Opening Balance Query:', openingBalanceQuery);
        console.log('Start of Period:', startOfPeriod);

        const openingBalance = await Asset.countDocuments(openingBalanceQuery);
        console.log('Opening Balance Result:', openingBalance);

        // Get closing balance (sum of all assets at end date)
        const closingBalanceQuery = { ...query };
        if (endDate) {
            closingBalanceQuery.createdAt = { $lte: new Date(endDate) };
        }
        const closingBalanceResult = await Asset.aggregate([
            { $match: closingBalanceQuery },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 }
                }
            }
        ]);
        const closingBalance = closingBalanceResult.length > 0 ? closingBalanceResult[0].total : 0;

        // Purchases in period
        const purchaseQuery = {};
        if (type) {
            purchaseQuery.type = type;
        }
        if (base && req.user.role === 'admin') {
            purchaseQuery.base = base;
        }
        purchaseQuery.purchaseDate = {
            $gte: startOfPeriod,
            $lte: endDate ? new Date(endDate) : new Date()
        };
        console.log('Purchase Query:', purchaseQuery);
        const purchases = await Purchase.countDocuments(purchaseQuery);
        console.log('Purchases Result:', purchases);

        // Transfers In in period
        const transferInQuery = {};
        if (type) {
            transferInQuery.type = type;
        }
        if (base && req.user.role === 'admin') {
            transferInQuery.toBase = base;
        } else if (req.user.role === 'base_commander') {
            transferInQuery.toBase = req.user.base;
        } else if (req.user.role === 'logistics_officer') {
            transferInQuery.toBase = { $in: req.user.assignedBases };
        }
        transferInQuery.transferDate = {
            $gte: startOfPeriod,
            $lte: endDate ? new Date(endDate) : new Date()
        };
        console.log('Transfer In Query:', transferInQuery);
        const transfersIn = await Transfer.countDocuments(transferInQuery);
        console.log('Transfers In Result:', transfersIn);

        // Transfers Out in period
        const transferOutQuery = {};
        if (type) {
            transferOutQuery.type = type;
        }
        if (base && req.user.role === 'admin') {
            transferOutQuery.fromBase = base;
        } else if (req.user.role === 'base_commander') {
            transferOutQuery.fromBase = req.user.base;
        } else if (req.user.role === 'logistics_officer') {
            transferOutQuery.fromBase = { $in: req.user.assignedBases };
        }
        transferOutQuery.transferDate = {
            $gte: startOfPeriod,
            $lte: endDate ? new Date(endDate) : new Date()
        };
        console.log('Transfer Out Query:', transferOutQuery);
        const transfersOut = await Transfer.countDocuments(transferOutQuery);
        console.log('Transfers Out Result:', transfersOut);

        // Calculate Net Movement
        const netMovement = purchases + transfersIn - transfersOut;

        // Get assigned assets count
        const assignedAssetsResult = await Asset.aggregate([
            { $match: { ...query, status: 'assigned' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 }
                }
            }
        ]);
        const assignedAssets = assignedAssetsResult.length > 0 ? assignedAssetsResult[0].total : 0;

        // Get expended assets count
        const expendedAssetsResult = await Asset.aggregate([
            { $match: { ...query, status: 'expended' } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 }
                }
            }
        ]);
        const expendedAssets = expendedAssetsResult.length > 0 ? expendedAssetsResult[0].total : 0;

        // Get base-wise breakdown for admin
        let baseBreakdown = [];
        if (req.user.role === 'admin') {
            baseBreakdown = await Asset.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$base',
                        total: { $sum: 1 },
                        assigned: {
                            $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] }
                        },
                        expended: {
                            $sum: { $cond: [{ $eq: ['$status', 'expended'] }, 1, 0] }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'bases',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'baseInfo'
                    }
                },
                {
                    $unwind: '$baseInfo'
                },
                {
                    $project: {
                        baseName: '$baseInfo.name',
                        total: 1,
                        assigned: 1,
                        expended: 1
                    }
                }
            ]);
        }

        res.json({
            openingBalance,
            closingBalance,
            netMovement,
            assignedAssets,
            expendedAssets,
            purchases,
            transfersIn,
            transfersOut,
            baseBreakdown: req.user.role === 'admin' ? baseBreakdown : undefined
        });
    } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
        res.status(500).json({ message: 'Error fetching dashboard metrics' });
    }
});

// Get dashboard data
router.get('/', authenticate, async (req, res) => {
    try {
        const { startDate, endDate, base, type } = req.query;
        const query = {};

        // Add date range filter
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Add type filter if provided
        if (type) {
            query.type = type;
        }

        // Base filter based on user role
        if (req.user.role === 'admin') {
            // Admin can see all bases or filter by specific base
            if (base) {
                query.base = base;
            }
        }

        // Get user role and base information
        const userInfo = {
            role: req.user.role,
            fullName: req.user.fullName,
            base: req.user.base ? await Base.findById(req.user.base).select('name') : null
        };

        // Get counts
        const counts = {
            assets: await Asset.countDocuments(query),
            transfers: await Transfer.countDocuments(query),
            assignments: await Assignment.countDocuments(query),
            bases: await Base.countDocuments()
        };

        // Calculate asset metrics
        const startOfPeriod = startDate ? new Date(startDate) : new Date();
        startOfPeriod.setDate(1);
        startOfPeriod.setHours(0, 0, 0, 0);

        const endOfPeriod = endDate ? new Date(endDate) : new Date();
        endOfPeriod.setHours(23, 59, 59, 999);

        // Opening Balance (total assets at start of period)
        const openingBalanceQuery = {};

        // Add type filter if provided
        if (type) {
            openingBalanceQuery.type = type;
        }

        // Add base filter if provided and user is admin
        if (base && req.user.role === 'admin') {
            openingBalanceQuery.base = base;
        }

        // Add date condition for opening balance
        openingBalanceQuery.createdAt = { $lt: startOfPeriod };

        console.log('Opening Balance Query:', openingBalanceQuery);
        console.log('Start of Period:', startOfPeriod);

        const openingBalance = await Asset.countDocuments(openingBalanceQuery);
        console.log('Opening Balance Result:', openingBalance);

        // Closing Balance (total assets at end of period)
        const closingBalance = await Asset.countDocuments({
            ...query,
            createdAt: { $lte: endOfPeriod }
        });

        // Purchases in period
        const purchaseQuery = {};
        if (type) {
            purchaseQuery.type = type;
        }
        if (base && req.user.role === 'admin') {
            purchaseQuery.base = base;
        }
        purchaseQuery.purchaseDate = {
            $gte: startOfPeriod,
            $lte: endOfPeriod
        };
        console.log('Purchase Query:', purchaseQuery);
        const purchases = await Purchase.countDocuments(purchaseQuery);
        console.log('Purchases Result:', purchases);

        // Transfers In in period
        const transferInQuery = {};
        if (type) {
            transferInQuery.type = type;
        }
        if (base && req.user.role === 'admin') {
            transferInQuery.toBase = base;
        } else if (req.user.role === 'base_commander') {
            transferInQuery.toBase = req.user.base;
        } else if (req.user.role === 'logistics_officer') {
            transferInQuery.toBase = { $in: req.user.assignedBases };
        }
        transferInQuery.transferDate = {
            $gte: startOfPeriod,
            $lte: endOfPeriod
        };
        console.log('Transfer In Query:', transferInQuery);
        const transfersIn = await Transfer.countDocuments(transferInQuery);
        console.log('Transfers In Result:', transfersIn);

        // Transfers Out in period
        const transferOutQuery = {};
        if (type) {
            transferOutQuery.type = type;
        }
        if (base && req.user.role === 'admin') {
            transferOutQuery.fromBase = base;
        } else if (req.user.role === 'base_commander') {
            transferOutQuery.fromBase = req.user.base;
        } else if (req.user.role === 'logistics_officer') {
            transferOutQuery.fromBase = { $in: req.user.assignedBases };
        }
        transferOutQuery.transferDate = {
            $gte: startOfPeriod,
            $lte: endOfPeriod
        };
        console.log('Transfer Out Query:', transferOutQuery);
        const transfersOut = await Transfer.countDocuments(transferOutQuery);
        console.log('Transfers Out Result:', transfersOut);

        // Assigned assets
        const assignedAssets = await Asset.countDocuments({
            ...query,
            status: 'assigned'
        });

        // Expended assets
        const expendedAssets = await Asset.countDocuments({
            ...query,
            status: 'expended'
        });

        // Calculate Net Movement (difference between closing and opening balance)
        const netMovement = closingBalance - openingBalance;

        // Get recent activities
        const recentActivities = await Promise.all([
            Asset.find(query).sort({ createdAt: -1 }).limit(5).populate('base', 'name'),
            Transfer.find(query).sort({ createdAt: -1 }).limit(5).populate('fromBase toBase', 'name'),
            Assignment.find(query).sort({ createdAt: -1 }).limit(5).populate('base', 'name')
        ]);

        // Get base-wise asset distribution (only for admin)
        let baseDistribution = [];
        if (req.user.role === 'admin') {
            baseDistribution = await Asset.aggregate([
                { $match: query },
                {
                    $group: {
                        _id: '$base',
                        total: { $sum: 1 },
                        assigned: {
                            $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] }
                        },
                        expended: {
                            $sum: { $cond: [{ $eq: ['$status', 'expended'] }, 1, 0] }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'bases',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'baseInfo'
                    }
                },
                {
                    $unwind: '$baseInfo'
                },
                {
                    $project: {
                        _id: 1,
                        name: '$baseInfo.name',
                        total: 1,
                        assigned: 1,
                        expended: 1
                    }
                }
            ]);
        }

        // Get asset type distribution
        const typeDistribution = await Asset.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get status distribution
        const statusDistribution = await Asset.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const dashboardData = {
            userInfo,
            counts,
            metrics: {
                openingBalance,
                closingBalance,
                netMovement,
                purchases,
                transfersIn,
                transfersOut,
                assigned: assignedAssets,
                expended: expendedAssets
            },
            recentActivities: {
                assets: recentActivities[0],
                transfers: recentActivities[1],
                assignments: recentActivities[2]
            },
            distributions: {
                base: baseDistribution,
                type: typeDistribution,
                status: statusDistribution
            }
        };

        res.json(dashboardData);
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({
            message: 'Error fetching dashboard data',
            error: error.message
        });
    }
});

module.exports = router; 