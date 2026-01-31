const mongoose = require("mongoose");

// Sales Order Line Schema (embedded in SalesOrder)
const salesOrderLineSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
    },
    productName: {
        type: String,
        trim: true,
        required: [true, "Product name is required"],
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
salesOrderLineSchema.pre('save', function (next) {
    this.lineTotal = this.quantity * this.unitPrice;
    next();
});

// Sales Order Schema
const salesOrderSchema = new mongoose.Schema({
    soNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: [true, "Customer is required"],
    },
    reference: {
        type: String,
        trim: true,
    },
    soDate: {
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
    lines: [salesOrderLineSchema],
    grandTotal: {
        type: Number,
        default: 0,
    },
    sentToCustomer: {
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

// Static method to get next SO number
salesOrderSchema.statics.getNextSoNumber = async function () {
    const year = new Date().getFullYear();
    const prefix = `SO/${year}/`;

    // Find the highest SO number for the current year
    const lastSO = await this.findOne(
        { soNumber: { $regex: `^${prefix}` } },
        {},
        { sort: { soNumber: -1 } }
    );

    let nextNumber = 1;
    if (lastSO) {
        const lastNumber = parseInt(lastSO.soNumber.split('/').pop());
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Method to calculate line totals and grand total
salesOrderSchema.methods.calculateTotals = function () {
    this.lines.forEach(line => {
        line.lineTotal = line.quantity * line.unitPrice;
    });
    this.grandTotal = this.lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
};

// Pre-save middleware to calculate totals
salesOrderSchema.pre('save', function (next) {
    this.calculateTotals();
    next();
});

// Indexes for better query performance
salesOrderSchema.index({ soNumber: 1, status: 1 });
salesOrderSchema.index({ customerId: 1 });
salesOrderSchema.index({ createdBy: 1, status: 1 });
salesOrderSchema.index({ soDate: -1 });

module.exports = mongoose.model("SalesOrder", salesOrderSchema);
