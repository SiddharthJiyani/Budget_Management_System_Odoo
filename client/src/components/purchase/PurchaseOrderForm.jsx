import { Home, ArrowLeft, AlertTriangle, ChevronRight } from 'lucide-react';
import { Button, Card } from '../ui';

// Static sample data for UI demonstration
const samplePOData = {
    poNo: 'PO0001',
    poDate: '2026-01-31',
    vendorName: 'Azure Interior',
    reference: 'REQ-25-0001',
    status: 'draft', // draft, confirmed, cancelled
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
            budgetAnalytics: 'Auto Compute From Auto Analytical Model',
            qty: 3,
            unitPrice: 850,
            total: 2550,
            exceedsBudget: true,
        },
        {
            srNo: 3,
            product: 'Desk Lamp',
            budgetAnalytics: 'Deepawali',
            qty: 100,
            unitPrice: 4800,
            total: 480000,
            exceedsBudget: true,
        },
    ],
};

const grandTotal = 16350;

export default function PurchaseOrderForm({ onBack, onHome, onNew }) {
    const statusSteps = ['Draft', 'Confirm', 'Cancelled'];
    const currentStatus = samplePOData.status;

    const getStatusIndex = () => {
        switch (currentStatus) {
            case 'draft':
                return 0;
            case 'confirmed':
                return 1;
            case 'cancelled':
                return 2;
            default:
                return 0;
        }
    };

    const hasExceedsBudget = samplePOData.lines.some((line) => line.exceedsBudget);

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Purchase Order</h1>
                    <p className="text-sm text-muted-foreground">Form View</p>
                </div>
            </div>

            {/* Main Form Card */}
            <Card className="overflow-hidden p-0">
                {/* Form Header Action Bar */}
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-2">
                        <Button onClick={onNew} variant="outline" size="sm">
                            New
                        </Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={onHome} variant="outline" size="sm">
                            Home
                        </Button>
                        <Button onClick={onBack} variant="outline" size="sm">
                            Back
                        </Button>
                    </div>
                </div>

                {/* PO Header Section */}
                <div className="p-6 border-b border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* PO No. */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                PO No.
                            </label>
                            <div className="text-foreground font-medium">{samplePOData.poNo}</div>
                        </div>

                        {/* PO Date */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                PO Date
                            </label>
                            <div className="text-foreground font-medium">
                                {new Date(samplePOData.poDate).toLocaleDateString()}
                            </div>
                        </div>

                        {/* Vendor Name */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Vendor Name
                            </label>
                            <div className="text-foreground font-medium">{samplePOData.vendorName}</div>
                        </div>

                        {/* Reference */}
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Reference
                            </label>
                            <input
                                type="text"
                                defaultValue={samplePOData.reference}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                                readOnly
                            />
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="primary" size="sm">
                            Confirm
                        </Button>
                        <Button variant="outline" size="sm">
                            Print
                        </Button>
                        <Button variant="outline" size="sm">
                            Send
                        </Button>
                        <Button variant="outline" size="sm">
                            Cancel
                        </Button>
                        <Button variant="secondary" size="sm">
                            Create Bill
                        </Button>
                        <Button variant="outline" size="sm">
                            Budget
                        </Button>
                    </div>

                    {/* Status Ribbon */}
                    <div className="flex items-center gap-1">
                        {statusSteps.map((step, index) => (
                            <div key={step} className="flex items-center">
                                <span
                                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${index === getStatusIndex()
                                        ? 'bg-primary text-primary-foreground'
                                        : index < getStatusIndex()
                                            ? 'bg-success/20 text-success'
                                            : 'bg-muted text-muted-foreground'
                                        }`}
                                >
                                    {step}
                                </span>
                                {index < statusSteps.length - 1 && (
                                    <ChevronRight size={14} className="text-muted-foreground mx-0.5" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Purchase Order Lines Table */}
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
                            {samplePOData.lines.map((line) => (
                                <tr
                                    key={line.srNo}
                                    className={`border-b border-border transition-colors ${line.exceedsBudget
                                        ? 'bg-orange-50 dark:bg-orange-950/20'
                                        : 'hover:bg-muted/30'
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
                                    <td className="p-3 text-foreground text-sm font-medium">
                                        {line.product}
                                    </td>
                                    <td className="p-3 text-foreground text-sm">
                                        {line.budgetAnalytics}
                                    </td>
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
                            <tr className="bg-muted/30">
                                <td colSpan={5} className="p-3 text-right font-bold text-primary">
                                    Total
                                </td>
                                <td className="p-3 text-right font-bold text-foreground text-base">
                                    {grandTotal.toLocaleString()}/-
                                </td>
                            </tr>
                        </tfoot>
                    </table>
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
        </div>
    );
}
