const mongoose = require("mongoose");

// Purchase Order Line Schema (embedded in PurchaseOrder)
const purchaseOrderLineSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product is required"],
    },
    budgetAnalyticId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnalyticMaster",
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
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});

// Static method to get next PO number
purchaseOrderSchema.statics.getNextPoNumber = async function () {
    const lastPO = await this.findOne({}, { poNumber: 1 })
        .sort({ poNumber: -1 })
        .lean();

    if (!lastPO) {
        return "PO00001";
    }

    // Extract number from PO00001 format
    const lastNumber = parseInt(lastPO.poNumber.replace("PO", ""), 10);
    const nextNumber = lastNumber + 1;
    return `PO${String(nextNumber).padStart(5, "0")}`;
};

// Method to calculate line totals
purchaseOrderSchema.methods.calculateLineTotals = function () {
    this.lines.forEach(line => {
        line.lineTotal = line.quantity * line.unitPrice;
    });
};

// Virtual for grand total
purchaseOrderSchema.virtual('grandTotal').get(function () {
    return this.lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
});

// Indexes for better query performance
purchaseOrderSchema.index({ poNumber: 1, status: 1 });
purchaseOrderSchema.index({ vendorId: 1 });
purchaseOrderSchema.index({ createdBy: 1, status: 1 });
purchaseOrderSchema.index({ poDate: -1 });

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
