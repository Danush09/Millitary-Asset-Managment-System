const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['weapon', 'vehicle', 'ammunition', 'equipment']
    },
    serialNumber: {
        type: String,
        required: true,
        unique: true
    },
    base: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: true
    },
    location: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        required: true,
        enum: ['available', 'assigned', 'maintenance', 'expended'],
        default: 'available'
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    openingBalance: {
        type: Number,
        required: true,
        min: 0
    },
    closingBalance: {
        type: Number,
        required: true,
        min: 0
    },
    netMovement: {
        type: Number,
        default: 0
    },
    purchaseDate: {
        type: Date,
        required: true
    },
    purchaseDetails: {
        supplier: String,
        cost: Number,
        purchaseOrderNumber: String
    },
    movementHistory: [{
        date: {
            type: Date,
            required: true
        },
        type: {
            type: String,
            enum: ['transfer', 'assignment', 'return', 'adjustment'],
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        reference: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'movementHistory.referenceModel'
        },
        referenceModel: {
            type: String,
            enum: ['Transfer', 'Assignment']
        },
        notes: String
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Virtual for current balance
assetSchema.virtual('currentBalance').get(function () {
    return this.openingBalance + this.netMovement;
});

// Method to update balances
assetSchema.methods.updateBalances = function () {
    this.closingBalance = this.openingBalance + this.netMovement;
    return this.save();
};

// Method to add movement record
assetSchema.methods.addMovement = async function (movementData) {
    this.movementHistory.push(movementData);
    this.netMovement += movementData.quantity;
    await this.updateBalances();
    return this.save();
};

// Method to get movement history
assetSchema.methods.getMovementHistory = function (startDate, endDate) {
    let query = this.movementHistory;

    if (startDate) {
        query = query.filter(movement => movement.date >= new Date(startDate));
    }
    if (endDate) {
        query = query.filter(movement => movement.date <= new Date(endDate));
    }

    return query.sort((a, b) => b.date - a.date);
};

// Method to calculate period metrics
assetSchema.methods.calculatePeriodMetrics = function (startDate, endDate) {
    const movements = this.getMovementHistory(startDate, endDate);

    return {
        totalTransfers: movements.filter(m => m.type === 'transfer').length,
        totalAssignments: movements.filter(m => m.type === 'assignment').length,
        totalReturns: movements.filter(m => m.type === 'return').length,
        netMovement: movements.reduce((sum, m) => sum + m.quantity, 0),
        openingBalance: this.openingBalance,
        closingBalance: this.closingBalance
    };
};

// Pre-save middleware to ensure closing balance is updated
assetSchema.pre('save', function (next) {
    if (this.isModified('netMovement') || this.isModified('openingBalance')) {
        this.closingBalance = this.openingBalance + this.netMovement;
    }
    next();
});

// Index for efficient queries
assetSchema.index({ base: 1, type: 1, status: 1 });
assetSchema.index({ serialNumber: 1 }, { unique: true });

const Asset = mongoose.model('Asset', assetSchema);

module.exports = Asset; 