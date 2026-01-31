import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS } from '../config/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Custom hook for Razorpay payment integration
 * Reusable across Customer Portal, Vendor Bill, and Invoice forms
 */
export function useRazorpayPayment() {
    const [loading, setLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', null

    // Load Razorpay script dynamically
    const loadRazorpayScript = useCallback(() => {
        return new Promise((resolve) => {
            // Check if script already loaded
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    }, []);

    /**
     * Initiate payment with Razorpay
     * @param {Object} options - Payment options
     * @param {number} options.amount - Amount to charge (in INR)
     * @param {string} options.invoiceNo - Invoice/Bill number for reference
     * @param {string} options.customerName - Customer/Vendor name
     * @param {string} options.customerEmail - Customer/Vendor email
     * @param {string} options.customerContact - Customer/Vendor contact
     * @param {Function} options.onSuccess - Callback on successful payment
     * @param {Function} options.onFailure - Callback on failed payment
     */
    const initiatePayment = useCallback(async ({
        amount,
        invoiceNo = '',
        customerName = '',
        customerEmail = '',
        customerContact = '',
        onSuccess,
        onFailure,
    }) => {
        if (!amount || amount <= 0) {
            toast.error('Invalid payment amount');
            return;
        }

        setLoading(true);
        setPaymentStatus(null);

        try {
            // Load Razorpay script
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                toast.error('Failed to load Razorpay SDK');
                setLoading(false);
                return;
            }

            // Create order on backend
            const orderResponse = await fetch(`${API_BASE_URL}/api/payment/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    currency: 'INR',
                }),
            });

            const orderData = await orderResponse.json();

            if (!orderData.success) {
                toast.error(orderData.message || 'Failed to create order');
                setLoading(false);
                onFailure?.();
                return;
            }

            // Get Razorpay key
            const keyResponse = await fetch(`${API_BASE_URL}/api/payment/key`);
            const keyData = await keyResponse.json();

            // Configure Razorpay options
            const options = {
                key: keyData.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Budget Management System',
                description: invoiceNo ? `Payment for ${invoiceNo}` : 'Payment',
                order_id: orderData.order.id,
                handler: async function (response) {
                    // Payment successful, verify on backend
                    try {
                        const verifyResponse = await fetch(`${API_BASE_URL}/api/payment/verify-payment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                            }),
                        });

                        const verifyData = await verifyResponse.json();

                        if (verifyData.success) {
                            setPaymentStatus('success');
                            toast.success('Payment successful! 🎉');
                            onSuccess?.(response);
                        } else {
                            setPaymentStatus('failed');
                            toast.error('Payment verification failed');
                            onFailure?.();
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        setPaymentStatus('failed');
                        toast.error('Payment verification failed');
                        onFailure?.();
                    }
                    setLoading(false);
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false);
                        toast.error('Payment cancelled');
                        onFailure?.();
                    },
                },
                prefill: {
                    name: customerName || 'Customer',
                    email: customerEmail || '',
                    contact: customerContact || '',
                },
                notes: {
                    invoiceNo: invoiceNo,
                },
                theme: {
                    color: '#3b82f6',
                },
            };

            const razorpay = new window.Razorpay(options);

            razorpay.on('payment.failed', function (response) {
                setPaymentStatus('failed');
                toast.error('Payment failed');
                setLoading(false);
                console.error('Payment failed:', response.error);
                onFailure?.();
            });

            razorpay.open();
        } catch (error) {
            console.error('Payment error:', error);
            toast.error('Something went wrong');
            setLoading(false);
            onFailure?.();
        }
    }, [loadRazorpayScript]);

    const resetStatus = useCallback(() => {
        setPaymentStatus(null);
    }, []);

    return {
        loading,
        paymentStatus,
        initiatePayment,
        resetStatus,
    };
}

export default useRazorpayPayment;
