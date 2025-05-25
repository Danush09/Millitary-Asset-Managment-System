const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    fromBase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: true
    },
    toBase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    transferDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'in_transit', 'completed', 'cancelled'],
        default: 'pending'
    },
    initiatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    transferNumber: {
        type: String,
        required: true,
        unique: true
    },
    notes: String,
    documents: [{
        name: String,
        url: String,
        type: String
    }]
}, {
    timestamps: true
});

// Indexes for efficient queries
transferSchema.index({ asset: 1, transferDate: -1 });
transferSchema.index({ fromBase: 1, toBase: 1 });
transferSchema.index({ transferNumber: 1 }, { unique: true });

module.exports = mongoose.model('Transfer', transferSchema); 