const mongoose = require('mongoose');

const baseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true,
        enum: ['air', 'naval', 'army', 'joint']
    },
    commander: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'maintenance'],
        default: 'active'
    },
    capacity: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    notes: String,
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

// Indexes for efficient queries
baseSchema.index({ name: 1 }, { unique: true });
baseSchema.index({ status: 1 });
baseSchema.index({ type: 1 });

const Base = mongoose.model('Base', baseSchema);

module.exports = Base; 