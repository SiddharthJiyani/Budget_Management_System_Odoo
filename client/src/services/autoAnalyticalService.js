import { getAuthHeaders, API_ENDPOINTS } from '../config/api';

// Get AI Recommendation
export const getAIRecommendation = async (data) => {
    try {
        const response = await fetch(API_ENDPOINTS.AUTO_ANALYTICS.AI_RECOMMEND, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to get AI recommendation');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Test Rule Matching (Debug)
export const testRuleMatching = async (data) => {
    try {
        const response = await fetch(`${API_ENDPOINTS.AUTO_ANALYTICS.BASE}/test-matching`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to test rule matching');
        }

        return result;
    } catch (error) {
        throw error;
    }
};
