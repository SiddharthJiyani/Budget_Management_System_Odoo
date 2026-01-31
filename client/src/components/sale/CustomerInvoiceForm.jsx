import { useState } from 'react';
import { ChevronRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Card } from '../ui';
import useRazorpayPayment from '../../hooks/useRazorpayPayment';

// Static sample data for UI demonstration
const sampleInvoiceData = {
    invoiceNo: 'INV/2024/2025/0001',
    invoiceDate: '2026-01-31',
    dueDate: '2026-02-28',
    customerName: 'Rauji Mobiles',
    customerEmail: 'rauji@example.com',
    customerContact: '9876543210',
    reference: 'Sales Invoice',
    status: 'draft', // draft, confirmed, cancelled
    paymentStatus: 'not_paid', // paid, partial, not_paid
    lines: [
        {
            srNo: 1,
            product: 'Mobile Phone',
            budgetAnalytics: 'Deepawali',
            qty: 4,
            unitPrice: 2500,
            total: 10000,
        },
        {
            srNo: 2,
            product: 'Tablet',
            budgetAnalytics: 'Quarterly',
            qty: 6,
            unitPrice: 1000,
            total: 6000,
        },
        {
            srNo: 3,
            product: 'Smart Watch',
            budgetAnalytics: 'Annual',
            qty: 8,
            unitPrice: 500,
            total: 4000,
        },
    ],
    paidViaCash: 0,
    paidViaBank: 0,
    amountDue: 20000,
};

const grandTotal = 20000;

export default function CustomerInvoiceForm({ onBack, onHome, onNew }) {
    const [invoiceData, setInvoiceData] = useState(sampleInvoiceData);
    const { loading, paymentStatus, initiatePayment, resetStatus } = useRazorpayPayment();

    const statusSteps = ['Draft', 'Confirm', 'Cancelled'];
    const currentStatus = invoiceData.status;

    const getStatusIndex = () => {
        switch (currentStatus) {
            case 'draft': return 0;
            case 'confirmed': return 1;
            case 'cancelled': return 2;
            default: return 0;
        }
    };

    const handlePay = () => {
        const amountToPay = invoiceData.amountDue > 0 ? invoiceData.amountDue : grandTotal;
        resetStatus();
        initiatePayment({
            amount: amountToPay,
            invoiceNo: invoiceData.invoiceNo,
            customerName: invoiceData.customerName,
            customerEmail: invoiceData.customerEmail,
            customerContact: invoiceData.customerContact,
            onSuccess: () => {
                setInvoiceData(prev => ({
                    ...prev,
                    paymentStatus: 'paid',
                    paidViaBank: grandTotal,
                    amountDue: 0,
                }));
            },
            onFailure: () => { },
        });
    };

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
                            <div className="text-foreground font-medium">
                                {new Date(invoiceData.invoiceDate).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Due Date
                            </label>
                            <div className="text-foreground font-medium">
                                {new Date(invoiceData.dueDate).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Customer Name
                            </label>
                            <div className="text-foreground font-medium">{invoiceData.customerName}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Reference
                            </label>
                            <input
                                type="text"
                                defaultValue={invoiceData.reference}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                                readOnly
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Status
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
                        <Button variant="primary" size="sm">Confirm</Button>
                        <Button variant="outline" size="sm">Print</Button>
                        <Button variant="outline" size="sm">Send</Button>
                        <Button variant="outline" size="sm">Cancel</Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handlePay}
                            disabled={loading || invoiceData.paymentStatus === 'paid'}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                                    Processing...
                                </>
                            ) : (
                                'Pay'
                            )}
                        </Button>
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
                            </tr>
                        </thead>
                        <tbody>
                            {invoiceData.lines.map((line) => (
                                <tr key={line.srNo} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="p-3 text-muted-foreground text-sm">{line.srNo}</td>
                                    <td className="p-3 text-foreground text-sm font-medium">{line.product}</td>
                                    <td className="p-3 text-foreground text-sm">{line.budgetAnalytics}</td>
                                    <td className="p-3 text-foreground text-sm text-right font-medium">{line.qty}</td>
                                    <td className="p-3 text-foreground text-sm text-right font-medium">
                                        {line.unitPrice.toLocaleString()}
                                    </td>
                                    <td className="p-3 text-foreground text-sm text-right font-semibold">
                                        {line.total.toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/30 border-b border-border">
                                <td colSpan={5} className="p-3 text-right font-bold text-primary">Total</td>
                                <td className="p-3 text-right font-bold text-foreground text-base">
                                    {grandTotal.toLocaleString()}/-
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

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
            </Card>

            {/* Test Mode Notice */}
            <div className="mt-4 p-3 rounded-lg bg-secondary border border-border text-xs text-secondary-foreground text-center">
                Test Mode: Use card <span className="font-mono">4111 1111 1111 1111</span> with any future expiry and CVV
            </div>
        </div>
    );
}
