import { useState } from 'react';
import { Card, Button } from '../ui';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import useRazorpayPayment from '../../hooks/useRazorpayPayment';

// Static sample invoice data for portal
const sampleInvoices = [
    {
        id: 1,
        invoiceNo: 'INV/2024/2025/0001',
        invoiceDate: '2026-01-15',
        dueDate: '2026-02-15',
        amount: 10000,
        status: 'paid',
        customerName: 'Rauji Mobiles',
        customerEmail: 'rauji@example.com',
        customerContact: '9876543210',
    },
    {
        id: 2,
        invoiceNo: 'INV/2024/2025/0002',
        invoiceDate: '2026-01-20',
        dueDate: '2026-02-20',
        amount: 6500,
        status: 'partial',
        customerName: 'Rauji Mobiles',
        customerEmail: 'rauji@example.com',
        customerContact: '9876543210',
    },
    {
        id: 3,
        invoiceNo: 'INV/2024/2025/0003',
        invoiceDate: '2026-01-25',
        dueDate: '2026-02-25',
        amount: 17400,
        status: 'not_paid',
        customerName: 'Rauji Mobiles',
        customerEmail: 'rauji@example.com',
        customerContact: '9876543210',
    },
];

export default function CustomerPortal() {
    const [invoices, setInvoices] = useState(sampleInvoices);
    const [payingInvoiceId, setPayingInvoiceId] = useState(null);
    const { loading, paymentStatus, initiatePayment, resetStatus } = useRazorpayPayment();

    const handlePayNow = (invoice) => {
        setPayingInvoiceId(invoice.id);
        resetStatus();

        initiatePayment({
            amount: invoice.amount,
            invoiceNo: invoice.invoiceNo,
            customerName: invoice.customerName,
            customerEmail: invoice.customerEmail,
            customerContact: invoice.customerContact,
            onSuccess: (response) => {
                // Update invoice status to paid
                setInvoices(prev => prev.map(inv =>
                    inv.id === invoice.id ? { ...inv, status: 'paid' } : inv
                ));
                setPayingInvoiceId(null);
            },
            onFailure: () => {
                setPayingInvoiceId(null);
            },
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

    return (
        <div className="min-h-screen bg-background">
            {/* Portal Header */}
            <div className="bg-card border-b border-border">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <h1 className="text-2xl font-bold text-foreground">Customer Invoice Portal</h1>
                    <p className="text-sm text-muted-foreground">View and pay your invoices</p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-6">
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

                {/* Invoice List */}
                <Card className="overflow-hidden p-0 neu-card">
                    <div className="p-4 border-b border-border bg-muted/30">
                        <h2 className="font-semibold text-foreground">Your Invoices</h2>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/10">
                                    <th className="text-left p-3 font-semibold text-primary text-sm">Invoice</th>
                                    <th className="text-left p-3 font-semibold text-primary text-sm">Invoice Date</th>
                                    <th className="text-left p-3 font-semibold text-primary text-sm">Due Date</th>
                                    <th className="text-right p-3 font-semibold text-primary text-sm">Amount Due</th>
                                    <th className="text-center p-3 font-semibold text-primary text-sm">Status</th>
                                    <th className="text-center p-3 font-semibold text-primary text-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map((invoice) => (
                                    <tr key={invoice.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                                        <td className="p-3 text-foreground text-sm font-medium">{invoice.invoiceNo}</td>
                                        <td className="p-3 text-muted-foreground text-sm">
                                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-muted-foreground text-sm">
                                            {new Date(invoice.dueDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 text-foreground text-sm text-right font-semibold">
                                            ₹{invoice.amount.toLocaleString()}
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${getStatusColor(invoice.status)}`}>
                                                {getStatusLabel(invoice.status)}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            {invoice.status !== 'paid' && (
                                                <Button
                                                    variant="primary"
                                                    size="sm"
                                                    onClick={() => handlePayNow(invoice)}
                                                    disabled={loading && payingInvoiceId === invoice.id}
                                                >
                                                    {loading && payingInvoiceId === invoice.id ? (
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

                {/* Test Mode Notice */}
                <div className="mt-4 p-3 rounded-lg bg-secondary border border-border text-xs text-secondary-foreground text-center">
                    Test Mode: Use card <span className="font-mono">4111 1111 1111 1111</span> with any future expiry and CVV
                </div>
            </div>
        </div>
    );
}
