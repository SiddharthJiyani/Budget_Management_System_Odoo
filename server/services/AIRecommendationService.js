/**
 * AIRecommendationService
 * 
 * Enhanced AI layer for analytics recommendations with historical data analysis.
 * This service can be used in TWO modes:
 * 
 * MODE 1 - Fallback (Original):
 * - When multiple rules match with equal priority (tie)
 * - When no rule matches at all
 * 
 * MODE 2 - AI-First (New):
 * - Analyzes ALL historical purchase orders and vendor bills
 * - Identifies patterns in past analytics assignments
 * - Uses LLM to suggest analytics based on purchasing history
 * - Can be triggered explicitly via API for intelligent suggestions
 * 
 * The AI provides ranked suggestions with confidence scores.
 * 
 * IMPORTANT: This service is behind a feature flag (AI_RECOMMENDATION_ENABLED)
 * and will gracefully fallback to rule-only logic on any error.
 */

const HistoricalDataService = require('./HistoricalDataService');

// Configuration
const AI_TIMEOUT_MS = 10000; // 10 second timeout (increased for historical analysis)
const DEFAULT_PROVIDER = 'gemini'; // Default AI provider

/**
 * Check if AI recommendations are enabled
 * @returns {boolean}
 */
function isAIEnabled() {
    return process.env.AI_RECOMMENDATION_ENABLED === 'true';
}

/**
 * Get the configured AI provider
 * @returns {string} Provider name: 'gemini' | 'openai' | 'groq'
 */
function getAIProvider() {
    return process.env.AI_PROVIDER || DEFAULT_PROVIDER;
}

/**
 * Build a prompt for AI recommendation based on transaction context
 * 
 * Enhanced with comprehensive historical data analysis
 * 
 * @param {Object} context - Transaction context
 * @param {Array} availableAnalytics - List of available analytics options
 * @param {Object|Array} historicalData - Either raw array (old) or formatted object (new)
 * @returns {string} Formatted prompt
 */
function buildPrompt(context, availableAnalytics, historicalData = null) {
    const analyticsOptions = availableAnalytics.map(a =>
        `- ${a.name} (${a.type}): ${a.description || 'No description'}`
    ).join('\n');

    // Handle both old format (array) and new format (object from HistoricalDataService)
    let historyContext = 'No historical data available';
    
    if (historicalData) {
        if (typeof historicalData === 'string') {
            // Already formatted by HistoricalDataService
            historyContext = historicalData;
        } else if (Array.isArray(historicalData)) {
            // Legacy format - simple array
            historyContext = historicalData.length > 0
                ? historicalData.slice(0, 10).map(h =>
                    `- Product: ${h.productName}, Partner: ${h.partnerName}, Analytics: ${h.analyticsName}`
                ).join('\n')
                : 'No historical data available';
        } else if (historicalData.summary) {
            // New format - comprehensive historical data object
            historyContext = HistoricalDataService.formatHistoricalDataForLLM(historicalData);
        }
    }

    return `You are an expert ERP budget analytics assistant with deep knowledge of purchasing patterns and cost allocation.

CURRENT TRANSACTION CONTEXT:
- Partner/Vendor: ${context.partnerName || 'Unknown'}
- Partner Tags: ${context.partnerTagNames?.join(', ') || 'None'}
- Product: ${context.productName || 'Unknown'}
- Product Category: ${context.productCategoryName || 'Unknown'}
- Quantity: ${context.quantity || 'N/A'}
- Unit Price: ${context.unitPrice || 'N/A'}

AVAILABLE ANALYTICS OPTIONS:
${analyticsOptions}

${historyContext}

TASK:
Based on the historical purchasing patterns above and the current transaction context, recommend the most appropriate budget analytics/cost center for this purchase.

ANALYSIS GUIDELINES:
1. Prioritize patterns from the SAME vendor if available
2. Consider how THIS specific product was categorized before
3. Look for category-wide trends if product-specific data is limited
4. Factor in the most frequently used analytics for similar purchases
5. If historical data is sparse, use general business logic and product/vendor characteristics

RESPONSE FORMAT:
Respond with a JSON array of recommendations, ranked by confidence (0-1). Format:
[
  { 
    "analyticsId": "<id>", 
    "analyticsName": "<name>", 
    "confidence": 0.85, 
    "reason": "Brief explanation referencing historical patterns or business logic" 
  },
  ...
]

Provide up to 3 recommendations. Use confidence scores intelligently:
- 0.8-1.0: Strong historical pattern (vendor frequently uses this analytics)
- 0.6-0.8: Moderate pattern (category or product trend)
- 0.4-0.6: Weak pattern or educated guess
- Below 0.4: Very uncertain, limited data

IMPORTANT: Ensure analyticsId values match EXACTLY with the IDs from the available analytics options above.`;
}

/**
 * Call Gemini API for recommendations
 * 
 * @param {string} prompt - The formatted prompt
 * @returns {Promise<Array>} Ranked recommendations
 */
async function callGeminiAPI(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
    }

    // Using fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.3, // Lower temperature for more deterministic output
                        maxOutputTokens: 500,
                    }
                }),
                signal: controller.signal,
            }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return [];
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('AI request timed out');
        }
        throw error;
    }
}

/**
 * Call OpenAI API for recommendations
 * 
 * @param {string} prompt - The formatted prompt
 * @returns {Promise<Array>} Ranked recommendations
 */
async function callOpenAIAPI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are an ERP budget analytics assistant. Respond only with valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 500,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return [];
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('AI request timed out');
        }
        throw error;
    }
}

/**
 * Call Groq API for recommendations
 * 
 * @param {string} prompt - The formatted prompt
 * @returns {Promise<Array>} Ranked recommendations
 */
async function callGroqAPI(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error('GROQ_API_KEY not configured');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are an ERP budget analytics assistant. Respond only with valid JSON.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3,
                max_tokens: 500,
            }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return [];
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('AI request timed out');
        }
        throw error;
    }
}

/**
 * Get AI recommendations for analytics assignment
 * 
 * This is called by the AutoAnalyticalService when:
 * - Multiple rules match with equal priority
 * - No rules match at all
 * 
 * @param {Object} params - Request parameters
 * @param {Object} params.context - Enriched transaction context (with names, not just IDs)
 * @param {Array} params.availableAnalytics - Available analytics options
 * @param {Array} params.historicalData - Optional historical transactions for context
 * @returns {Promise<Object>} AI recommendation result
 */
async function getAIRecommendation({ context, availableAnalytics, historicalData = [] }) {
    const result = {
        recommendations: [],
        used: false,
        provider: null,
        error: null,
        duration: 0,
    };

    // Check if AI is enabled
    if (!isAIEnabled()) {
        result.error = 'AI recommendations disabled by feature flag';
        console.log('[AIRecommendationService] Skipped - feature flag disabled');
        return result;
    }

    if (!availableAnalytics || availableAnalytics.length === 0) {
        result.error = 'No analytics options available';
        return result;
    }

    const startTime = Date.now();
    const provider = getAIProvider();
    result.provider = provider;

    try {
        const prompt = buildPrompt(context, availableAnalytics, historicalData);

        console.log(`[AIRecommendationService] Calling ${provider} API...`);

        let recommendations;
        switch (provider) {
            case 'gemini':
                recommendations = await callGeminiAPI(prompt);
                break;
            case 'openai':
                recommendations = await callOpenAIAPI(prompt);
                break;
            case 'groq':
                recommendations = await callGroqAPI(prompt);
                break;
            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }

        // Validate and normalize recommendations
        result.recommendations = (recommendations || [])
            .filter(r => r.analyticsId && typeof r.confidence === 'number')
            .map(r => ({
                analyticsId: r.analyticsId,
                analyticsName: r.analyticsName,
                confidence: Math.min(1, Math.max(0, r.confidence)), // Clamp to 0-1
                reason: r.reason || 'AI recommendation',
            }))
            .sort((a, b) => b.confidence - a.confidence); // Sort by confidence desc

        result.used = result.recommendations.length > 0;
        result.duration = Date.now() - startTime;

        console.log(`[AIRecommendationService] Got ${result.recommendations.length} recommendations in ${result.duration}ms`);

    } catch (error) {
        result.error = error.message;
        result.duration = Date.now() - startTime;
        console.error(`[AIRecommendationService] Error: ${error.message}`);

        // Don't throw - graceful degradation to rule-only logic
    }

    return result;
}

/**
 * Get AI-powered recommendations with comprehensive historical analysis
 * 
 * NEW MODE: Proactive AI recommendations based on historical purchase patterns
 * 
 * This function:
 * 1. Fetches ALL historical purchase orders and vendor bills
 * 2. Analyzes patterns (vendor preferences, product history, category trends)
 * 3. Feeds rich historical context to LLM
 * 4. Returns AI-powered analytics suggestions based on learned patterns
 * 
 * Use this when you want AI to make intelligent suggestions based on
 * the organization's purchasing history, not just rule-based matching.
 * 
 * @param {Object} params - Request parameters
 * @param {Object} params.context - Transaction context (partnerId, productId, etc.)
 * @param {Array} params.availableAnalytics - Available analytics options
 * @param {number} params.historicalLimit - Max historical records to analyze (default: 50)
 * @param {boolean} params.includeStatistical - Include pure statistical recommendations (default: true)
 * @returns {Promise<Object>} Enhanced AI recommendation result
 */
async function getAIRecommendationWithHistory({ 
    context, 
    availableAnalytics, 
    historicalLimit = 50,
    includeStatistical = true 
}) {
    const result = {
        recommendations: [],
        statisticalRecommendations: [],
        used: false,
        provider: null,
        error: null,
        duration: 0,
        historicalDataSummary: null,
    };

    // Check if AI is enabled
    if (!isAIEnabled()) {
        result.error = 'AI recommendations disabled by feature flag';
        console.log('[AIRecommendationService] Skipped - feature flag disabled');
        
        // Even without AI, we can provide statistical recommendations
        if (includeStatistical) {
            try {
                const historicalData = await HistoricalDataService.getHistoricalDataForAI(
                    context, 
                    historicalLimit
                );
                result.statisticalRecommendations = HistoricalDataService.getStatisticalRecommendations(
                    historicalData,
                    3
                );
                result.historicalDataSummary = historicalData.summary;
                console.log('[AIRecommendationService] Provided statistical recommendations (AI disabled)');
            } catch (histError) {
                console.error('[AIRecommendationService] Error getting statistical recommendations:', histError);
            }
        }
        
        return result;
    }

    if (!availableAnalytics || availableAnalytics.length === 0) {
        result.error = 'No analytics options available';
        return result;
    }

    const startTime = Date.now();
    const provider = getAIProvider();
    result.provider = provider;

    try {
        // 1. Fetch comprehensive historical data
        console.log('[AIRecommendationService] Fetching historical data for AI analysis...');
        const historicalData = await HistoricalDataService.getHistoricalDataForAI(
            context, 
            historicalLimit
        );
        
        result.historicalDataSummary = historicalData.summary;

        // 2. Get statistical recommendations (pattern-based, no AI)
        if (includeStatistical) {
            result.statisticalRecommendations = HistoricalDataService.getStatisticalRecommendations(
                historicalData,
                3
            );
        }

        // 3. Build enhanced prompt with historical context
        const prompt = buildPrompt(context, availableAnalytics, historicalData);

        console.log(`[AIRecommendationService] Calling ${provider} API with historical context...`);
        console.log(`[AIRecommendationService] Historical records: ${historicalData.summary.totalHistoricalRecords}`);

        // 4. Call AI provider
        let recommendations;
        switch (provider) {
            case 'gemini':
                recommendations = await callGeminiAPI(prompt);
                break;
            case 'openai':
                recommendations = await callOpenAIAPI(prompt);
                break;
            case 'groq':
                recommendations = await callGroqAPI(prompt);
                break;
            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }

        // 5. Validate and normalize AI recommendations
        result.recommendations = (recommendations || [])
            .filter(r => r.analyticsId && typeof r.confidence === 'number')
            .map(r => ({
                analyticsId: r.analyticsId,
                analyticsName: r.analyticsName,
                confidence: Math.min(1, Math.max(0, r.confidence)),
                reason: r.reason || 'AI recommendation based on historical patterns',
                source: 'ai_historical_analysis',
            }))
            .sort((a, b) => b.confidence - a.confidence);

        result.used = result.recommendations.length > 0;
        result.duration = Date.now() - startTime;

        console.log(`[AIRecommendationService] Historical AI Analysis Complete:`);
        console.log(`  - AI Recommendations: ${result.recommendations.length}`);
        console.log(`  - Statistical Recommendations: ${result.statisticalRecommendations.length}`);
        console.log(`  - Duration: ${result.duration}ms`);
        console.log(`  - Historical Records Analyzed: ${historicalData.summary.totalHistoricalRecords}`);

    } catch (error) {
        result.error = error.message;
        result.duration = Date.now() - startTime;
        console.error(`[AIRecommendationService] Error in historical analysis: ${error.message}`);

        // If AI fails but we have statistical recommendations, that's still valuable
        if (result.statisticalRecommendations.length > 0) {
            console.log(`[AIRecommendationService] AI failed, but ${result.statisticalRecommendations.length} statistical recommendations available`);
        }
    }

    return result;
}

module.exports = {
    getAIRecommendation,
    getAIRecommendationWithHistory, // NEW: AI + Historical Analysis
    isAIEnabled,
    getAIProvider,
    // Exported for testing
    buildPrompt,
    callGeminiAPI,
    callOpenAIAPI,
    callGroqAPI,
};
