import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import PortalHeader from '../../components/portal/PortalHeader';
import { Card, Button } from '../../components/ui';
import { CheckCircle, XCircle, Loader2, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:4000/api';

/**
 * My Invoices Page
 * 
 * Unified view for both customers (invoices) and vendors (bills).
 * Backend determines which data to show based on user's contact type.
 */
export default function MyInvoices() {
    const { user, token, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();

    const [documents, setDocuments] = useState([]);
    const [documentType, setDocumentType] = useState('invoice');
    const [contactName, setContactName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [payingDocId, setPayingDocId] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', null

    // Redirect admin users to dashboard
    useEffect(() => {
        if (!authLoading && user?.accountType === 'admin') {
            navigate('/dashboard');
        }
    }, [user, authLoading, navigate]);

    // Fetch invoices/bills function
    const fetchDocuments = async () => {
        if (!token) return;

        try {
            setLoading(true);
            setError(null);

            const response = await fetch(`${API_URL}/portal/my-invoices`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (data.success) {
                setDocuments(data.data.documents);
                setDocumentType(data.data.documentType);
                setContactName(data.data.contactName);
            } else {
                setError(data.message);
            }
        } catch (err) {
            console.error('Fetch documents error:', err);
            setError('Failed to load documents. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch invoices/bills on mount
    useEffect(() => {
        fetchDocuments();
    }, [token]);

    const resetStatus = () => {
        setPaymentStatus(null);
    };

    const handlePayNow = async (doc) => {
        setPayingDocId(doc.id);
        setPaymentLoading(true);
        resetStatus();

        try {
            // Step 1: Create Razorpay order via portal endpoint
            const orderResponse = await fetch(
                `${API_URL}/portal/payment/create-order`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        documentId: doc.id,
                        documentType: doc.type,
                        amount: doc.amountDue,
                    }),
                }
            );

            const orderData = await orderResponse.json();

            if (!orderData.success) {
                toast.error(orderData.message || 'Failed to create payment order');
                setPayingDocId(null);
                setPaymentLoading(false);
                return;
            }

            // Step 2: Load Razorpay script if not already loaded
            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded) {
                toast.error('Failed to load payment system');
                setPayingDocId(null);
                setPaymentLoading(false);
                return;
            }

            // Step 3: Get Razorpay key
            const keyResponse = await fetch(`${API_URL}/payment/key`);
            const keyData = await keyResponse.json();

            // Step 4: Get customer details for prefill
            const detailsResponse = await fetch(
                `${API_URL}/portal/payment/${doc.type}/${doc.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            const detailsData = await detailsResponse.json();

            setPaymentLoading(false); // Loading done before showing Razorpay

            // Step 5: Configure and open Razorpay checkout
            const options = {
                key: keyData.key,
                amount: orderData.order.amount,
                currency: orderData.order.currency,
                name: 'Budget Management System',
                description: `Payment for ${doc.documentNo}`,
                order_id: orderData.order.id,
                handler: async function (response) {
                    // Payment successful, verify and update document
                    setPaymentLoading(true);
                    try {
                        const verifyResponse = await fetch(
                            `${API_URL}/portal/payment/verify`,
                            {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_signature: response.razorpay_signature,
                                    documentId: doc.id,
                                    documentType: doc.type,
                                    amount: doc.amountDue,
                                }),
                            }
                        );

                        const verifyData = await verifyResponse.json();

                        if (verifyData.success) {
                            toast.success('Payment successful! 🎉');
                            // Refresh the invoices list
                            await fetchDocuments();
                        } else {
                            toast.error('Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        toast.error('Payment verification failed');
                    }
                    setPayingDocId(null);
                    setPaymentLoading(false);
                },
                modal: {
                    ondismiss: function () {
                        toast.info('Payment cancelled');
                        setPayingDocId(null);
                        setPaymentLoading(false);
                    },
                },
                prefill: {
                    name: detailsData.data?.customerInfo?.name || '',
                    email: detailsData.data?.customerInfo?.email || '',
                    contact: detailsData.data?.customerInfo?.phone || '',
                },
                notes: {
                    documentNo: doc.documentNo,
                    documentType: doc.type,
                },
                theme: {
                    color: '#3b82f6',
                },
            };

            const razorpay = new window.Razorpay(options);

            razorpay.on('payment.failed', function (response) {
                toast.error('Payment failed');
                console.error('Payment failed:', response.error);
                setPayingDocId(null);
                setPaymentLoading(false);
            });

            razorpay.open();
        } catch (err) {
            console.error('Payment initiation error:', err);
            toast.error('Failed to initiate payment');
            setPayingDocId(null);
            setPaymentLoading(false);
        }
    };

    // Helper function to load Razorpay script
    const loadRazorpayScript = () => {
        return new Promise((resolve) => {
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
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
                return 'bg-success/20 text-success';
            case 'partial':
                return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
            default:
                return 'bg-destructive/20 text-destructive';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'paid': return 'Paid';
            case 'partial': return 'Partial';
            default: return 'Not Paid';
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <>
            <PortalHeader />
            <div className="header-spacer" />

            <div className="min-h-screen bg-background p-6">
                <div className="max-w-5xl mx-auto">
                    {/* Page Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary" />
                            My {documentType === 'invoice' ? 'Invoices' : 'Bills'}
                        </h1>
                        {contactName && (
                            <p className="text-sm text-muted-foreground mt-1">
                                Showing documents for: <span className="font-medium">{contactName}</span>
                            </p>
                        )}
                    </div>

                    {/* Payment Status Messages */}
                    {paymentStatus === 'success' && (
                        <div className="mb-4 flex gap-3 p-4 rounded-lg border border-success/30 bg-success/10">
                            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                            <div>
                                <p className="font-medium text-success">Payment Successful</p>
                                <p className="text-sm text-success/80">Your payment has been completed successfully.</p>
                            </div>
                        </div>
                    )}

                    {paymentStatus === 'failed' && (
                        <div className="mb-4 flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
                            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                            <div>
                                <p className="font-medium text-destructive">Payment Failed</p>
                                <p className="text-sm text-destructive/80">Please try again or use another method.</p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="mb-4 flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
                            <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
                            <div>
                                <p className="font-medium text-destructive">Error</p>
                                <p className="text-sm text-destructive/80">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : documents.length === 0 ? (
                        /* Empty State */
                        <Card className="p-8 text-center neu-card">
                            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-muted-foreground">
                                No {documentType === 'invoice' ? 'invoices' : 'bills'} found.
                            </p>
                        </Card>
                    ) : (
                        /* Documents Table */
                        <Card className="overflow-hidden p-0 neu-card">
                            <div className="p-4 border-b border-border bg-muted/30">
                                <h2 className="font-semibold text-foreground">
                                    Your {documentType === 'invoice' ? 'Invoices' : 'Bills'} ({documents.length})
                                </h2>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/10">
                                            <th className="text-left p-3 font-semibold text-primary text-sm">
                                                {documentType === 'invoice' ? 'Invoice' : 'Bill'} No
                                            </th>
                                            <th className="text-left p-3 font-semibold text-primary text-sm">Date</th>
                                            <th className="text-left p-3 font-semibold text-primary text-sm">Due Date</th>
                                            <th className="text-right p-3 font-semibold text-primary text-sm">Total</th>
                                            <th className="text-right p-3 font-semibold text-primary text-sm">Amount Due</th>
                                            <th className="text-center p-3 font-semibold text-primary text-sm">Status</th>
                                            <th className="text-center p-3 font-semibold text-primary text-sm">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {documents.map((doc) => (
                                            <tr key={doc.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                                <td className="p-3 text-foreground text-sm font-medium">
                                                    {doc.documentNo}
                                                </td>
                                                <td className="p-3 text-muted-foreground text-sm">
                                                    {new Date(doc.documentDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 text-muted-foreground text-sm">
                                                    {new Date(doc.dueDate).toLocaleDateString()}
                                                </td>
                                                <td className="p-3 text-foreground text-sm text-right">
                                                    ₹{doc.totalAmount?.toLocaleString() || 0}
                                                </td>
                                                <td className="p-3 text-foreground text-sm text-right font-semibold">
                                                    ₹{doc.amountDue?.toLocaleString() || 0}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getStatusColor(doc.status)}`}>
                                                        {getStatusLabel(doc.status)}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {doc.status === 'paid' ? (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    ) : (
                                                        <Button
                                                            variant="primary"
                                                            size="sm"
                                                            onClick={() => handlePayNow(doc)}
                                                            disabled={paymentLoading && payingDocId === doc.id}
                                                        >
                                                            {paymentLoading && payingDocId === doc.id ? (
                                                                <>
                                                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                                                    Processing...
                                                                </>
                                                            ) : (
                                                                'Pay Now'
                                                            )}
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Test Mode Notice */}
                    <div className="mt-4 p-3 rounded-lg bg-secondary border border-border text-xs text-secondary-foreground text-center">
                        Test Mode: Use card <span className="font-mono">4111 1111 1111 1111</span> with any future expiry and CVV
                    </div>
                </div>
            </div>
        </>
    );
}
