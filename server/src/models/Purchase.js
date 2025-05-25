const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    base: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: true
    },
    purchaseDate: {
        type: Date,
        required: true,
        default: Date.now
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    supplier: {
        type: String,
        required: true
    },
    purchaseOrderNumber: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    notes: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Calculate total amount before saving
purchaseSchema.pre('save', function (next) {
    this.totalAmount = this.quantity * this.unitPrice;
    next();
});

const Purchase = mongoose.model('Purchase', purchaseSchema);

module.exports = Purchase; 