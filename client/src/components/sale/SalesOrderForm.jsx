import { useState, useEffect } from 'react';
import { ChevronRight, Plus, Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button, Card } from '../ui';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
    createSalesOrder,
    getSalesOrderById,
    updateSalesOrder,
    confirmSalesOrder,
    cancelSalesOrder,
    downloadSalesOrderPDF,
    sendSalesOrderToCustomer,
    createPaymentOrder,
    verifyPayment,
} from '../../services/salesOrderService';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

export default function SalesOrderForm({ recordId, onBack, onHome, onNew }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed'
    const [customers, setCustomers] = useState([]);
    const [formData, setFormData] = useState({
        customerId: '',
        reference: '',
        soDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        lines: [{ productName: '', quantity: 1, unitPrice: 0 }],
        notes: '',
        status: 'draft',
        paymentStatus: 'not_paid',
        amountDue: 0,
    });

    useEffect(() => {
        fetchCustomers();
        if (recordId) {
            fetchSalesOrder();
        }
    }, [recordId]);

    const fetchCustomers = async () => {
        try {
            const response = await fetch(API_ENDPOINTS.CONTACTS.BASE, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();
            if (data.success) {
                // Filter out archived contacts, show all others
                const activeContacts = data.data.contacts.filter(c => c.status !== 'archived');
                setCustomers(activeContacts);
            }
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        }
    };


    const fetchSalesOrder = async () => {
        try {
            setLoading(true);
            const response = await getSalesOrderById(recordId);
            if (response.success) {
                const so = response.data;
                setFormData({
                    customerId: so.customerId?._id || '',
                    reference: so.reference || '',
                    soDate: so.soDate ? new Date(so.soDate).toISOString().split('T')[0] : '',
                    dueDate: so.dueDate ? new Date(so.dueDate).toISOString().split('T')[0] : '',
                    lines: so.lines || [{ productName: '', quantity: 1, unitPrice: 0 }],
                    notes: so.notes || '',
                    status: so.status || 'draft',
                    soNumber: so.soNumber,
                    grandTotal: so.grandTotal,
                    paymentStatus: so.paymentStatus || 'not_paid',
                    amountDue: so.amountDue || 0,
                    paidViaCash: so.paidViaCash || 0,
                    paidViaBank: so.paidViaBank || 0,
                });
            }
        } catch (error) {
            console.error('Error fetching sales order:', error);
            toast.error(error.message || 'Failed to load sales order');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleLineChange = (index, field, value) => {
        const updatedLines = [...formData.lines];
        updatedLines[index][field] = value;
        setFormData({ ...formData, lines: updatedLines });
    };

    const addLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { productName: '', quantity: 1, unitPrice: 0 }],
        });
    };

    const removeLine = (index) => {
        if (formData.lines.length > 1) {
            const updatedLines = formData.lines.filter((_, i) => i !== index);
            setFormData({ ...formData, lines: updatedLines });
        }
    };

    const calculateGrandTotal = () => {
        return formData.lines.reduce((sum, line) => {
            return sum + (parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0);
        }, 0);
    };

    const handleSave = async () => {
        // Validation
        if (!formData.customerId) {
            toast.error('Please select a customer');
            return;
        }

        if (formData.lines.length === 0) {
            toast.error('Please add at least one line item');
            return;
        }

        for (const line of formData.lines) {
            if (!line.productName || line.productName.trim() === '') {
                toast.error('Product name is required for all line items');
                return;
            }
            if (!line.quantity || line.quantity <= 0) {
                toast.error('Quantity must be greater than 0');
                return;
            }
            if (line.unitPrice < 0) {
                toast.error('Unit price cannot be negative');
                return;
            }
        }

        try {
            setLoading(true);
            let response;

            if (recordId) {
                response = await updateSalesOrder(recordId, formData);
                toast.success('Sales Order updated successfully');
            } else {
                response = await createSalesOrder(formData);
                toast.success('Sales Order created successfully');
                // Navigate to the new record
                navigate(`/sale/order?id=${response.data._id}`);
            }
        } catch (error) {
            console.error('Error saving sales order:', error);
            toast.error(error.message || 'Failed to save sales order');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!recordId) {
            toast.error('Please save the sales order first');
            return;
        }

        try {
            setLoading(true);
            await confirmSalesOrder(recordId);
            toast.success('Sales Order confirmed successfully');
            fetchSalesOrder(); // Refresh data
        } catch (error) {
            console.error('Error confirming sales order:', error);
            toast.error(error.message || 'Failed to confirm sales order');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        if (!recordId) {
            toast.error('Please save the sales order first');
            return;
        }

        try {
            setLoading(true);
            await downloadSalesOrderPDF(recordId);
            toast.success('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            toast.error(error.message || 'Failed to download PDF');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!recordId) {
            toast.error('Please save the sales order first');
            return;
        }

        try {
            setLoading(true);
            const response = await sendSalesOrderToCustomer(recordId);
            toast.success(response.message || 'Sales Order sent to customer');
        } catch (error) {
            console.error('Error sending sales order:', error);
            toast.error(error.message || 'Failed to send sales order');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        if (!recordId) {
            toast.error('Please save the sales order first');
            return;
        }

        if (!window.confirm('Are you sure you want to cancel this sales order?')) {
            return;
        }

        try {
            setLoading(true);
            await cancelSalesOrder(recordId);
            toast.success('Sales Order cancelled successfully');
            fetchSalesOrder(); // Refresh data
        } catch (error) {
            console.error('Error cancelling sales order:', error);
            toast.error(error.message || 'Failed to cancel sales order');
        } finally {
            setLoading(false);
        }
    };

    // Handle Payment (Razorpay)
    const handlePay = async () => {
        if (!recordId) return;

        try {
            setPaymentLoading(true);
            // 1. Create Order
            const orderResponse = await createPaymentOrder(recordId);

            if (!orderResponse.success) {
                throw new Error(orderResponse.message);
            }

            const { orderId, amount, currency, key, soNumber, customerName, customerEmail, customerContact } = orderResponse.data;

            // 2. Open Razorpay Modal
            const options = {
                key: key,
                amount: amount,
                currency: currency,
                name: "Budget Management System",
                description: `Payment for Sales Order ${soNumber}`,
                order_id: orderId,
                handler: async function (response) {
                    try {
                        // 3. Verify Payment
                        const verifyResponse = await verifyPayment(recordId, {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        if (verifyResponse.success) {
                            setPaymentStatus('success');
                            toast.success('Payment successful!');
                            fetchSalesOrder(); // Refresh data
                        } else {
                            throw new Error('Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Verification error:', error);
                        setPaymentStatus('failed');
                        toast.error(error.message || 'Payment verification failed');
                    }
                },
                prefill: {
                    name: customerName,
                    email: customerEmail,
                    contact: customerContact,
                },
                theme: {
                    color: "#3b82f6",
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
        } finally {
            setPaymentLoading(false);
        }
    };

    const statusSteps = ['Draft', 'Confirmed', 'Cancelled'];
    const getStatusIndex = () => {
        switch (formData.status) {
            case 'draft': return 0;
            case 'confirmed': return 1;
            case 'cancelled': return 2;
            default: return 0;
        }
    };

    const isDraft = formData.status === 'draft';

    if (loading && recordId) {
        return (
            <div className="animate-fadeIn p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <p className="text-muted-foreground mt-4">Loading sales order...</p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Sales Order</h1>
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
                        {isDraft && <Button onClick={handleSave} variant="primary" size="sm" disabled={loading}>Save</Button>}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={onHome} variant="outline" size="sm">Home</Button>
                        <Button onClick={onBack} variant="outline" size="sm">Back</Button>
                    </div>
                </div>

                {/* SO Header Section */}
                <div className="p-6 border-b border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                SO No.
                            </label>
                            <div className="text-foreground font-medium">
                                {formData.soNumber || 'Auto-generated'}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                SO Date
                            </label>
                            <input
                                type="date"
                                name="soDate"
                                value={formData.soDate}
                                onChange={handleInputChange}
                                disabled={!isDraft}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground neu-input focus-ring disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Due Date *
                            </label>
                            <input
                                type="date"
                                name="dueDate"
                                value={formData.dueDate}
                                onChange={handleInputChange}
                                disabled={!isDraft}
                                required
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground neu-input focus-ring disabled:opacity-50"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Customer Name *
                            </label>
                            <select
                                name="customerId"
                                value={formData.customerId}
                                onChange={handleInputChange}
                                disabled={!isDraft}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground neu-input focus-ring disabled:opacity-50"
                            >
                                <option value="">Select Customer</option>
                                {customers.map((customer) => (
                                    <option key={customer._id} value={customer._id}>
                                        {customer.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Reference
                            </label>
                            <input
                                type="text"
                                name="reference"
                                value={formData.reference}
                                onChange={handleInputChange}
                                disabled={!isDraft}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring disabled:opacity-50"
                                placeholder="Enter reference"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Payment Status
                            </label>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${formData.paymentStatus === 'paid' ? 'bg-success/20 text-success' :
                                    formData.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-600' :
                                        'bg-destructive/20 text-destructive'
                                    }`}>
                                    {formData.paymentStatus === 'paid' ? 'Paid' :
                                        formData.paymentStatus === 'partial' ? 'Partial' : 'Not Paid'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleConfirm}
                            disabled={!isDraft || loading}
                        >
                            Confirm
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            disabled={!recordId || loading}
                        >
                            Print
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSend}
                            disabled={!recordId || loading}
                        >
                            Send
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCancel}
                            disabled={formData.status === 'cancelled' || loading}
                        >
                            Cancel
                        </Button>
                        {recordId && formData.status === 'confirmed' && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={handlePay}
                                disabled={paymentLoading || formData.paymentStatus === 'paid'}
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

                {/* Sales Order Lines Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                <th className="text-left p-3 font-semibold text-primary text-sm w-16">Sr. No.</th>
                                <th className="text-left p-3 font-semibold text-primary text-sm">Product *</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-24">Qty *</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-32">Unit Price *</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-32">Total</th>
                                {isDraft && <th className="text-center p-3 font-semibold text-primary text-sm w-16">Action</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {formData.lines.map((line, index) => (
                                <tr key={index} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="p-3 text-muted-foreground text-sm">{index + 1}</td>
                                    <td className="p-3">
                                        <input
                                            type="text"
                                            value={line.productName}
                                            onChange={(e) => handleLineChange(index, 'productName', e.target.value)}
                                            disabled={!isDraft}
                                            className="w-full px-2 py-1 rounded text-sm bg-input text-foreground neu-input focus-ring disabled:opacity-50"
                                            placeholder="Product name"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            value={line.quantity}
                                            onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                            disabled={!isDraft}
                                            min="0"
                                            step="1"
                                            className="w-full px-2 py-1 rounded text-sm text-right bg-input text-foreground neu-input focus-ring disabled:opacity-50"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            value={line.unitPrice}
                                            onChange={(e) => handleLineChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            disabled={!isDraft}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-2 py-1 rounded text-sm text-right bg-input text-foreground neu-input focus-ring disabled:opacity-50"
                                        />
                                    </td>
                                    <td className="p-3 text-foreground text-sm text-right font-semibold">
                                        {((parseFloat(line.quantity) || 0) * (parseFloat(line.unitPrice) || 0)).toLocaleString()}
                                    </td>
                                    {isDraft && (
                                        <td className="p-3 text-center">
                                            <button
                                                onClick={() => removeLine(index)}
                                                disabled={formData.lines.length === 1}
                                                className="text-red-500 hover:text-red-700 disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/30">
                                <td colSpan={isDraft ? 4 : 4} className="p-3 text-right font-bold text-primary">
                                    {isDraft && (
                                        <Button
                                            onClick={addLine}
                                            variant="outline"
                                            size="sm"
                                            className="mr-4"
                                        >
                                            <Plus size={16} className="mr-1" /> Add Line
                                        </Button>
                                    )}
                                    Total
                                </td>
                                <td className="p-3 text-right font-bold text-foreground text-base">
                                    ₹{calculateGrandTotal().toLocaleString()}/-
                                </td>
                                {isDraft && <td></td>}
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Notes Section */}
                <div className="p-6 border-t border-border">
                    <label className="text-xs font-semibold text-primary uppercase tracking-wide block mb-2">
                        Notes
                    </label>
                    <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        disabled={!isDraft}
                        rows={3}
                        className="w-full px-3 py-2 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring resize-none disabled:opacity-50"
                        placeholder="Add any notes..."
                    />
                </div>
            </Card>
        </div>
    );
}
