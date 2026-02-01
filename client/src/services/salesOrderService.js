import { getAuthHeaders, API_ENDPOINTS } from '../config/api';

// Create Sales Order
export const createSalesOrder = async (data) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.BASE, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create sales order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Get all Sales Orders
export const getAllSalesOrders = async (filters = {}) => {
    try {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `${API_ENDPOINTS.SALES_ORDERS.BASE}?${queryParams}` : API_ENDPOINTS.SALES_ORDERS.BASE;

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch sales orders');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Get Sales Order by ID
export const getSalesOrderById = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.BY_ID(id), {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to fetch sales order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Update Sales Order
export const updateSalesOrder = async (id, data) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.BY_ID(id), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to update sales order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Confirm Sales Order
export const confirmSalesOrder = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.CONFIRM(id), {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to confirm sales order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Cancel Sales Order
export const cancelSalesOrder = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.CANCEL(id), {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to cancel sales order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Create Payment Order (Razorpay)
export const createPaymentOrder = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.CREATE_PAYMENT(id), {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to create payment order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Verify Payment (Razorpay)
export const verifyPayment = async (id, paymentData) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.VERIFY_PAYMENT(id), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to verify payment');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Record Manual Payment
export const recordManualPayment = async (id, paymentData) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.RECORD_PAYMENT(id), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to record payment');
        }

        return result;
    } catch (error) {
        throw error;
    }
};

// Download Sales Order PDF
export const downloadSalesOrderPDF = async (id) => {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.PDF(id), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to download PDF');
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `SalesOrder-${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return { success: true, message: 'PDF downloaded successfully' };
    } catch (error) {
        throw error;
    }
};

// Send Sales Order to Customer
export const sendSalesOrderToCustomer = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.SALES_ORDERS.SEND(id), {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || 'Failed to send sales order');
        }

        return result;
    } catch (error) {
        throw error;
    }
};
