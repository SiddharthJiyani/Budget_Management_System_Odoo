const mongoose = require("mongoose");

// Invoice Line Schema (embedded in Invoice)
const invoiceLineSchema = new mongoose.Schema({
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
        required: [true, "Analytic Master is required for invoice line"],
    },
}, { _id: true });

// Invoice Schema (Sales Invoice)
const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: [true, "Invoice number is required"],
        unique: true,
        trim: true,
        index: true,
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: [true, "Customer is required"],
    },
    invoiceDate: {
        type: Date,
        required: [true, "Invoice date is required"],
        default: Date.now,
        index: true,
    },
    dueDate: {
        type: Date,
        required: [true, "Due date is required"],
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'cancelled'],
        default: 'draft',
        index: true,
    },
    lines: [invoiceLineSchema],
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
invoiceLineSchema.pre('save', function(next) {
    this.subtotal = this.quantity * this.unitPrice;
    next();
});

// Calculate totals before saving invoice
invoiceSchema.pre('save', function(next) {
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
invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ customer: 1, status: 1 });
invoiceSchema.index({ invoiceDate: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ 'lines.analyticMaster': 1 }); // For budget calculations

module.exports = mongoose.model("Invoice", invoiceSchema);
