import { useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button, Card } from '../ui';
import useRazorpayPayment from '../../hooks/useRazorpayPayment';

// Static sample data for UI demonstration
const sampleBillData = {
    billNo: 'BILL/2025/0001',
    billDate: '2026-01-31',
    dueDate: '2026-02-28',
    vendorName: 'Azure Interior',
    vendorEmail: 'azure@example.com',
    vendorContact: '9876543210',
    billReference: 'SUP-25-001',
    status: 'draft', // draft, confirmed, cancelled
    paymentStatus: 'not_paid', // paid, partial, not_paid
    lines: [
        {
            srNo: 1,
            product: 'Table',
            budgetAnalytics: 'Deepawali',
            qty: 6,
            unitPrice: 2300,
            total: 13800,
            exceedsBudget: false,
        },
        {
            srNo: 2,
            product: 'Chair',
            budgetAnalytics: 'Auto Compute',
            qty: 3,
            unitPrice: 850,
            total: 2550,
            exceedsBudget: true,
        },
    ],
    paidViaCash: 0,
    paidViaBank: 16350,
    amountDue: 0,
};

const grandTotal = 16350;

export default function VendorBillForm({ onBack, onHome, onNew }) {
    const [billData, setBillData] = useState(sampleBillData);
    const { loading, paymentStatus, initiatePayment, resetStatus } = useRazorpayPayment();

    const statusSteps = ['Draft', 'Confirm', 'Cancelled'];
    const currentStatus = billData.status;

    const getStatusIndex = () => {
        switch (currentStatus) {
            case 'draft': return 0;
            case 'confirmed': return 1;
            case 'cancelled': return 2;
            default: return 0;
        }
    };

    const hasExceedsBudget = billData.lines.some((line) => line.exceedsBudget);

    const handlePay = () => {
        if (billData.amountDue <= 0) {
            // If no amount due, use the grand total for demo
            const amountToPay = grandTotal;
            resetStatus();
            initiatePayment({
                amount: amountToPay,
                invoiceNo: billData.billNo,
                customerName: billData.vendorName,
                customerEmail: billData.vendorEmail,
                customerContact: billData.vendorContact,
                onSuccess: () => {
                    setBillData(prev => ({
                        ...prev,
                        paymentStatus: 'paid',
                        paidViaBank: grandTotal,
                        amountDue: 0,
                    }));
                },
                onFailure: () => { },
            });
        } else {
            resetStatus();
            initiatePayment({
                amount: billData.amountDue,
                invoiceNo: billData.billNo,
                customerName: billData.vendorName,
                customerEmail: billData.vendorEmail,
                customerContact: billData.vendorContact,
                onSuccess: () => {
                    setBillData(prev => ({
                        ...prev,
                        paymentStatus: 'paid',
                        paidViaBank: prev.paidViaBank + prev.amountDue,
                        amountDue: 0,
                    }));
                },
                onFailure: () => { },
            });
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Vendor Bill</h1>
                    <p className="text-sm text-muted-foreground">Form View</p>
                </div>
            </div>

            {/* Payment Status Messages */}
            {paymentStatus === 'success' && (
                <div className="mb-4 flex gap-3 p-4 rounded-lg border border-success/30 bg-success/10">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    <div>
                        <p className="font-medium text-success">Payment Successful</p>
                        <p className="text-sm text-success/80">Your payment has been recorded.</p>
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

                {/* Bill Header Section */}
                <div className="p-6 border-b border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                        {/* Row 1 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Vendor Bill No.
                            </label>
                            <div className="text-foreground font-medium">{billData.billNo}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Bill Date
                            </label>
                            <div className="text-foreground font-medium">
                                {new Date(billData.billDate).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Due Date
                            </label>
                            <div className="text-foreground font-medium">
                                {new Date(billData.dueDate).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Row 2 */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Vendor Name
                            </label>
                            <div className="text-foreground font-medium">{billData.vendorName}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Bill Reference
                            </label>
                            <input
                                type="text"
                                defaultValue={billData.billReference}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                                readOnly
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Status
                            </label>
                            <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded ${billData.paymentStatus === 'paid' ? 'bg-success/20 text-success' :
                                        billData.paymentStatus === 'partial' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                            'bg-destructive/20 text-destructive'
                                    }`}>
                                    {billData.paymentStatus === 'paid' ? 'Paid' :
                                        billData.paymentStatus === 'partial' ? 'Partial' : 'Not Paid'}
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
                            disabled={loading || billData.paymentStatus === 'paid'}
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
                        <Button variant="outline" size="sm">Budget</Button>
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

                {/* Bill Lines Table */}
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
                            {billData.lines.map((line) => (
                                <tr
                                    key={line.srNo}
                                    className={`border-b border-border transition-colors ${line.exceedsBudget ? 'bg-orange-50 dark:bg-orange-950/20' : 'hover:bg-muted/30'
                                        }`}
                                >
                                    <td className="p-3 text-muted-foreground text-sm">
                                        <div className="flex items-center gap-2">
                                            {line.exceedsBudget && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-orange-500" title="Exceeds Budget" />
                                            )}
                                            {line.srNo}
                                        </div>
                                    </td>
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
                                <span className="font-medium text-foreground">{billData.paidViaCash.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-8">
                                <span className="text-muted-foreground">Paid via Bank</span>
                                <span className="font-medium text-foreground">{billData.paidViaBank.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between gap-8 pt-2 border-t border-border">
                                <span className="font-semibold text-primary">Amount Due</span>
                                <span className="font-bold text-foreground">{billData.amountDue.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Budget Warning */}
                {hasExceedsBudget && (
                    <div className="m-4 p-4 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                                <p className="font-semibold text-orange-700 dark:text-orange-400">
                                    Exceeds Approved Budget
                                </p>
                                <p className="text-sm text-orange-600 dark:text-orange-300 mt-1">
                                    The entered amount is higher than the remaining budget amount for this budget line.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </Card>

            {/* Test Mode Notice */}
            <div className="mt-4 p-3 rounded-lg bg-secondary border border-border text-xs text-secondary-foreground text-center">
                Test Mode: Use card <span className="font-mono">4111 1111 1111 1111</span> with any future expiry and CVV
            </div>
        </div>
    );
}
