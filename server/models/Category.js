const mongoose = require("mongoose");

// Product Category Schema
const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Category name is required"],
        unique: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
    },
    // Color code for UI display (optional)
    color: {
        type: String,
        default: "#10b981", // Default green color
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});

// Index for faster lookups
categorySchema.index({ name: 1 });

module.exports = mongoose.model("Category", categorySchema);
