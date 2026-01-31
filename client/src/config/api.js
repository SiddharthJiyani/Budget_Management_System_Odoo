// Centralized API configuration for frontend
// No hardcoded URLs - all endpoints defined here

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// API endpoints
export const API_ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        SIGNUP: `${API_BASE_URL}/api/auth/signup`,
        LOGIN: `${API_BASE_URL}/api/auth/login`,
        SEND_OTP: `${API_BASE_URL}/api/auth/sendotp`,
        FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgotpassword`,
        CHECK_LOGIN_ID: `${API_BASE_URL}/api/auth/check-loginid`,
        CREATE_USER: `${API_BASE_URL}/api/auth/create-user`,
        ME: `${API_BASE_URL}/api/auth/me`,
        GOOGLE: `${API_BASE_URL}/api/auth/google`,
    },

    // Master Data endpoints
    CONTACTS: {
        BASE: `${API_BASE_URL}/api/contacts`,
        BY_ID: (id) => `${API_BASE_URL}/api/contacts/${id}`,
        UPLOAD_IMAGE: (id) => `${API_BASE_URL}/api/contacts/${id}/image`,
        UNARCHIVE: (id) => `${API_BASE_URL}/api/contacts/${id}/unarchive`,
        PERMANENT_DELETE: (id) => `${API_BASE_URL}/api/contacts/${id}/permanent`,
    },

    PRODUCTS: {
        BASE: `${API_BASE_URL}/api/products`,
        BY_ID: (id) => `${API_BASE_URL}/api/products/${id}`,
        UNARCHIVE: (id) => `${API_BASE_URL}/api/products/${id}/unarchive`,
        PERMANENT_DELETE: (id) => `${API_BASE_URL}/api/products/${id}/permanent`,
    },

    CATEGORIES: {
        BASE: `${API_BASE_URL}/api/categories`,
        BY_ID: (id) => `${API_BASE_URL}/api/categories/${id}`,
    },

    PARTNER_TAGS: {
        BASE: `${API_BASE_URL}/api/partner-tags`,
        BY_ID: (id) => `${API_BASE_URL}/api/partner-tags/${id}`,
    },

    ANALYTICS: {
        BASE: `${API_BASE_URL}/api/analytics`,
        BY_ID: (id) => `${API_BASE_URL}/api/analytics/${id}`,
        BY_DATE_RANGE: `${API_BASE_URL}/api/analytics/by-date-range`,
        UNARCHIVE: (id) => `${API_BASE_URL}/api/analytics/${id}/unarchive`,
        PERMANENT_DELETE: (id) => `${API_BASE_URL}/api/analytics/${id}/permanent`,
    },

    BUDGETS: {
        BASE: `${API_BASE_URL}/api/budgets`,
        BY_ID: (id) => `${API_BASE_URL}/api/budgets/${id}`,
        UPDATE_STATUS: (id) => `${API_BASE_URL}/api/budgets/${id}/status`,
        REVISE: (id) => `${API_BASE_URL}/api/budgets/${id}/revise`,
        ANALYTIC_DETAILS: (budgetId, analyticId) => `${API_BASE_URL}/api/budgets/${budgetId}/analytic/${analyticId}/details`,
    },

    // File upload endpoints
    FILES: {
        UPLOAD: `${API_BASE_URL}/api/files/upload`,
        UPLOAD_MULTIPLE: `${API_BASE_URL}/api/files/upload-multiple`,
        DELETE: `${API_BASE_URL}/api/files/delete`,
        GET_ALL: `${API_BASE_URL}/api/files`,
        GET_USER_FILES: `${API_BASE_URL}/api/files/user`,
    },

    // Payment endpoints
    PAYMENT: {
        CREATE_ORDER: `${API_BASE_URL}/api/payment/create-order`,
        VERIFY: `${API_BASE_URL}/api/payment/verify-payment`,
        KEY: `${API_BASE_URL}/api/payment/key`,
        GET_PAYMENT: (paymentId) => `${API_BASE_URL}/api/payment/${paymentId}`,
        REFUND: `${API_BASE_URL}/api/payment/refund`,
    },
};

// Helper function to get auth headers
export const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
};

// Helper function for file upload headers
export const getFileUploadHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        // Don't set Content-Type for file uploads - browser will set it with boundary
        ...(token && { 'Authorization': `Bearer ${token}` }),
    };
};

// API call helper with error handling
export const apiCall = async (url, options = {}) => {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...getAuthHeaders(),
                ...options.headers,
            },
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API call error:', error);
        throw error;
    }
};

export default API_ENDPOINTS;
