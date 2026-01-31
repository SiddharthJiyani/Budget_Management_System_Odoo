/**
 * Historical Data Service
 * 
 * Fetches and aggregates historical purchase/order data from the database
 * to feed into AI for pattern-based analytics recommendations.
 * 
 * This service analyzes:
 * - Past Purchase Orders
 * - Past Vendor Bills
 * - Product purchasing patterns
 * - Vendor-specific analytics usage
 * - Category-based trends
 */

const PurchaseOrder = require("../models/PurchaseOrder");
const VendorBill = require("../models/VendorBill");
const Product = require("../models/Product");
const Contact = require("../models/Contact");
const AnalyticMaster = require("../models/AnalyticMaster");

/**
 * Get historical data for AI-based recommendation
 * 
 * Fetches relevant historical transactions to identify patterns
 * 
 * @param {Object} context - Current transaction context
 * @param {string} context.partnerId - Vendor/Partner ID
 * @param {string} context.productId - Product ID
 * @param {string} context.productCategoryId - Product Category ID
 * @param {number} limit - Max number of historical records to fetch (default: 50)
 * @returns {Promise<Object>} Historical data aggregation
 */
async function getHistoricalDataForAI(context, limit = 50) {
    const { partnerId, productId, productCategoryId } = context;
    
    const historicalData = {
        partnerHistory: [],
        productHistory: [],
        categoryHistory: [],
        recentOrders: [],
        analyticsUsagePatterns: {},
        summary: {}
    };

    try {
        // 1. Get partner-specific history (vendor purchasing patterns)
        if (partnerId) {
            const partnerPOs = await PurchaseOrder.find({
                vendorId: partnerId,
                status: { $in: ['confirmed', 'completed'] }
            })
            .populate('lines.productId', 'name category')
            .populate('lines.budgetAnalyticId', 'name type')
            .populate('vendorId', 'name')
            .sort({ poDate: -1 })
            .limit(limit)
            .lean();

            historicalData.partnerHistory = partnerPOs.flatMap(po => 
                po.lines.map(line => ({
                    date: po.poDate,
                    vendorName: po.vendorId?.name,
                    productName: line.productId?.name,
                    productCategory: line.productId?.category?.toString(),
                    analyticsId: line.budgetAnalyticId?._id?.toString(),
                    analyticsName: line.budgetAnalyticId?.name,
                    analyticsType: line.budgetAnalyticId?.type,
                    amount: line.lineTotal,
                    autoAssigned: line.autoAssigned || false,
                    source: 'PurchaseOrder'
                }))
            );
        }

        // 2. Get product-specific history (how this product was categorized before)
        if (productId) {
            const productPOs = await PurchaseOrder.find({
                'lines.productId': productId,
                status: { $in: ['confirmed', 'completed'] }
            })
            .populate('lines.budgetAnalyticId', 'name type')
            .populate('vendorId', 'name')
            .sort({ poDate: -1 })
            .limit(limit)
            .lean();

            historicalData.productHistory = productPOs.flatMap(po => 
                po.lines
                    .filter(line => line.productId?.toString() === productId)
                    .map(line => ({
                        date: po.poDate,
                        vendorName: po.vendorId?.name,
                        analyticsId: line.budgetAnalyticId?._id?.toString(),
                        analyticsName: line.budgetAnalyticId?.name,
                        analyticsType: line.budgetAnalyticId?.type,
                        amount: line.lineTotal,
                        autoAssigned: line.autoAssigned || false,
                        source: 'PurchaseOrder'
                    }))
            );
        }

        // 3. Get category-specific history (category trends)
        if (productCategoryId) {
            // First, get all products in this category
            const categoryProducts = await Product.find({ 
                category: productCategoryId 
            }).select('_id').lean();
            
            const productIds = categoryProducts.map(p => p._id);

            if (productIds.length > 0) {
                const categoryPOs = await PurchaseOrder.find({
                    'lines.productId': { $in: productIds },
                    status: { $in: ['confirmed', 'completed'] }
                })
                .populate('lines.productId', 'name')
                .populate('lines.budgetAnalyticId', 'name type')
                .sort({ poDate: -1 })
                .limit(limit)
                .lean();

                historicalData.categoryHistory = categoryPOs.flatMap(po => 
                    po.lines
                        .filter(line => productIds.some(id => id.toString() === line.productId?._id?.toString()))
                        .map(line => ({
                            date: po.poDate,
                            productName: line.productId?.name,
                            analyticsId: line.budgetAnalyticId?._id?.toString(),
                            analyticsName: line.budgetAnalyticId?.name,
                            analyticsType: line.budgetAnalyticId?.type,
                            amount: line.lineTotal,
                            autoAssigned: line.autoAssigned || false,
                            source: 'PurchaseOrder'
                        }))
                );
            }
        }

        // 4. Get recent orders overall (general trends)
        const recentPOs = await PurchaseOrder.find({
            status: { $in: ['confirmed', 'completed'] }
        })
        .populate('lines.productId', 'name category')
        .populate('lines.budgetAnalyticId', 'name type')
        .populate('vendorId', 'name')
        .sort({ poDate: -1 })
        .limit(20)
        .lean();

        historicalData.recentOrders = recentPOs.flatMap(po => 
            po.lines.map(line => ({
                date: po.poDate,
                vendorName: po.vendorId?.name,
                productName: line.productId?.name,
                analyticsId: line.budgetAnalyticId?._id?.toString(),
                analyticsName: line.budgetAnalyticId?.name,
                analyticsType: line.budgetAnalyticId?.type,
                amount: line.lineTotal,
                autoAssigned: line.autoAssigned || false,
                source: 'PurchaseOrder'
            }))
        );

        // 5. Calculate analytics usage patterns (frequency analysis)
        const allHistoricalLines = [
            ...historicalData.partnerHistory,
            ...historicalData.productHistory,
            ...historicalData.categoryHistory
        ];

        const analyticsCount = {};
        allHistoricalLines.forEach(line => {
            if (line.analyticsId) {
                if (!analyticsCount[line.analyticsId]) {
                    analyticsCount[line.analyticsId] = {
                        analyticsId: line.analyticsId,
                        analyticsName: line.analyticsName,
                        analyticsType: line.analyticsType,
                        count: 0,
                        totalAmount: 0,
                        autoAssignedCount: 0
                    };
                }
                analyticsCount[line.analyticsId].count++;
                analyticsCount[line.analyticsId].totalAmount += line.amount || 0;
                if (line.autoAssigned) {
                    analyticsCount[line.analyticsId].autoAssignedCount++;
                }
            }
        });

        historicalData.analyticsUsagePatterns = Object.values(analyticsCount)
            .sort((a, b) => b.count - a.count);

        // 6. Generate summary statistics
        historicalData.summary = {
            totalHistoricalRecords: allHistoricalLines.length,
            uniqueAnalytics: Object.keys(analyticsCount).length,
            partnerHistoryCount: historicalData.partnerHistory.length,
            productHistoryCount: historicalData.productHistory.length,
            categoryHistoryCount: historicalData.categoryHistory.length,
            mostUsedAnalytics: historicalData.analyticsUsagePatterns[0]?.analyticsName || null,
            hasRelevantHistory: allHistoricalLines.length > 0
        };

        console.log('[HistoricalDataService] Summary:', historicalData.summary);

    } catch (error) {
        console.error('[HistoricalDataService] Error fetching historical data:', error);
        // Return empty data on error - don't fail the whole recommendation
    }

    return historicalData;
}

/**
 * Format historical data for LLM consumption
 * 
 * Converts raw historical data into a concise, LLM-friendly format
 * 
 * @param {Object} historicalData - Raw historical data from getHistoricalDataForAI
 * @returns {string} Formatted text summary
 */
function formatHistoricalDataForLLM(historicalData) {
    const { partnerHistory, productHistory, categoryHistory, analyticsUsagePatterns, summary } = historicalData;

    let formatted = `HISTORICAL PURCHASE DATA ANALYSIS:\n\n`;

    // Summary
    formatted += `SUMMARY:\n`;
    formatted += `- Total historical records: ${summary.totalHistoricalRecords}\n`;
    formatted += `- Partner-specific records: ${summary.partnerHistoryCount}\n`;
    formatted += `- Product-specific records: ${summary.productHistoryCount}\n`;
    formatted += `- Category-specific records: ${summary.categoryHistoryCount}\n`;
    formatted += `- Relevant history available: ${summary.hasRelevantHistory ? 'Yes' : 'No'}\n\n`;

    // Partner purchasing patterns
    if (partnerHistory.length > 0) {
        formatted += `VENDOR PURCHASING PATTERNS (Last ${Math.min(10, partnerHistory.length)} orders):\n`;
        partnerHistory.slice(0, 10).forEach((record, index) => {
            formatted += `${index + 1}. ${record.productName || 'Unknown Product'} → ${record.analyticsName || 'No Analytics'} (${record.autoAssigned ? 'Auto' : 'Manual'})\n`;
        });
        formatted += `\n`;
    }

    // Product-specific history
    if (productHistory.length > 0) {
        formatted += `THIS PRODUCT'S HISTORY (Last ${Math.min(5, productHistory.length)} purchases):\n`;
        productHistory.slice(0, 5).forEach((record, index) => {
            formatted += `${index + 1}. Bought from ${record.vendorName || 'Unknown'} → ${record.analyticsName || 'No Analytics'} (${record.autoAssigned ? 'Auto' : 'Manual'})\n`;
        });
        formatted += `\n`;
    }

    // Category trends
    if (categoryHistory.length > 0) {
        formatted += `CATEGORY PURCHASING TRENDS (Last ${Math.min(5, categoryHistory.length)} orders):\n`;
        categoryHistory.slice(0, 5).forEach((record, index) => {
            formatted += `${index + 1}. ${record.productName || 'Unknown'} → ${record.analyticsName || 'No Analytics'}\n`;
        });
        formatted += `\n`;
    }

    // Analytics usage patterns
    if (analyticsUsagePatterns.length > 0) {
        formatted += `MOST FREQUENTLY USED ANALYTICS (Top ${Math.min(5, analyticsUsagePatterns.length)}):\n`;
        analyticsUsagePatterns.slice(0, 5).forEach((pattern, index) => {
            const autoPercent = pattern.count > 0 
                ? ((pattern.autoAssignedCount / pattern.count) * 100).toFixed(0) 
                : 0;
            formatted += `${index + 1}. ${pattern.analyticsName} - Used ${pattern.count} times (${autoPercent}% auto-assigned)\n`;
        });
        formatted += `\n`;
    }

    if (!summary.hasRelevantHistory) {
        formatted += `NOTE: No historical data available for this vendor/product/category combination.\n`;
        formatted += `Recommendation should be based on general patterns and available analytics options.\n`;
    }

    return formatted;
}

/**
 * Get top analytics recommendations based on historical patterns
 * (Pure statistical approach - without AI)
 * 
 * @param {Object} historicalData - Historical data from getHistoricalDataForAI
 * @param {number} topN - Number of recommendations to return
 * @returns {Array} Top analytics recommendations with confidence scores
 */
function getStatisticalRecommendations(historicalData, topN = 3) {
    const { analyticsUsagePatterns, summary } = historicalData;

    if (!summary.hasRelevantHistory || analyticsUsagePatterns.length === 0) {
        return [];
    }

    const recommendations = analyticsUsagePatterns.slice(0, topN).map(pattern => {
        // Calculate confidence based on frequency and auto-assignment rate
        const frequencyScore = Math.min(pattern.count / 10, 1); // Normalize to max 10 occurrences
        const autoAssignRate = pattern.count > 0 
            ? pattern.autoAssignedCount / pattern.count 
            : 0;
        
        // Higher confidence if frequently used AND often auto-assigned
        const confidence = (frequencyScore * 0.7) + (autoAssignRate * 0.3);

        return {
            analyticsId: pattern.analyticsId,
            analyticsName: pattern.analyticsName,
            confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
            reason: `Used ${pattern.count} times in similar contexts (${((autoAssignRate * 100).toFixed(0))}% auto-assigned)`,
            source: 'statistical_analysis'
        };
    });

    return recommendations;
}

module.exports = {
    getHistoricalDataForAI,
    formatHistoricalDataForLLM,
    getStatisticalRecommendations
};
