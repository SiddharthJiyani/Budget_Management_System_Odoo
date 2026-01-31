/**
 * AIRecommendationService
 * 
 * Advisory AI layer for analytics recommendations.
 * This service is used ONLY when:
 * 1. Multiple rules match with equal priority (tie)
 * 2. No rule matches at all
 * 
 * The AI provides ranked suggestions with confidence scores,
 * but the rule engine always has final authority.
 * 
 * IMPORTANT: This service is behind a feature flag (AI_RECOMMENDATION_ENABLED)
 * and will gracefully fallback to rule-only logic on any error.
 */

// Configuration
const AI_TIMEOUT_MS = 3000; // 3 second timeout
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
 * @param {Object} context - Transaction context
 * @param {Array} availableAnalytics - List of available analytics options
 * @param {Array} historicalData - Past transactions for reference
 * @returns {string} Formatted prompt
 */
function buildPrompt(context, availableAnalytics, historicalData = []) {
    const analyticsOptions = availableAnalytics.map(a =>
        `- ${a.name} (${a.type}): ${a.description || 'No description'}`
    ).join('\n');

    const historyContext = historicalData.length > 0
        ? historicalData.slice(0, 10).map(h =>
            `- Product: ${h.productName}, Partner: ${h.partnerName}, Analytics: ${h.analyticsName}`
        ).join('\n')
        : 'No historical data available';

    return `You are an ERP budget analytics assistant. Based on the transaction context below, recommend the most appropriate analytics/cost center.

TRANSACTION CONTEXT:
- Partner/Vendor: ${context.partnerName || 'Unknown'}
- Partner Tags: ${context.partnerTagNames?.join(', ') || 'None'}
- Product: ${context.productName || 'Unknown'}
- Product Category: ${context.productCategoryName || 'Unknown'}

AVAILABLE ANALYTICS OPTIONS:
${analyticsOptions}

HISTORICAL SIMILAR TRANSACTIONS:
${historyContext}

Please respond with a JSON array of recommendations, ranked by confidence (0-1). Format:
[
  { "analyticsId": "<id>", "analyticsName": "<name>", "confidence": 0.85, "reason": "Brief explanation" },
  ...
]

Provide up to 3 recommendations. If uncertain, indicate lower confidence scores.`;
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

module.exports = {
    getAIRecommendation,
    isAIEnabled,
    getAIProvider,
    // Exported for testing
    buildPrompt,
    callGeminiAPI,
    callOpenAIAPI,
    callGroqAPI,
};
