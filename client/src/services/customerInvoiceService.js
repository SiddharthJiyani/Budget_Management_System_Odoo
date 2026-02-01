import { API_ENDPOINTS, getAuthHeaders } from '../config/api';

// Get all customer invoices
export const getAllCustomerInvoices = async (filters = {}) => {
    try {
        const { status, paymentStatus, search, page, limit } = filters;

        const queryParams = new URLSearchParams();
        if (status) queryParams.append('status', status);
        if (paymentStatus) queryParams.append('paymentStatus', paymentStatus);
        if (search) queryParams.append('search', search);
        if (page) queryParams.append('page', page);
        if (limit) queryParams.append('limit', limit);

        const url = `${API_ENDPOINTS.CUSTOMER_INVOICES.BASE}?${queryParams.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch customer invoices');
        }

        return data;
    } catch (error) {
        console.error('Get all customer invoices error:', error);
        throw error;
    }
};

// Get customer invoice by ID
export const getCustomerInvoiceById = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.BY_ID(id), {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch customer invoice');
        }

        return data;
    } catch (error) {
        console.error('Get customer invoice by ID error:', error);
        throw error;
    }
};

// Create customer invoice
export const createCustomerInvoice = async (invoiceData) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.BASE, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(invoiceData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create customer invoice');
        }

        return data;
    } catch (error) {
        console.error('Create customer invoice error:', error);
        throw error;
    }
};

// Update customer invoice
export const updateCustomerInvoice = async (id, invoiceData) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.BY_ID(id), {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(invoiceData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update customer invoice');
        }

        return data;
    } catch (error) {
        console.error('Update customer invoice error:', error);
        throw error;
    }
};

// Confirm customer invoice
export const confirmCustomerInvoice = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.CONFIRM(id), {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to confirm customer invoice');
        }

        return data;
    } catch (error) {
        console.error('Confirm customer invoice error:', error);
        throw error;
    }
};

// Cancel customer invoice
export const cancelCustomerInvoice = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.CANCEL(id), {
            method: 'PATCH',
            headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to cancel customer invoice');
        }

        return data;
    } catch (error) {
        console.error('Cancel customer invoice error:', error);
        throw error;
    }
};

// Download PDF
export const downloadCustomerInvoicePDF = async (id, invoiceNo) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.PDF(id), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to generate PDF');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CustomerInvoice-${invoiceNo}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        console.error('Download PDF error:', error);
        throw error;
    }
};

// Send invoice to customer
export const sendCustomerInvoice = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.SEND(id), {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to send customer invoice');
        }

        return data;
    } catch (error) {
        console.error('Send customer invoice error:', error);
        throw error;
    }
};

// Create Razorpay payment order
export const createPaymentOrder = async (id) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.CREATE_PAYMENT(id), {
            method: 'POST',
            headers: getAuthHeaders(),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to create payment order');
        }

        return data;
    } catch (error) {
        console.error('Create payment order error:', error);
        throw error;
    }
};

// Verify Razorpay payment
export const verifyPayment = async (id, paymentData) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.VERIFY_PAYMENT(id), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to verify payment');
        }

        return data;
    } catch (error) {
        console.error('Verify payment error:', error);
        throw error;
    }
};

// Record manual payment
export const recordManualPayment = async (id, paymentData) => {
    try {
        const response = await fetch(API_ENDPOINTS.CUSTOMER_INVOICES.RECORD_PAYMENT(id), {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(paymentData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to record payment');
        }

        return data;
    } catch (error) {
        console.error('Record manual payment error:', error);
        throw error;
    }
};
