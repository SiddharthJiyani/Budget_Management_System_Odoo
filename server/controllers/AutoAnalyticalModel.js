const AutoAnalyticalModel = require("../models/AutoAnalyticalModel");
const Contact = require("../models/Contact");
const Product = require("../models/Product");
const Category = require("../models/Category");
const PartnerTag = require("../models/PartnerTag");
const AnalyticMaster = require("../models/AnalyticMaster");

/**
 * AutoAnalyticalModel Controller
 * 
 * CRUD operations for managing auto-analytical rules.
 * These rules are configured by Admin and used to automatically
 * assign analytics to transaction lines.
 */

// Create a new auto-analytical rule
exports.createAutoAnalyticalModel = async (req, res) => {
    try {
        const { name, description, partnerId, partnerTagId, productId, productCategoryId, analyticsId } = req.body;

        // Validate required field
        if (!analyticsId) {
            return res.status(400).json({
                success: false,
                message: "Analytics ID is required",
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Rule name is required",
            });
        }

        // Validate at least one condition
        if (!partnerId && !partnerTagId && !productId && !productCategoryId) {
            return res.status(400).json({
                success: false,
                message: "At least one matching condition is required: partnerId, partnerTagId, productId, or productCategoryId",
            });
        }

        // Validate referenced entities exist
        if (partnerId) {
            const partner = await Contact.findById(partnerId);
            if (!partner) {
                return res.status(404).json({
                    success: false,
                    message: "Partner not found",
                });
            }
        }

        if (partnerTagId) {
            const tag = await PartnerTag.findById(partnerTagId);
            if (!tag) {
                return res.status(404).json({
                    success: false,
                    message: "Partner Tag not found",
                });
            }
        }

        if (productId) {
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found",
                });
            }
        }

        if (productCategoryId) {
            const category = await Category.findById(productCategoryId);
            if (!category) {
                return res.status(404).json({
                    success: false,
                    message: "Product Category not found",
                });
            }
        }

        const analytics = await AnalyticMaster.findById(analyticsId);
        if (!analytics) {
            return res.status(404).json({
                success: false,
                message: "Analytics/Cost Center not found",
            });
        }

        const rule = await AutoAnalyticalModel.create({
            name,
            description,
            partnerId: partnerId || null,
            partnerTagId: partnerTagId || null,
            productId: productId || null,
            productCategoryId: productCategoryId || null,
            analyticsId,
            status: 'draft',
            createdBy: req.user.id,
        });

        // Populate references for response
        await rule.populate([
            { path: 'partnerId', select: 'name email' },
            { path: 'partnerTagId', select: 'name displayName color' },
            { path: 'productId', select: 'name' },
            { path: 'productCategoryId', select: 'name' },
            { path: 'analyticsId', select: 'name description type' },
            { path: 'createdBy', select: 'firstName lastName email' },
        ]);

        console.log(`[AutoAnalyticalModel] Created rule: ${rule.name} (ID: ${rule._id})`);

        return res.status(201).json({
            success: true,
            message: "Auto-Analytical rule created successfully",
            data: rule,
        });
    } catch (error) {
        console.error("Create auto-analytical model error:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating auto-analytical rule",
            error: error.message,
        });
    }
};

// Get all rules with filtering
exports.getAllAutoAnalyticalModels = async (req, res) => {
    try {
        const { status, search, analyticsId, page = 1, limit = 20 } = req.query;

        let query = {};

        if (status && status !== 'all') {
            query.status = status;
        }

        if (analyticsId) {
            query.analyticsId = analyticsId;
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
            ];
        }

        const rules = await AutoAnalyticalModel.find(query)
            .populate('partnerId', 'name email')
            .populate('partnerTagId', 'name displayName color')
            .populate('productId', 'name')
            .populate('productCategoryId', 'name')
            .populate('analyticsId', 'name description type')
            .populate('createdBy', 'firstName lastName email')
            .sort({ status: 1, updatedAt: -1 }) // confirmed first, then by update time
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await AutoAnalyticalModel.countDocuments(query);

        return res.status(200).json({
            success: true,
            message: "Auto-Analytical rules retrieved successfully",
            data: {
                rules,
                totalPages: Math.ceil(count / limit),
                currentPage: parseInt(page),
                totalRules: count,
            },
        });
    } catch (error) {
        console.error("Get auto-analytical models error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving auto-analytical rules",
            error: error.message,
        });
    }
};

// Get single rule by ID
exports.getAutoAnalyticalModelById = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await AutoAnalyticalModel.findById(id)
            .populate('partnerId', 'name email phone')
            .populate('partnerTagId', 'name displayName color')
            .populate('productId', 'name category')
            .populate('productCategoryId', 'name')
            .populate('analyticsId', 'name description type startDate endDate')
            .populate('createdBy', 'firstName lastName email');

        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Auto-Analytical rule not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Auto-Analytical rule retrieved successfully",
            data: rule,
        });
    } catch (error) {
        console.error("Get auto-analytical model error:", error);
        return res.status(500).json({
            success: false,
            message: "Error retrieving auto-analytical rule",
            error: error.message,
        });
    }
};

// Update rule
exports.updateAutoAnalyticalModel = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, partnerId, partnerTagId, productId, productCategoryId, analyticsId } = req.body;

        const rule = await AutoAnalyticalModel.findById(id);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Auto-Analytical rule not found",
            });
        }

        // Only draft rules can be edited
        if (rule.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft rules can be edited. Archive this rule and create a new one.",
            });
        }

        // Update fields if provided
        if (name !== undefined) rule.name = name;
        if (description !== undefined) rule.description = description;
        if (partnerId !== undefined) rule.partnerId = partnerId || null;
        if (partnerTagId !== undefined) rule.partnerTagId = partnerTagId || null;
        if (productId !== undefined) rule.productId = productId || null;
        if (productCategoryId !== undefined) rule.productCategoryId = productCategoryId || null;
        if (analyticsId !== undefined) rule.analyticsId = analyticsId;

        await rule.save();

        await rule.populate([
            { path: 'partnerId', select: 'name email' },
            { path: 'partnerTagId', select: 'name displayName color' },
            { path: 'productId', select: 'name' },
            { path: 'productCategoryId', select: 'name' },
            { path: 'analyticsId', select: 'name description type' },
            { path: 'createdBy', select: 'firstName lastName email' },
        ]);

        console.log(`[AutoAnalyticalModel] Updated rule: ${rule.name} (ID: ${rule._id})`);

        return res.status(200).json({
            success: true,
            message: "Auto-Analytical rule updated successfully",
            data: rule,
        });
    } catch (error) {
        console.error("Update auto-analytical model error:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating auto-analytical rule",
            error: error.message,
        });
    }
};

// Confirm (activate) rule
exports.confirmAutoAnalyticalModel = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await AutoAnalyticalModel.findById(id);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Auto-Analytical rule not found",
            });
        }

        if (rule.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft rules can be confirmed",
            });
        }

        rule.status = 'confirmed';
        await rule.save();

        console.log(`[AutoAnalyticalModel] Confirmed rule: ${rule.name} (ID: ${rule._id}) - now active for matching`);

        return res.status(200).json({
            success: true,
            message: "Auto-Analytical rule confirmed and activated",
            data: rule,
        });
    } catch (error) {
        console.error("Confirm auto-analytical model error:", error);
        return res.status(500).json({
            success: false,
            message: "Error confirming auto-analytical rule",
            error: error.message,
        });
    }
};

// Archive rule
exports.archiveAutoAnalyticalModel = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await AutoAnalyticalModel.findById(id);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Auto-Analytical rule not found",
            });
        }

        if (rule.status === 'archived') {
            return res.status(400).json({
                success: false,
                message: "Rule is already archived",
            });
        }

        rule.status = 'archived';
        await rule.save();

        console.log(`[AutoAnalyticalModel] Archived rule: ${rule.name} (ID: ${rule._id}) - no longer active`);

        return res.status(200).json({
            success: true,
            message: "Auto-Analytical rule archived",
            data: rule,
        });
    } catch (error) {
        console.error("Archive auto-analytical model error:", error);
        return res.status(500).json({
            success: false,
            message: "Error archiving auto-analytical rule",
            error: error.message,
        });
    }
};

// Delete rule (hard delete - only draft rules)
exports.deleteAutoAnalyticalModel = async (req, res) => {
    try {
        const { id } = req.params;

        const rule = await AutoAnalyticalModel.findById(id);
        if (!rule) {
            return res.status(404).json({
                success: false,
                message: "Auto-Analytical rule not found",
            });
        }

        // Only draft rules can be deleted, others should be archived
        if (rule.status !== 'draft') {
            return res.status(400).json({
                success: false,
                message: "Only draft rules can be deleted. Archive confirmed rules instead.",
            });
        }

        await AutoAnalyticalModel.findByIdAndDelete(id);

        console.log(`[AutoAnalyticalModel] Deleted rule: ${rule.name} (ID: ${rule._id})`);

        return res.status(200).json({
            success: true,
            message: "Auto-Analytical rule deleted successfully",
        });
    } catch (error) {
        console.error("Delete auto-analytical model error:", error);
        return res.status(500).json({
            success: false,
            message: "Error deleting auto-analytical rule",
            error: error.message,
        });
    }
};

// Test rule matching (debug endpoint)
exports.testRuleMatching = async (req, res) => {
    try {
        const { productId, partnerId } = req.body;
        const { recommendAnalytics } = require("../services/AutoAnalyticalService");

        if (!productId && !partnerId) {
            return res.status(400).json({
                success: false,
                message: "At least productId or partnerId is required for testing",
            });
        }

        const result = await recommendAnalytics({ productId, partnerId });

        return res.status(200).json({
            success: true,
            message: "Rule matching test completed",
            data: result,
        });
    } catch (error) {
        console.error("Test rule matching error:", error);
        return res.status(500).json({
            success: false,
            message: "Error testing rule matching",
            error: error.message,
        });
    }
};

/**
 * Get AI-powered analytics recommendations based on historical purchase data
 * 
 * NEW ENDPOINT: Uses LLM (Gemini/Groq) to analyze ALL previous orders and purchases
 * to suggest analytics based on learned patterns.
 * 
 * This endpoint:
 * 1. Fetches historical purchase orders filtered by vendor/product/category
 * 2. Analyzes purchasing patterns and analytics assignments
 * 3. Feeds data to AI (Gemini/OpenAI/Groq) for intelligent suggestions
 * 4. Returns both AI recommendations AND statistical patterns
 * 
 * Use this for intelligent, pattern-based suggestions when:
 * - Creating new purchase orders
 * - Vendor bill entry
 * - Budget planning based on historical spending
 */
exports.getAIRecommendation = async (req, res) => {
    try {
        const { productId, partnerId, productCategoryId, historicalLimit } = req.body;
        const { getAIRecommendationWithHistory } = require("../services/AIRecommendationService");
        
        // At least one context field required
        if (!productId && !partnerId && !productCategoryId) { 
            return res.status(400).json({
                success: false,
                message: "At least one of productId, partnerId, or productCategoryId is required",
            });
        }

        // Build transaction context
        const context = {
            partnerId,
            productId,
            productCategoryId,
        };

        // Enrich context with names for better AI prompts
        if (partnerId) {
            const partner = await Contact.findById(partnerId).select('name tags').lean();
            if (partner) {
                context.partnerName = partner.name;
                if (partner.tags && partner.tags.length > 0) {
                    const tags = await PartnerTag.find({ _id: { $in: partner.tags } }).select('name').lean();
                    console.log('tags', tags);
                    const tags1 = await PartnerTag.find({ _id: { $in: partner.tags } }).select('name').lean();
                    console.log("=================================================================")
                    console.log('tags1', tags1);

                    // context.partnerTagNames = tags.map(t => t.name);
                    let tagsnames   = [] ;
                    for(let i = 0 ; i < tags.length ; i++){
                        tagsnames.push(tags[i].name);
                    }
                    context.partnerTagNames = tagsnames;
                }
            }
        }

        if (productId) {
            const product = await Product.findById(productId)
                .select('name category')
                .populate('category', 'name')
                .lean();
            if (product) {
                context.productName = product.name;
                context.productCategoryName = product.category?.name;
                // If category not explicitly provided, use product's category
                if (!productCategoryId && product.category) {
                    context.productCategoryId = product.category._id.toString();
                }
            }
        }

        if (productCategoryId && !context.productCategoryName) {
            const category = await Category.findById(productCategoryId).select('name').lean();
            if (category) {
                context.productCategoryName = category.name;
            }
        }

        // Get all available analytics
        const availableAnalytics = await AnalyticMaster.find({ status: 'confirmed' })
            .select('name description type')
            .lean();

        if (availableAnalytics.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No confirmed analytics available in the system",
            });
        }

        console.log(`[AI Recommendation API] Analyzing historical data for context:`, {
            partner: context.partnerName,
            product: context.productName,
            category: context.productCategoryName,
        });

        // Call AI service with historical analysis
        const aiResult = await getAIRecommendationWithHistory({
            context,
            availableAnalytics,
            historicalLimit: historicalLimit || 50,
            includeStatistical: true,
        });

        // Prepare response
        const response = {
            success: true,
            message: "AI recommendation completed",
            data: {
                context: {
                    partner: context.partnerName,
                    product: context.productName,
                    category: context.productCategoryName,
                },
                aiRecommendations: aiResult.recommendations,
                statisticalRecommendations: aiResult.statisticalRecommendations,
                historicalSummary: aiResult.historicalDataSummary,
                metadata: {
                    aiEnabled: aiResult.used,
                    aiProvider: aiResult.provider,
                    processingTime: aiResult.duration,
                    error: aiResult.error,
                },
            },
        };

        // Log insights
        console.log(`[AI Recommendation API] Results:`, {
            aiRecommendations: aiResult.recommendations.length,
            statisticalRecommendations: aiResult.statisticalRecommendations.length,
            historicalRecords: aiResult.historicalDataSummary?.totalHistoricalRecords || 0,
            aiUsed: aiResult.used,
            duration: aiResult.duration,
        });

        return res.status(200).json(response);

    } catch (error) {
        console.error("[AI Recommendation API] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error generating AI recommendations",
            error: error.message,
        });
    }
};
