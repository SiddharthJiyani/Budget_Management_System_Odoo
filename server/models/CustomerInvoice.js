const mongoose = require("mongoose");

// Customer Invoice Line Item Schema
const customerInvoiceLineSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
    },
    budgetAnalyticId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnalyticMaster",
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: [0, "Quantity cannot be negative"],
        default: 1,
    },
    unitPrice: {
        type: Number,
        required: [true, "Unit price is required"],
        min: [0, "Unit price cannot be negative"],
        default: 0,
    },
    lineTotal: {
        type: Number,
        default: 0,
    },
}, { _id: true });

// Customer Invoice Schema (Sales Invoice)
const customerInvoiceSchema = new mongoose.Schema({
    invoiceNo: {
        type: String,
        required: [true, "Invoice number is required"],
        unique: true,
        trim: true,
        index: true,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        required: [true, "Customer is required"],
        index: true,
    },
    invoiceDate: {
        type: Date,
        required: [true, "Invoice date is required"],
        default: Date.now,
    },
    dueDate: {
        type: Date,
        required: [true, "Due date is required"],
    },
    reference: {
        type: String,
        trim: true,
    },
    status: {
        type: String,
        enum: ['draft', 'confirmed', 'cancelled'],
        default: 'draft',
        index: true,
    },
    paymentStatus: {
        type: String,
        enum: ['not_paid', 'partial', 'paid'],
        default: 'not_paid',
        index: true,
    },
    lines: [customerInvoiceLineSchema],
    grandTotal: {
        type: Number,
        default: 0,
    },
    paidViaCash: {
        type: Number,
        default: 0,
        min: [0, "Paid via cash cannot be negative"],
    },
    paidViaBank: {
        type: Number,
        default: 0,
        min: [0, "Paid via bank cannot be negative"],
    },
    amountDue: {
        type: Number,
        default: 0,
    },
    // Email tracking
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
    // Razorpay payment tracking
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
    razorpaySignature: {
        type: String,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});

// Pre-save middleware to calculate totals and update payment status
customerInvoiceSchema.pre('save', function (next) {
    // Calculate line totals
    this.lines.forEach(line => {
        line.lineTotal = line.quantity * line.unitPrice;
    });

    // Calculate grand total
    this.grandTotal = this.lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

    // Calculate amount due
    const totalPaid = (this.paidViaCash || 0) + (this.paidViaBank || 0);
    this.amountDue = this.grandTotal - totalPaid;

    // Auto-update payment status based on amounts
    if (totalPaid === 0) {
        this.paymentStatus = 'not_paid';
    } else if (totalPaid >= this.grandTotal) {
        this.paymentStatus = 'paid';
        this.amountDue = 0; // Ensure no negative amount due
    } else {
        this.paymentStatus = 'partial';
    }

    next();
});

// Static method to get next invoice number (INV/YYYY/0001)
customerInvoiceSchema.statics.getNextInvoiceNumber = async function () {
    const year = new Date().getFullYear();
    const prefix = `INV/${year}/`;

    // Find the highest invoice number for the current year
    const lastInvoice = await this.findOne(
        { invoiceNo: { $regex: `^${prefix}` } },
        {},
        { sort: { invoiceNo: -1 } }
    );

    let nextNumber = 1;
    if (lastInvoice) {
        const lastNumber = parseInt(lastInvoice.invoiceNo.split('/').pop());
        nextNumber = lastNumber + 1;
    }

    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

// Method to calculate totals (can be called manually if needed)
customerInvoiceSchema.methods.calculateTotals = function () {
    this.lines.forEach(line => {
        line.lineTotal = line.quantity * line.unitPrice;
    });
    this.grandTotal = this.lines.reduce((sum, line) => sum + (line.lineTotal || 0), 0);

    const totalPaid = (this.paidViaCash || 0) + (this.paidViaBank || 0);
    this.amountDue = this.grandTotal - totalPaid;

    // Update payment status
    if (totalPaid === 0) {
        this.paymentStatus = 'not_paid';
    } else if (totalPaid >= this.grandTotal) {
        this.paymentStatus = 'paid';
        this.amountDue = 0;
    } else {
        this.paymentStatus = 'partial';
    }
};

// Method to record payment and update status
customerInvoiceSchema.methods.recordPayment = function (cashAmount = 0, bankAmount = 0) {
    this.paidViaCash = (this.paidViaCash || 0) + cashAmount;
    this.paidViaBank = (this.paidViaBank || 0) + bankAmount;
    this.calculateTotals();
};

// Indexes for better query performance
customerInvoiceSchema.index({ invoiceNo: 1 });
customerInvoiceSchema.index({ customerId: 1, status: 1 });
customerInvoiceSchema.index({ status: 1, paymentStatus: 1 });
customerInvoiceSchema.index({ invoiceDate: -1 });
customerInvoiceSchema.index({ dueDate: 1 });

module.exports = mongoose.model("CustomerInvoice", customerInvoiceSchema);
