const AutoAnalyticalModel = require("../models/AutoAnalyticalModel");
const Contact = require("../models/Contact");
const Product = require("../models/Product");
const AnalyticMaster = require("../models/AnalyticMaster");
const { getAIRecommendation, isAIEnabled } = require("./AIRecommendationService");

/**
 * AutoAnalyticalService
 * 
 * Deterministic rule engine for automatic analytics assignment.
 * 
 * This service is called during transaction line creation (Purchase Order, Vendor Bill)
 * to automatically assign the appropriate analytics/cost center based on predefined rules.
 * 
 * ALGORITHM:
 * 1. Build transaction context from line data
 * 2. Fetch all ACTIVE (confirmed) rules
 * 3. For each rule, check if ALL non-null conditions match the context
 * 4. Score matches by priority (number of matched fields)
 * 5. Tie-breaker: most recently updated rule wins
 * 6. Return the winning rule's analytics, or null if no match
 */

/**
 * Build transaction context from line and parent document data
 * 
 * @param {Object} params - Line and document data
 * @param {String} params.productId - Product ID from the line
 * @param {String} params.partnerId - Partner/Vendor ID from the parent document
 * @returns {Object} Transaction context for rule matching
 */
async function buildTransactionContext({ productId, partnerId }) {
    const context = {
        partnerId: null,
        partnerTags: [],
        productId: null,
        productCategoryId: null,
    };

    // Fetch partner with tags
    if (partnerId) {
        const partner = await Contact.findById(partnerId)
            .select('_id partnerTags')
            .lean();

        if (partner) {
            context.partnerId = partner._id.toString();
            context.partnerTags = (partner.partnerTags || []).map(tag => tag.toString());
        }
    }

    // Fetch product with category
    if (productId) {
        const product = await Product.findById(productId)
            .select('_id category')
            .lean();

        if (product) {
            context.productId = product._id.toString();
            context.productCategoryId = product.category ? product.category.toString() : null;
        }
    }

    return context;
}

/**
 * Check if a rule matches the transaction context
 * 
 * A rule matches if ALL of its non-null conditions are satisfied:
 * - partnerId must match exactly
 * - partnerTagId must be present in the partner's tags array
 * - productId must match exactly
 * - productCategoryId must match exactly
 * 
 * @param {Object} rule - AutoAnalyticalModel document
 * @param {Object} context - Transaction context
 * @returns {Object} { matches: boolean, matchedFields: string[], score: number }
 */
function evaluateRule(rule, context) {
    const matchedFields = [];
    let allConditionsMet = true;

    // Check partnerId condition
    if (rule.partnerId) {
        if (context.partnerId === rule.partnerId.toString()) {
            matchedFields.push('partnerId');
        } else {
            allConditionsMet = false;
        }
    }

    // Check partnerTagId condition (partner must have this tag)
    if (rule.partnerTagId) {
        if (context.partnerTags.includes(rule.partnerTagId.toString())) {
            matchedFields.push('partnerTagId');
        } else {
            allConditionsMet = false;
        }
    }

    // Check productId condition
    if (rule.productId) {
        if (context.productId === rule.productId.toString()) {
            matchedFields.push('productId');
        } else {
            allConditionsMet = false;
        }
    }

    // Check productCategoryId condition
    if (rule.productCategoryId) {
        if (context.productCategoryId === rule.productCategoryId.toString()) {
            matchedFields.push('productCategoryId');
        } else {
            allConditionsMet = false;
        }
    }

    return {
        matches: allConditionsMet && matchedFields.length > 0,
        matchedFields,
        score: matchedFields.length,
    };
}

/**
 * Main recommendation function
 * 
 * Finds the best matching analytics for a transaction line based on active rules.
 * 
 * @param {Object} params - Transaction line data
 * @param {String} params.productId - Product ID
 * @param {String} params.partnerId - Partner/Vendor ID
 * @returns {Object} Recommendation result:
 *   - analyticsId: The recommended analytics ID (or null)
 *   - matchedRule: The winning rule (for audit/logging)
 *   - allMatches: All matching rules with scores (for debugging)
 *   - explanation: Human-readable explanation of the match
 */
async function recommendAnalytics({ productId, partnerId }) {
    const startTime = Date.now();
    const result = {
        analyticsId: null,
        matchedRule: null,
        allMatches: [],
        explanation: null,
        processingTimeMs: 0,
    };

    try {
        // STEP 1: Build transaction context
        const context = await buildTransactionContext({ productId, partnerId });

        console.log('[AutoAnalyticalService] Transaction context built:', {
            partnerId: context.partnerId,
            partnerTagsCount: context.partnerTags.length,
            productId: context.productId,
            productCategoryId: context.productCategoryId,
        });

        // STEP 2: Fetch all active (confirmed) rules
        // Sort by updatedAt descending for tie-breaker
        const activeRules = await AutoAnalyticalModel.find({ status: 'confirmed' })
            .populate('analyticsId', 'name type')
            .populate('partnerId', 'name')
            .populate('partnerTagId', 'name displayName')
            .populate('productId', 'name')
            .populate('productCategoryId', 'name')
            .sort({ updatedAt: -1 })
            .lean();

        console.log(`[AutoAnalyticalService] Found ${activeRules.length} active rules`);

        if (activeRules.length === 0) {
            result.explanation = 'No active auto-analytical rules configured';
            result.processingTimeMs = Date.now() - startTime;
            return result;
        }

        // STEP 3: Evaluate each rule against the context
        const matches = [];
        for (const rule of activeRules) {
            const evaluation = evaluateRule(rule, context);

            if (evaluation.matches) {
                matches.push({
                    rule,
                    ...evaluation,
                    updatedAt: rule.updatedAt,
                });
            }
        }

        console.log(`[AutoAnalyticalService] ${matches.length} rules matched`);
        result.allMatches = matches.map(m => ({
            ruleId: m.rule._id,
            ruleName: m.rule.name,
            score: m.score,
            matchedFields: m.matchedFields,
        }));

        // STEP 3.5: If no rules match and AI is enabled, try AI recommendation
        if (matches.length === 0) {
            if (isAIEnabled()) {
                console.log('[AutoAnalyticalService] No rule match - trying AI recommendation');

                // Fetch enriched context and available analytics for AI
                const partner = partnerId ? await Contact.findById(partnerId).select('name partnerTags').populate('partnerTags', 'name displayName').lean() : null;
                const product = productId ? await Product.findById(productId).select('name category').populate('category', 'name').lean() : null;
                const availableAnalytics = await AnalyticMaster.find({ status: { $ne: 'archived' } }).select('_id name description type').lean();

                const enrichedContext = {
                    partnerName: partner?.name,
                    partnerTagNames: partner?.partnerTags?.map(t => t.displayName || t.name) || [],
                    productName: product?.name,
                    productCategoryName: product?.category?.name,
                };

                try {
                    const aiResult = await getAIRecommendation({
                        context: enrichedContext,
                        availableAnalytics,
                        historicalData: [], // Could fetch historical data here for better recommendations
                    });

                    if (aiResult.used && aiResult.recommendations.length > 0) {
                        const topRecommendation = aiResult.recommendations[0];
                        result.aiRecommendation = {
                            analyticsId: topRecommendation.analyticsId,
                            analyticsName: topRecommendation.analyticsName,
                            confidence: topRecommendation.confidence,
                            reason: topRecommendation.reason,
                            provider: aiResult.provider,
                        };
                        result.explanation = `No rules matched. AI suggests: ${topRecommendation.analyticsName} (confidence: ${(topRecommendation.confidence * 100).toFixed(0)}%). Note: AI suggestion is advisory only.`;
                        console.log(`[AutoAnalyticalService] AI recommendation: ${result.explanation}`);
                    } else {
                        result.explanation = 'No rules matched the transaction context. AI recommendation unavailable.';
                    }
                } catch (aiError) {
                    console.error('[AutoAnalyticalService] AI recommendation error:', aiError);
                    result.explanation = 'No rules matched the transaction context';
                }
            } else {
                result.explanation = 'No rules matched the transaction context';
            }

            result.processingTimeMs = Date.now() - startTime;
            return result;
        }


        // STEP 4: Priority resolution
        // Sort by score (descending), then by updatedAt (descending) for tie-breaker
        matches.sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score; // Higher score first
            }
            return new Date(b.updatedAt) - new Date(a.updatedAt); // Newer first
        });

        // STEP 5: Select the winning rule
        const winner = matches[0];
        result.matchedRule = {
            id: winner.rule._id,
            name: winner.rule.name,
            analyticsName: winner.rule.analyticsId?.name,
            score: winner.score,
            matchedFields: winner.matchedFields,
        };
        result.analyticsId = winner.rule.analyticsId?._id || winner.rule.analyticsId;

        // Build explanation
        const fieldDescriptions = winner.matchedFields.map(field => {
            switch (field) {
                case 'partnerId':
                    return `partner "${winner.rule.partnerId?.name || 'N/A'}"`;
                case 'partnerTagId':
                    return `partner tag "${winner.rule.partnerTagId?.displayName || winner.rule.partnerTagId?.name || 'N/A'}"`;
                case 'productId':
                    return `product "${winner.rule.productId?.name || 'N/A'}"`;
                case 'productCategoryId':
                    return `category "${winner.rule.productCategoryId?.name || 'N/A'}"`;
                default:
                    return field;
            }
        });

        const tieInfo = matches.filter(m => m.score === winner.score).length > 1
            ? ' (selected as most recently updated among equal-priority matches)'
            : '';

        result.explanation = `Matched rule "${winner.rule.name}" (priority ${winner.score}) based on: ${fieldDescriptions.join(', ')}${tieInfo}`;

        console.log(`[AutoAnalyticalService] Winner: ${result.explanation}`);

    } catch (error) {
        console.error('[AutoAnalyticalService] Error during recommendation:', error);
        result.explanation = `Error during auto-analytical processing: ${error.message}`;
    }

    result.processingTimeMs = Date.now() - startTime;
    return result;
}

/**
 * Process multiple lines at once (batch processing for efficiency)
 * 
 * @param {Array} lines - Array of { productId, ... }
 * @param {String} partnerId - Partner ID (same for all lines in a PO)
 * @returns {Array} Array of recommendation results, one per line
 */
async function recommendAnalyticsForLines(lines, partnerId) {
    const results = [];

    for (const line of lines) {
        const recommendation = await recommendAnalytics({
            productId: line.productId,
            partnerId,
        });
        results.push({
            lineProductId: line.productId,
            ...recommendation,
        });
    }

    return results;
}

module.exports = {
    recommendAnalytics,
    recommendAnalyticsForLines,
    buildTransactionContext, // Exported for testing
    evaluateRule, // Exported for testing
};
