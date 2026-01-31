const mongoose = require("mongoose");

// Analytic Master Schema (for auto-analytics)
const analyticMasterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Analytic name is required"],
        trim: true,
        index: true,
    },
    description: {
        type: String,
        trim: true,
    },
    startDate: {
        type: Date,
    },
    endDate: {
        type: Date,
    },
    // Product category for analytics (Many-to-One)
    productCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
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

// Validate end date is after start date
analyticMasterSchema.pre('save', function(next) {
    if (this.startDate && this.endDate && this.endDate < this.startDate) {
        next(new Error('End date must be greater than or equal to start date'));
    }
    next();
});

// Indexes for better query performance
analyticMasterSchema.index({ name: 1, status: 1 });
analyticMasterSchema.index({ startDate: 1, endDate: 1 });
analyticMasterSchema.index({ status: 1 });

module.exports = mongoose.model("AnalyticMaster", analyticMasterSchema);
