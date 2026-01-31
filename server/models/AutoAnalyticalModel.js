const mongoose = require("mongoose");

/**
 * Auto-Analytical Model Schema
 * 
 * Defines business rules for automatic analytics assignment on transaction lines.
 * Rules are configured by Admin and applied during Purchase Order / Vendor Bill creation.
 * 
 * MATCHING LOGIC:
 * - A rule MATCHES if ALL non-null fields match the transaction context
 * - Null fields are ignored (wildcard)
 * - Priority = number of matched non-null fields (more specific = higher priority)
 * - Tie-breaker = most recently updated rule wins
 * 
 * CONSTRAINT: At least ONE condition (partner, partnerTag, product, productCategory) must be set
 */
const autoAnalyticalModelSchema = new mongoose.Schema({
    // ============ MATCHING CONDITIONS (all optional, but at least one required) ============

    /**
     * Match by specific partner/vendor
     * Example: All purchases from "ABC Suppliers" → assign to "Vendor ABC Budget"
     */
    partnerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Contact",
        default: null,
    },

    /**
     * Match by partner tag (category of vendors)
     * Example: All vendors tagged "Electronics Supplier" → assign to "Electronics Budget"
     */
    partnerTagId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PartnerTag",
        default: null,
    },

    /**
     * Match by specific product
     * Example: All purchases of "Office Chair Model X" → assign to "Furniture Budget"
     */
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        default: null,
    },

    /**
     * Match by product category
     * Example: All products in "Wooden Furniture" category → assign to "Diwali 2026 Budget"
     */
    productCategoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        default: null,
    },

    // ============ ASSIGNMENT TARGET (required) ============

    /**
     * The analytics/cost center to assign when this rule matches
     */
    analyticsId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "AnalyticMaster",
        required: [true, "Analytics ID is required - this is the cost center to assign"],
    },

    // ============ METADATA ============

    /**
     * Human-readable name for this rule
     * Example: "Electronics from ABC Suppliers"
     */
    name: {
        type: String,
        trim: true,
        required: [true, "Rule name is required"],
    },

    /**
     * Optional description explaining when this rule applies
     */
    description: {
        type: String,
        trim: true,
    },

    /**
     * Rule status - only 'confirmed' rules are active for matching
     * - draft: Being configured, not yet active
     * - confirmed: Active and used for auto-assignment
     * - archived: Disabled, kept for history
     */
    status: {
        type: String,
        enum: ["draft", "confirmed", "archived"],
        default: "draft",
        index: true,
    },

    /**
     * User who created this rule
     */
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true, // createdAt, updatedAt for tie-breaker logic
});

// ============ VALIDATION ============

/**
 * At least one matching condition must be specified
 * This prevents "match everything" rules which would be meaningless
 */
autoAnalyticalModelSchema.pre('validate', function (next) {
    const hasCondition = this.partnerId || this.partnerTagId || this.productId || this.productCategoryId;

    if (!hasCondition) {
        next(new Error('At least one matching condition is required: partnerId, partnerTagId, productId, or productCategoryId'));
    } else {
        next();
    }
});

// ============ VIRTUALS ============

/**
 * Calculate priority weight based on number of conditions defined
 * More conditions = more specific = higher priority
 */
autoAnalyticalModelSchema.virtual('priorityWeight').get(function () {
    let weight = 0;
    if (this.partnerId) weight++;
    if (this.partnerTagId) weight++;
    if (this.productId) weight++;
    if (this.productCategoryId) weight++;
    return weight;
});

/**
 * Get list of conditions defined in this rule (for logging/debugging)
 */
autoAnalyticalModelSchema.virtual('conditionsSummary').get(function () {
    const conditions = [];
    if (this.partnerId) conditions.push('partner');
    if (this.partnerTagId) conditions.push('partnerTag');
    if (this.productId) conditions.push('product');
    if (this.productCategoryId) conditions.push('productCategory');
    return conditions;
});

// Ensure virtuals are included in JSON/Object output
autoAnalyticalModelSchema.set('toJSON', { virtuals: true });
autoAnalyticalModelSchema.set('toObject', { virtuals: true });

// ============ INDEXES ============

// Compound index for efficient rule lookup during matching
autoAnalyticalModelSchema.index({ status: 1, partnerId: 1, partnerTagId: 1, productId: 1, productCategoryId: 1 });

// Index for fetching rules by analytics (to find which rules assign to a specific budget)
autoAnalyticalModelSchema.index({ analyticsId: 1, status: 1 });

// Index for sorting by update time (tie-breaker)
autoAnalyticalModelSchema.index({ status: 1, updatedAt: -1 });

// Index for admin listing by creator
autoAnalyticalModelSchema.index({ createdBy: 1, status: 1 });

module.exports = mongoose.model("AutoAnalyticalModel", autoAnalyticalModelSchema);
