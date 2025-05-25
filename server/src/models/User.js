const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'base_commander', 'logistics_officer'],
        default: 'logistics_officer'
    },
    base: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    assignedBases: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base'
    }],
    primaryBase: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Base',
        default: null
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1, base: 1 });
userSchema.index({ role: 1, primaryBase: 1 });

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Pre-save middleware to handle role-specific logic
userSchema.pre('save', async function (next) {
    try {
        const Base = mongoose.model('Base');

        // If this is a new user or role/base has changed
        if (this.isNew || this.isModified('role') || this.isModified('base')) {
            if (this.role === 'admin') {
                // Admins don't need base assignments
                this.base = null;
                this.assignedBases = [];
                this.primaryBase = null;
            } else if (this.role === 'base_commander') {
                // Check if another commander is already assigned to this base
                if (this.base) {
                    const existingCommander = await this.constructor.findOne({
                        role: 'base_commander',
                        base: this.base,
                        _id: { $ne: this._id }
                    });

                    if (existingCommander) {
                        throw new Error('This base already has a commander assigned');
                    }
                }
                // Base commanders can only have one base
                this.assignedBases = this.base ? [this.base] : [];
                this.primaryBase = this.base;
            } else if (this.role === 'logistics_officer') {
                // Logistics officers can have multiple bases
                if (this.base && !this.assignedBases.includes(this.base)) {
                    this.assignedBases.push(this.base);
                }
                if (!this.primaryBase && this.base) {
                    this.primaryBase = this.base;
                }
            }
        }

        // If password is modified, hash it
        if (this.isModified('password')) {
            const salt = await bcrypt.genSalt(10);
            this.password = await bcrypt.hash(this.password, salt);
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Method to check if user has access to a specific base
userSchema.methods.hasAccessToBase = function (baseId) {
    if (this.role === 'admin') return true;
    if (this.role === 'base_commander') return this.base && this.base.toString() === baseId.toString();
    if (this.role === 'logistics_officer') {
        return this.assignedBases.some(base => base.toString() === baseId.toString());
    }
    return false;
};

// Method to add a base to logistics officer's assigned bases
userSchema.methods.addAssignedBase = async function (baseId) {
    if (this.role !== 'logistics_officer') {
        throw new Error('Only logistics officers can have multiple assigned bases');
    }
    if (!this.assignedBases.includes(baseId)) {
        this.assignedBases.push(baseId);
    }
    if (!this.primaryBase) {
        this.primaryBase = baseId;
    }
    await this.save();
};

// Method to remove a base from logistics officer's assigned bases
userSchema.methods.removeAssignedBase = async function (baseId) {
    if (this.role !== 'logistics_officer') {
        throw new Error('Only logistics officers can have multiple assigned bases');
    }
    this.assignedBases = this.assignedBases.filter(base => base.toString() !== baseId.toString());
    if (this.primaryBase && this.primaryBase.toString() === baseId.toString()) {
        this.primaryBase = this.assignedBases[0] || null;
    }
    await this.save();
};

// Method to set primary base for logistics officer
userSchema.methods.setPrimaryBase = async function (baseId) {
    if (this.role !== 'logistics_officer') {
        throw new Error('Only logistics officers can have a primary base');
    }
    if (!this.assignedBases.includes(baseId)) {
        throw new Error('Cannot set primary base that is not in assigned bases');
    }
    this.primaryBase = baseId;
    await this.save();
};

// Method to check if user can manage a specific base
userSchema.methods.canManageBase = function (baseId) {
    if (this.role === 'admin') return true;
    if (this.role === 'base_commander') return this.base && this.base.toString() === baseId.toString();
    if (this.role === 'logistics_officer') {
        return this.assignedBases.some(base => base.toString() === baseId.toString());
    }
    return false;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 