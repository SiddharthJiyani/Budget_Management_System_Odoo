const mongoose = require("mongoose");

// Product Master Schema
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Product name is required"],
        trim: true,
        index: true,
    },
    // Category (Many-to-One relationship)
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: [true, "Product category is required"],
    },
    salesPrice: {
        type: Number,
        required: [true, "Sales price is required"],
        min: [0, "Sales price cannot be negative"],
    },
    purchasePrice: {
        type: Number,
        required: [true, "Purchase price is required"],
        min: [0, "Purchase price cannot be negative"],
    },
    status: {
        type: String,
        enum: ['new', 'confirmed', 'archived'],
        default: 'new',
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});

// Indexes for better query performance
productSchema.index({ name: 1, status: 1 });
productSchema.index({ category: 1 });
productSchema.index({ status: 1 });

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
    if (this.salesPrice && this.purchasePrice) {
        return ((this.salesPrice - this.purchasePrice) / this.purchasePrice * 100).toFixed(2);
    }
    return 0;
});

module.exports = mongoose.model("Product", productSchema);
