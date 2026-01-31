const mongoose = require("mongoose");

// Bill Line Schema (embedded in Bill)
const billLineSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: [0, "Quantity cannot be negative"],
        default: 1,
    },
    unitPrice: {
        type: Number,
        required: true,
        min: [0, "Unit price cannot be negative"],
    },
    subtotal: {
        type: Number,
        default: 0,
    },
    // Analytic Master for budget tracking
    analyticMaster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnalyticMaster",
        required: [true, "Analytic Master is required for bill line"],
    },
}, { _id: true });

// Bill Schema (Vendor Bill / Purchase Order)
const billSchema = new mongoose.Schema({
    billNumber: {
        type: String,
        required: [true, "Bill number is required"],
        unique: true,
        trim: true,
        index: true,
    },
    vendor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: [true, "Vendor is required"],
    },
    billDate: {
        type: Date,
        required: [true, "Bill date is required"],
        default: Date.now,
        index: true,
    },
    dueDate: {
        type: Date,
        required: [true, "Due date is required"],
    },
    status: {
        type: String,
        enum: ['draft', 'confirmed', 'paid', 'cancelled'],
        default: 'draft',
        index: true,
    },
    lines: [billLineSchema],
    subtotalAmount: {
        type: Number,
        default: 0,
    },
    taxAmount: {
        type: Number,
        default: 0,
    },
    totalAmount: {
        type: Number,
        default: 0,
    },
    paidAmount: {
        type: Number,
        default: 0,
    },
    balanceAmount: {
        type: Number,
        default: 0,
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

// Calculate line subtotal before saving
billLineSchema.pre('save', function (next) {
    this.subtotal = this.quantity * this.unitPrice;
    next();
});

// Calculate totals before saving bill
billSchema.pre('save', function (next) {
    // Calculate subtotal from lines
    this.subtotalAmount = this.lines.reduce((sum, line) => {
        line.subtotal = line.quantity * line.unitPrice;
        return sum + line.subtotal;
    }, 0);

    // Calculate total and balance
    this.totalAmount = this.subtotalAmount + this.taxAmount;
    this.balanceAmount = this.totalAmount - this.paidAmount;

    next();
});

// Indexes for better query performance
billSchema.index({ vendor: 1, status: 1 });
billSchema.index({ 'lines.analyticMaster': 1 }); // For budget calculations

module.exports = mongoose.model("Bill", billSchema);
