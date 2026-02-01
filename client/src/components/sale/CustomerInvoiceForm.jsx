import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, Loader2, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { Button, Card } from '../ui';
import useRazorpayPayment from '../../hooks/useRazorpayPayment';
import { toast } from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';
import { getAIRecommendation } from '../../services/autoAnalyticalService';
import {
    getCustomerInvoiceById,
    createCustomerInvoice,
    updateCustomerInvoice,
    confirmCustomerInvoice,
    cancelCustomerInvoice,
    downloadCustomerInvoicePDF,
    sendCustomerInvoice,
    createPaymentOrder,
    verifyPayment,
} from '../../services/customerInvoiceService';

export default function CustomerInvoiceForm({ recordId, onBack, onHome, onNew }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [analytics, setAnalytics] = useState([]);
    const [invoiceData, setInvoiceData] = useState({
        customerId: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        reference: '',
        lines: [{
            productName: '',
            budgetAnalyticId: '',
            quantity: 1,
            unitPrice: 0,
        }],
        notes: '',
        status: 'draft',
        paymentStatus: 'not_paid',
        invoiceNo: 'Auto-generated',
        grandTotal: 0,
        paidViaCash: 0,
        paidViaBank: 0,
        amountDue: 0,
    });

    const [aiSuggestions, setAiSuggestions] = useState({}); // { [lineIndex]: [suggestions] }
    const [loadingSuggestions, setLoadingSuggestions] = useState({}); // { [lineIndex]: boolean }

    const { loading: paymentLoading, paymentStatus, initiatePayment, resetStatus } = useRazorpayPayment();

    useEffect(() => {
        fetchCustomers();
        fetchAnalytics();
        if (recordId) {
            fetchInvoiceData();
        }
    }, [recordId]);

    // Debounce function needed for AI recommendations
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // AI Recommendation Fetcher
    const fetchAIRecommendation = useCallback(debounce(async (index, productName) => {
        if (!productName || productName.length < 3) return;

        setLoadingSuggestions(prev => ({ ...prev, [index]: true }));
        try {
            const result = await getAIRecommendation({ text: productName });
            if (result.success && result.data) {
                setAiSuggestions(prev => ({
                    ...prev,
                    [index]: result.data
                }));
            }
        } catch (error) {
            console.error("AI Recommendation error:", error);
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
        }
    }, 500), []);

    const fetchCustomers = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.CONTACTS.BASE, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();
            if (data.success) {
                // Filter out archived contacts
                const activeContacts = data.data.contacts.filter(c => c.status !== 'archived');
                setCustomers(activeContacts);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.ANALYTICS.BASE, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();
            if (data.success) {
                // Filter out archived analytics
                const activeAnalytics = data.data.analytics.filter(a => a.status !== 'archived');
                setAnalytics(activeAnalytics);
            }
        } catch (error) {
            console.error('Error fetching analytics:', error);
            toast.error('Failed to load budget analytics');
        }
    };

    const fetchInvoiceData = async () => {
        try {
            setLoading(true);
            const response = await getCustomerInvoiceById(recordId);
            if (response.success) {
                const invoice = response.data;
                setInvoiceData({
                    invoiceNo: invoice.invoiceNo,
                    customerId: invoice.customerId?._id || '',
                    invoiceDate: invoice.invoiceDate.split('T')[0],
                    dueDate: invoice.dueDate.split('T')[0],
                    reference: invoice.reference || '',
                    lines: invoice.lines.map(line => ({
                        productName: line.productName,
                        budgetAnalyticId: line.budgetAnalyticId?._id || '',
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                    })),
                    notes: invoice.notes || '',
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    grandTotal: invoice.grandTotal,
                    paidViaCash: invoice.paidViaCash,
                    paidViaBank: invoice.paidViaBank,
                    amountDue: invoice.amountDue,
                });
            }
        } catch (error) {
            console.error('Error fetching invoice:', error);
            toast.error('Failed to load invoice');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotals = (lines) => {
        return lines.reduce((sum, line) => {
            const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
            return sum + lineTotal;
        }, 0);
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...invoiceData.lines];
        newLines[index] = { ...newLines[index], [field]: value };
        const grandTotal = calculateTotals(newLines);
        setInvoiceData({ ...invoiceData, lines: newLines, grandTotal });

        // Trigger AI recommendation if product name changes
        if (field === 'productName') {
            fetchAIRecommendation(index, value);
        }
    };

    const handleAddLine = () => {
        setInvoiceData({
            ...invoiceData,
            lines: [...invoiceData.lines, { productName: '', budgetAnalyticId: '', quantity: 1, unitPrice: 0 }],
        });
    };

    const handleRemoveLine = (index) => {
        if (invoiceData.lines.length === 1) {
            toast.error('At least one line item is required');
            return;
        }
        const newLines = invoiceData.lines.filter((_, i) => i !== index);
        const grandTotal = calculateTotals(newLines);
        setInvoiceData({ ...invoiceData, lines: newLines, grandTotal });
    };

    const handleSave = async () => {
        try {
            // Validation
            if (!invoiceData.customerId) {
                toast.error('Please select a customer');
                return;
            }
            if (!invoiceData.dueDate) {
                toast.error('Please select a due date');
                return;
            }
            if (invoiceData.lines.some(line => !line.productName || line.quantity <= 0)) {
                toast.error('Please fill in all line items with valid data');
                return;
            }

            setSaving(true);

            const dataToSave = {
                customerId: invoiceData.customerId,
                invoiceDate: invoiceData.invoiceDate,
                dueDate: invoiceData.dueDate,
                reference: invoiceData.reference,
                lines: invoiceData.lines,
                notes: invoiceData.notes,
            };

            let response;
            if (recordId) {
                response = await updateCustomerInvoice(recordId, dataToSave);
                toast.success('Invoice updated successfully');
            } else {
                response = await createCustomerInvoice(dataToSave);
                toast.success('Invoice created successfully');
            }

            if (response.success) {
                const invoice = response.data;
                setInvoiceData({
                    invoiceNo: invoice.invoiceNo,
                    customerId: invoice.customerId?._id || '',
                    invoiceDate: invoice.invoiceDate.split('T')[0],
                    dueDate: invoice.dueDate.split('T')[0],
                    reference: invoice.reference || '',
                    lines: invoice.lines.map(line => ({
                        productName: line.productName,
                        budgetAnalyticId: line.budgetAnalyticId?._id || '',
                        quantity: line.quantity,
                        unitPrice: line.unitPrice,
                    })),
                    notes: invoice.notes || '',
                    status: invoice.status,
                    paymentStatus: invoice.paymentStatus,
                    grandTotal: invoice.grandTotal,
                    paidViaCash: invoice.paidViaCash,
                    paidViaBank: invoice.paidViaBank,
                    amountDue: invoice.amountDue,
                });

                // Navigate to the saved invoice
                if (!recordId) {
                    setTimeout(() => {
                        window.location.href = `/sale/invoice?id=${invoice._id}`;
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.message || 'Failed to save invoice');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirm = async () => {
        try {
            setSaving(true);
            const response = await confirmCustomerInvoice(recordId);
            if (response.success) {
                toast.success('Invoice confirmed successfully');
                fetchInvoiceData();
            }
        } catch (error) {
            console.error('Confirm error:', error);
            toast.error(error.message || 'Failed to confirm invoice');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = async () => {
        try {
            setSaving(true);
            const response = await cancelCustomerInvoice(recordId);
            if (response.success) {
                toast.success('Invoice cancelled successfully');
                fetchInvoiceData();
            }
        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error.message || 'Failed to cancel invoice');
        } finally {
            setSaving(false);
        }
    };

    const handlePrint = async () => {
        try {
            if (!recordId) {
                toast.error('Please save the invoice first');
                return;
            }
            await downloadCustomerInvoicePDF(recordId, invoiceData.invoiceNo);
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Print error:', error);
            toast.error('Failed to generate PDF');
        }
    };

    const handleSend = async () => {
        try {
            if (!recordId) {
                toast.error('Please save the invoice first');
                return;
            }
            setSaving(true);
            const response = await sendCustomerInvoice(recordId);
            if (response.success) {
                toast.success('Invoice sent to customer successfully');
            }
        } catch (error) {
            console.error('Send error:', error);
            toast.error(error.message || 'Failed to send invoice');
        } finally {
            setSaving(false);
        }
    };

    const handlePay = async () => {
        try {
            if (!recordId) {
                toast.error('Please save the invoice first');
                return;
            }

            if (invoiceData.amountDue <= 0) {
                toast.error('Invoice is already fully paid');
                return;
            }

            resetStatus();

            // Create Razorpay order
            const orderResponse = await createPaymentOrder(recordId);
            if (!orderResponse.success) {
                throw new Error('Failed to create payment order');
            }

            const { orderId, amount, key, invoiceNo, customerName, customerEmail, customerContact } = orderResponse.data;

            // Initialize Razorpay payment
            const options = {
                key,
                amount: amount * 100,
                currency: 'INR',
                name: 'Your Company Name',
                description: `Payment for Invoice ${invoiceNo}`,
                order_id: orderId,
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerContact,
                },
                theme: {
                    color: '#2563eb',
                },
                handler: async function (response) {
                    try {
                        // Verify payment on backend
                        const verifyResponse = await verifyPayment(recordId, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyResponse.success) {
                            toast.success('Payment successful!');
                            fetchInvoiceData(); // Refresh invoice data
                        }
                    } catch (error) {
                        console.error('Payment validation error:', error);
                        toast.error('Payment verification failed');
                    }
                },
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on('payment.failed', function (response) {
                toast.error('Payment failed. Please try again.');
            });
            razorpay.open();
        } catch (error) {
            console.error('Payment error:', error);
            toast.error(error.message || 'Failed to initiate payment');
        }
    };

    const isEditable = invoiceData.status === 'draft';
    const statusSteps = ['Draft', 'Confirmed', 'Cancelled'];

    const getStatusIndex = () => {
        switch (invoiceData.status) {
            case 'draft': return 0;
            case 'confirmed': return 1;
            case 'cancelled': return 2;
            default: return 0;
        }
    };

    const selectedCustomer = customers.find(c => c._id === invoiceData.customerId);

    if (loading) {
        return (
            <div className="animate-fadeIn p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-4">Loading invoice...</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Customer Invoice</h1>
                    <p className="text-sm text-muted-foreground">Form View</p>
                </div>
            </div>

            {/* Payment Status Messages */}
            {paymentStatus === 'success' && (
                <div className="mb-4 flex gap-3 p-4 rounded-lg border border-success/30 bg-success/10">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    <div>
                        <p className="font-medium text-success">Payment Successful</p>
                        <p className="text-sm text-success/80">Payment has been received.</p>
                    </div>
                </div>
            )}

            {paymentStatus === 'failed' && (
                <div className="mb-4 flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
                    <XCircle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                        <p className="font-medium text-destructive">Payment Failed</p>
                        <p className="text-sm text-destructive/80">Please try again.</p>
                    </div>
                </div>
            )}

            {/* Main Form Card */}
            <Card className="overflow-hidden p-0">
                {/* Form Header Action Bar */}
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Button onClick={onNew} variant="outline" size="sm">New</Button>
                        {isEditable && (
                            <Button onClick={handleSave} disabled={saving} variant="outline" size="sm">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                            </Button>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={onHome} variant="outline" size="sm">Home</Button>
                        <Button onClick={onBack} variant="outline" size="sm">Back</Button>
                    </div>
                </div>

                {/* Invoice Header Section */}
                <div className="p-6 border-b border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                        {/* Row 1 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Customer Invoice No.
                            </label>
                            <div className="text-foreground font-medium">{invoiceData.invoiceNo}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Invoice Date
                            </label>
                            <input
                                type="date"
                                value={invoiceData.invoiceDate}
                                onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground neu-input focus-ring"
                                readOnly={!isEditable}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Due Date <span className="text-destructive">*</span>
                            </label>
                            <input
                                type="date"
                                value={invoiceData.dueDate}
                                onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground neu-input focus-ring"
                                readOnly={!isEditable}
                            />
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Customer Name <span className="text-destructive">*</span>
                            </label>
                            {isEditable ? (
                                <select
                                    value={invoiceData.customerId}
                                    onChange={(e) => setInvoiceData({ ...invoiceData, customerId: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground neu-input focus-ring"
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map((customer) => (
                                        <option key={customer._id} value={customer._id}>
                                            {customer.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div className="text-foreground font-medium">{selectedCustomer?.name || 'N/A'}</div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Reference
                            </label>
                            <input
                                type="text"
                                value={invoiceData.reference}
                                onChange={(e) => setInvoiceData({ ...invoiceData, reference: e.target.value })}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                                readOnly={!isEditable}
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Payment Status
                            </label>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${invoiceData.paymentStatus === 'paid' ? 'bg-success/20 text-success' :
                                    invoiceData.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                        'bg-destructive/20 text-destructive'
                                    }`}>
                                    {invoiceData.paymentStatus === 'paid' ? 'Paid' :
                                        invoiceData.paymentStatus === 'partial' ? 'Partial' : 'Not Paid'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    <div className="flex items-center gap-2 flex-wrap">
                        {isEditable && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleConfirm}
                                disabled={saving || !recordId}
                            >
                                Confirm
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={handlePrint}>Print</Button>
                        <Button variant="outline" size="sm" onClick={handleSend}>Send</Button>
                        {invoiceData.status !== 'cancelled' && (
                            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
                                Cancel
                            </Button>
                        )}
                        {recordId && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handlePay}
                                disabled={paymentLoading || invoiceData.paymentStatus === 'paid'}
                            >
                                {paymentLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                        Processing...
                                    </>
                                ) : (
                                    'Pay'
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Status Ribbon */}
                    <div className="flex items-center gap-1">
                        {statusSteps.map((step, index) => (
                            <div key={step} className="flex items-center">
                                <span className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${index === getStatusIndex()
                                    ? 'bg-primary text-primary-foreground'
                                    : index < getStatusIndex()
                                        ? 'bg-success/20 text-success'
                                        : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {step}
                                </span>
                                {index < statusSteps.length - 1 && (
                                    <ChevronRight size={14} className="text-muted-foreground mx-0.5" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Invoice Lines Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                <th className="text-left p-3 font-semibold text-primary text-sm w-16">Sr. No.</th>
                                <th className="text-left p-3 font-semibold text-primary text-sm">Product</th>
                                <th className="text-left p-3 font-semibold text-primary text-sm">Budget Analytics</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-20">Qty</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-28">Unit Price</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-28">Total</th>
                                {isEditable && <th className="text-center p-3 font-semibold text-primary text-sm w-20">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceData.lines.map((line, index) => {
                                const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
                                return (
                                    <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                                        <td className="p-3 text-muted-foreground text-sm">{index + 1}</td>
                                        <td className="p-3">
                                            {isEditable ? (
                                                <input
                                                    type="text"
                                                    value={line.productName}
                                                    onChange={(e) => handleLineChange(index, 'productName', e.target.value)}
                                                    className="w-full px-2 py-1 rounded text-sm bg-input text-foreground neu-input focus-ring"
                                                    placeholder="Product name"
                                                />
                                            ) : (
                                                <span className="text-foreground text-sm font-medium">{line.productName}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {isEditable ? (
                                                <div className="relative">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        {loadingSuggestions[index] && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                                                        {!loadingSuggestions[index] && aiSuggestions[index] && (
                                                            <div className="flex items-center text-xs text-primary font-medium">
                                                                <Sparkles className="w-3 h-3 mr-1" />
                                                                AI Suggested
                                                            </div>
                                                        )}
                                                    </div>
                                                    <select
                                                        value={line.budgetAnalyticId}
                                                        onChange={(e) => handleLineChange(index, 'budgetAnalyticId', e.target.value)}
                                                        className={`w-full px-2 py-1 rounded text-sm bg-input text-foreground neu-input focus-ring ${aiSuggestions[index]?.suggestedAnalyticId === line.budgetAnalyticId
                                                            ? 'border-primary ring-1 ring-primary/20'
                                                            : ''
                                                            }`}
                                                    >
                                                        <option value="">Select Budget Analytics</option>

                                                        {/* AI Suggestions Section */}
                                                        {aiSuggestions[index] && analytics.find(a => a._id === aiSuggestions[index].suggestedAnalyticId) && (
                                                            <optgroup label="✨ AI Recommendation">
                                                                {analytics
                                                                    .filter(a => a._id === aiSuggestions[index].suggestedAnalyticId)
                                                                    .map(a => (
                                                                        <option key={a._id} value={a._id}>
                                                                            {a.name} (Recommended)
                                                                        </option>
                                                                    ))}
                                                            </optgroup>
                                                        )}

                                                        {/* All Analytics Section */}
                                                        <optgroup label="All Analytics">
                                                            {analytics.map((analytic) => (
                                                                <option key={analytic._id} value={analytic._id}>
                                                                    {analytic.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className="text-foreground text-sm">
                                                    {analytics.find(a => a._id === line.budgetAnalyticId)?.name || '-'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {isEditable ? (
                                                <input
                                                    type="number"
                                                    value={line.quantity}
                                                    onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                                                    className="w-full px-2 py-1 rounded text-sm text-right bg-input text-foreground neu-input focus-ring"
                                                    min="1"
                                                />
                                            ) : (
                                                <span className="text-foreground text-sm text-right font-medium block">{line.quantity}</span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            {isEditable ? (
                                                <input
                                                    type="number"
                                                    value={line.unitPrice}
                                                    onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value)}
                                                    className="w-full px-2 py-1 rounded text-sm text-right bg-input text-foreground neu-input focus-ring"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            ) : (
                                                <span className="text-foreground text-sm text-right font-medium block">
                                                    {line.unitPrice.toLocaleString()}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 text-foreground text-sm text-right font-semibold">
                                            {lineTotal.toLocaleString()}
                                        </td>
                                        {isEditable && (
                                            <td className="p-3 text-center">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleRemoveLine(index)}
                                                    className="text-destructive"
                                                >
                                                    Remove
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/30 border-b border-border">
                                <td colSpan={isEditable ? 6 : 5} className="p-3 text-right font-bold text-primary">Total</td>
                                <td className="p-3 text-right font-bold text-foreground text-base">
                                    {invoiceData.grandTotal.toLocaleString()}/-
                                </td>
                                {isEditable && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Add Line Button */}
                {isEditable && (
                    <div className="p-4 border-b border-border">
                        <Button onClick={handleAddLine} variant="outline" size="sm">
                            Add Line
                        </Button>
                    </div>
                )}

                {/* Payment Summary */}
                <div className="p-4 border-b border-border bg-muted/10">
                    <div className="flex justify-end">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-8">
                                <span className="text-muted-foreground">Paid via Cash</span>
                                <span className="font-medium text-foreground">{invoiceData.paidViaCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span className="text-muted-foreground">Paid via Bank</span>
                                <span className="font-medium text-foreground">{invoiceData.paidViaBank.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-8 pt-2 border-t border-border">
                                <span className="font-semibold text-primary">Amount Due</span>
                                <span className="font-bold text-foreground">{invoiceData.amountDue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                <div className="p-4">
                    <label className="text-xs font-semibold text-primary uppercase tracking-wide block mb-2">
                        Notes
                    </label>
                    <textarea
                        value={invoiceData.notes}
                        onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                        className="w-full px-3 py-2 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                        rows={3}
                        readOnly={!isEditable}
                        placeholder="Add any additional notes here..."
                    />
                </div>
            </Card>

            {/* Test Mode Notice */}
            <div className="mt-4 p-3 rounded-lg bg-secondary border border-border text-xs text-secondary-foreground text-center">
                Test Mode: Use card <span className="font-mono">4111 1111 1111 1111</span> with any future expiry and CVV
            </div>
        </div>
    );
}
