const mongoose = require("mongoose");

// Purchase Order Line Schema (embedded in PurchaseOrder)
const purchaseOrderLineSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
    },
    productName: {
        type: String,
        trim: true,
    },
    budgetAnalyticId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnalyticMaster",
    },
    /**
     * Indicates if the analytics was auto-assigned by the AutoAnalyticalService
     * true = system assigned based on rules
     * false = user manually selected
     */
    autoAssigned: {
        type: Boolean,
        default: false,
    },
    /**
     * Indicates if user manually changed an auto-assigned analytics
     * Once true, auto-logic will NOT re-run on this line during updates
     */
    analyticsOverridden: {
        type: Boolean,
        default: false,
    },
    /**
     * Stores the matched rule details for audit trail
     * Only populated when autoAssigned=true
     */
    autoAssignmentDetails: {
        ruleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AutoAnalyticalModel",
        },
        ruleName: String,
        matchedFields: [String],
        explanation: String,
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [0.01, "Quantity must be greater than 0"],
    },
    unitPrice: {
        type: Number,
        required: [true, "Unit price is required"],
        min: [0, "Unit price cannot be negative"],
    },
    lineTotal: {
        type: Number,
        default: 0,
    },
    exceedsBudget: {
        type: Boolean,
        default: false,
    },
}, { _id: true });

// Calculate line total before saving
purchaseOrderLineSchema.pre('save', function (next) {
    this.lineTotal = this.quantity * this.unitPrice;
    next();
});

// Purchase Order Schema
const purchaseOrderSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: [true, "Vendor is required"],
    },
    reference: {
        type: String,
        trim: true,
    },
    poDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    status: {
        type: String,
        enum: ["draft", "confirmed", "cancelled"],
        default: "draft",
        index: true,
    },
    lines: [purchaseOrderLineSchema],
    grandTotal: {
        type: Number,
        default: 0,
    },
    sentToVendor: {
        type: Boolean,
        default: false,
    },
    sentDate: {
        type: Date,
    },
    notes: {
        type: String,
        trim: true,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});

// Static method to get next PO number
purchaseOrderSchema.statics.getNextPoNumber = async function () {
    const year = new Date().getFullYear();
    const lastPO = await this.findOne({ poNumber: { $regex: `^PO-${year}-` } }, { poNumber: 1 })
        .sort({ poNumber: -1 })
        .lean();

    if (!lastPO) {
        return `PO-${year}-0001`;
    }

    // Extract number from PO-2026-0001 format
    const parts = lastPO.poNumber.split('-');
    const lastNumber = parseInt(parts[2], 10);
    const nextNumber = lastNumber + 1;
    return `PO-${year}-${String(nextNumber).padStart(4, "0")}`;
};

// Method to calculate line totals and grand total
purchaseOrderSchema.methods.calculateTotals = function () {
    this.lines.forEach(line => {
        line.lineTotal = line.quantity * line.unitPrice;
    });
    this.grandTotal = this.lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
};

// Indexes for better query performance
purchaseOrderSchema.index({ poNumber: 1, status: 1 });
purchaseOrderSchema.index({ vendorId: 1 });
purchaseOrderSchema.index({ createdBy: 1, status: 1 });
purchaseOrderSchema.index({ poDate: -1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
