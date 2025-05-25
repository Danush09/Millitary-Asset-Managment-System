const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    base: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        required: true
    },
    assignmentDate: {
        type: Date,
        required: true
    },
    returnDate: Date,
    status: {
        type: String,
        enum: ['active', 'returned', 'expended', 'lost'],
        default: 'active'
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    assignmentNumber: {
        type: String,
        required: true,
        unique: true
    },
    purpose: {
        type: String,
        required: true
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
assignmentSchema.index({ asset: 1, status: 1 });
assignmentSchema.index({ assignedTo: 1, status: 1 });
assignmentSchema.index({ assignmentNumber: 1 }, { unique: true });
assignmentSchema.index({ base: 1, assignmentDate: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema); 