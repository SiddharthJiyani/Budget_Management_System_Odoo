const mongoose = require("mongoose");

// Partner Tag Schema (UI shows as "Contact Tag")
const partnerTagSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Tag name is required"],
        unique: true,
        trim: true,
        lowercase: true, // Store as lowercase for case-insensitive matching
    },
    displayName: {
        type: String,
        trim: true, // Original casing for display
    },
    // Color code for UI display (optional)
    color: {
        type: String,
        default: "#6366f1", // Default indigo color
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});

// Pre-save hook to set displayName
partnerTagSchema.pre('save', function(next) {
    if (!this.displayName) {
        this.displayName = this.name;
    }
    next();
});

// Index for faster lookups
partnerTagSchema.index({ name: 1 });

module.exports = mongoose.model("PartnerTag", partnerTagSchema);
