const mongoose = require("mongoose");

// Vendor Bill Line Schema (embedded in VendorBill)
const vendorBillLineSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
    },
    productName: {
        type: String,
        trim: true,
        required: [true, "Product name is required"],
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
    exceedsBudget: {
        type: Boolean,
        default: false,
    },
}, { _id: true });

// Calculate line total before saving
vendorBillLineSchema.pre('save', function (next) {
    this.lineTotal = this.quantity * this.unitPrice;
    next();
});

// Payment Schema for tracking payments
const paymentSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        min: [0, "Payment amount cannot be negative"],
    },
    paymentMethod: {
        type: String,
        enum: ["razorpay", "cash", "bank"],
        default: "razorpay",
    },
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
    razorpaySignature: {
        type: String,
    },
    paymentDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "completed",
    },
    notes: {
        type: String,
        trim: true,
    },
}, { _id: true, timestamps: true });

// Vendor Bill Schema
const vendorBillSchema = new mongoose.Schema({
    billNumber: {
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
    purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
    },
    reference: {
        type: String,
        trim: true,
    },
    billDate: {
        type: Date,
        required: true,
        default: Date.now,
        index: true,
    },
    dueDate: {
        type: Date,
        required: true,
        default: function() {
            return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
        }
    },
    status: {
        type: String,
        enum: ["draft", "confirmed", "cancelled"],
        default: "draft",
        index: true,
    },
    paymentStatus: {
        type: String,
        enum: ["not_paid", "partial", "paid"],
        default: "not_paid",
        index: true,
    },
    lines: [vendorBillLineSchema],
    grandTotal: {
        type: Number,
        default: 0,
    },
    paidAmount: {
        type: Number,
        default: 0,
        min: [0, "Paid amount cannot be negative"],
    },
    dueAmount: {
        type: Number,
        default: 0,
        min: [0, "Due amount cannot be negative"],
    },
    payments: [paymentSchema],
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
});

// Method to calculate totals
vendorBillSchema.methods.calculateTotals = function () {
    this.grandTotal = this.lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);
    this.dueAmount = this.grandTotal - this.paidAmount;
    
    // Update payment status
    if (this.paidAmount === 0) {
        this.paymentStatus = "not_paid";
    } else if (this.paidAmount >= this.grandTotal) {
        this.paymentStatus = "paid";
        this.dueAmount = 0;
    } else {
        this.paymentStatus = "partial";
    }
    
    return this;
};

// Pre-save middleware to calculate totals
vendorBillSchema.pre('save', function (next) {
    this.calculateTotals();
    next();
});

// Static method to generate next bill number
vendorBillSchema.statics.getNextBillNumber = async function () {
    const year = new Date().getFullYear();
    const prefix = `BILL/${year}/`;
    
    // Find the highest bill number for the current year
    const lastBill = await this.findOne(
        { billNumber: { $regex: `^${prefix}` } },
        {},
        { sort: { billNumber: -1 } }
    );
    
    let nextNumber = 1;
    if (lastBill) {
        const lastNumber = parseInt(lastBill.billNumber.split('/').pop());
        nextNumber = lastNumber + 1;
    }
    
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Index for better query performance
vendorBillSchema.index({ billNumber: 1, status: 1 });
vendorBillSchema.index({ vendorId: 1, status: 1 });
vendorBillSchema.index({ billDate: 1, status: 1 });
vendorBillSchema.index({ dueDate: 1, paymentStatus: 1 });

module.exports = mongoose.model("VendorBill", vendorBillSchema);