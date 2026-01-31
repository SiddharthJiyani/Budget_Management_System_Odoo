import { ChevronRight } from 'lucide-react';
import { Button, Card } from '../ui';
import { useNavigate } from 'react-router-dom';

// Static sample data for UI demonstration
const sampleSOData = {
    soNo: 'SO0001',
    soDate: '2026-01-31',
    customerName: 'Rauji Mobiles',
    reference: 'REF-25-001',
    status: 'draft', // draft, confirmed, cancelled
    lines: [
        {
            srNo: 1,
            product: 'Mobile Phone',
            qty: 4,
            unitPrice: 2500,
            total: 10000,
        },
        {
            srNo: 2,
            product: 'Tablet',
            qty: 6,
            unitPrice: 1000,
            total: 6000,
        },
        {
            srNo: 3,
            product: 'Smart Watch',
            qty: 8,
            unitPrice: 500,
            total: 4000,
        },
    ],
};

const grandTotal = 20000;

export default function SalesOrderForm({ onBack, onHome, onNew }) {
    const navigate = useNavigate();
    const statusSteps = ['Draft', 'Confirm', 'Cancelled'];
    const currentStatus = sampleSOData.status;

    const getStatusIndex = () => {
        switch (currentStatus) {
            case 'draft': return 0;
            case 'confirmed': return 1;
            case 'cancelled': return 2;
            default: return 0;
        }
    };

    const handleCreateInvoice = () => {
        navigate('/sale/invoice');
    };

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Sales Order</h1>
                    <p className="text-sm text-muted-foreground">Form View</p>
                </div>
            </div>

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

                {/* SO Header Section */}
                <div className="p-6 border-b border-border">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                SO No.
                            </label>
                            <div className="text-foreground font-medium">{sampleSOData.soNo}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                SO Date
                            </label>
                            <div className="text-foreground font-medium">
                                {new Date(sampleSOData.soDate).toLocaleDateString()}
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Customer Name
                            </label>
                            <div className="text-foreground font-medium">{sampleSOData.customerName}</div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Reference
                            </label>
                            <input
                                type="text"
                                defaultValue={sampleSOData.reference}
                                className="w-full px-3 py-1.5 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                                readOnly
                            />
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
                        <Button variant="secondary" size="sm" onClick={handleCreateInvoice}>Create Invoice</Button>
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
                                <th className="text-left p-3 font-semibold text-primary text-sm">Product</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-20">Qty</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-28">Unit Price</th>
                                <th className="text-right p-3 font-semibold text-primary text-sm w-28">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sampleSOData.lines.map((line) => (
                                <tr key={line.srNo} className="border-b border-border hover:bg-muted/30 transition-colors">
                                    <td className="p-3 text-muted-foreground text-sm">{line.srNo}</td>
                                    <td className="p-3 text-foreground text-sm font-medium">{line.product}</td>
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
                                <td colSpan={4} className="p-3 text-right font-bold text-primary">Total</td>
                                <td className="p-3 text-right font-bold text-foreground text-base">
                                    {grandTotal.toLocaleString()}/-
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    );
}
