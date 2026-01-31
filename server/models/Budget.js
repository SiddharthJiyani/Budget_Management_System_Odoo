const mongoose = require("mongoose");

// Budget Line Schema (embedded in Budget)
// Only stores reference and amounts - name and type fetched in real-time from AnalyticMaster
const budgetLineSchema = new mongoose.Schema({
    analyticMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnalyticMaster",
        required: true,
    },
    budgetedAmount: {
        type: Number,
        default: 0,
    },
    achievedAmount: {
        type: Number,
        default: 0,
    },
    achievedPercent: {
        type: Number,
        default: 0,
    },
    amountToAchieve: {
        type: Number,
        default: 0,
    },
}, { _id: true });

// Budget Schema
const budgetSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Budget name is required"],
        trim: true,
        index: true,
    },
    startDate: {
        type: Date,
        required: [true, "Start date is required"],
        index: true,
    },
    endDate: {
        type: Date,
        required: [true, "End date is required"],
        index: true,
    },
    status: {
        type: String,
        enum: ["draft", "confirmed", "revised", "archived", "canceled"],
        default: "draft",
        index: true,
    },
    isRevised: {
        type: Boolean,
        default: false,
    },
    originalBudgetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Budget",
        default: null,
    },
    revisedBudgetId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Budget",
        default: null,
    },
    lines: [budgetLineSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});

// Validate end date is after start date
budgetSchema.pre('save', function(next) {
    if (this.endDate < this.startDate) {
        next(new Error('End date must be greater than or equal to start date'));
    }
    next();
});

// Method to calculate achieved metrics for a line
budgetSchema.methods.calculateLineMetrics = function(lineIndex) {
    const line = this.lines[lineIndex];
    if (line.budgetedAmount > 0) {
        line.achievedPercent = (line.achievedAmount / line.budgetedAmount) * 100;
        line.amountToAchieve = line.budgetedAmount - line.achievedAmount;
    } else {
        line.achievedPercent = 0;
        line.amountToAchieve = 0;
    }
};

// Method to calculate all line metrics
budgetSchema.methods.calculateAllMetrics = function() {
    this.lines.forEach((line, index) => {
        this.calculateLineMetrics(index);
    });
};

// Indexes for better query performance
budgetSchema.index({ name: 1, status: 1 });
budgetSchema.index({ startDate: 1, endDate: 1 });
budgetSchema.index({ createdBy: 1, status: 1 });
budgetSchema.index({ isRevised: 1 });

module.exports = mongoose.model("Budget", budgetSchema);
