const mongoose = require('mongoose');

const salesOrderLineSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    },
    productName: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 0
    },
    unitPrice: {
        type: Number,
        required: true,
        min: 0
    },
    lineTotal: {
        type: Number,
        required: true,
        min: 0
    },
    budgetAnalyticId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AnalyticMaster'
    },
    autoAssigned: {
        type: Boolean,
        default: false
    },
    analyticsOverridden: {
        type: Boolean,
        default: false
    },
    autoAssignmentDetails: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    exceedsBudget: {
        type: Boolean,
        default: false
    }
});

const salesOrderSchema = new mongoose.Schema({
    soNumber: {
        type: String,
        required: true,
        unique: true
    },
    soDate: {
        type: Date,
        default: Date.now
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Contact',
        required: true
    },
    reference: {
        type: String,
        default: ''
    },
    lines: [salesOrderLineSchema],
    orderTotal: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['draft', 'confirmed', 'cancelled'],
        default: 'draft'
    },
    notes: {
        type: String,
        default: ''
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Index for faster queries
salesOrderSchema.index({ soNumber: 1 });
salesOrderSchema.index({ customerId: 1 });
salesOrderSchema.index({ status: 1 });
salesOrderSchema.index({ createdBy: 1 });

module.exports = mongoose.model('SalesOrder', salesOrderSchema);
