import { ChevronRight } from 'lucide-react';
import { Button, Card } from '../ui';

// Static sample data for UI demonstration
const samplePaymentData = {
    paymentNo: 'PAY/25/0001',
    paymentDate: '2026-01-31',
    paymentType: 'bank', // cash or bank
    partner: 'Azure Interior',
    amount: 16350,
    reference: 'Payment against BILL/2025/0001',
    status: 'draft', // draft, confirmed, cancelled
};

export default function BillPaymentForm({ onBack, onHome, onNew }) {
    const statusSteps = ['Draft', 'Confirm', 'Cancelled'];
    const currentStatus = samplePaymentData.status;

    const getStatusIndex = () => {
        switch (currentStatus) {
            case 'draft': return 0;
            case 'confirmed': return 1;
            case 'cancelled': return 2;
            default: return 0;
        }
    };

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Bill Payment</h1>
                    <p className="text-sm text-muted-foreground">Record Outgoing Payment</p>
                </div>
            </div>

            {/* Main Form Card */}
            <Card className="overflow-hidden p-0">
                {/* Form Header Action Bar */}
                <div className="flex items-center justify-between gap-3 p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                        <Button onClick={onNew} variant="outline" size="sm">New</Button>
                        <span className="text-foreground font-semibold">{samplePaymentData.paymentNo}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button onClick={onHome} variant="outline" size="sm">Home</Button>
                        <Button onClick={onBack} variant="outline" size="sm">Back</Button>
                    </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between p-4 border-b border-border bg-card">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="primary" size="sm">Confirm</Button>
                        <Button variant="outline" size="sm">Print</Button>
                        <Button variant="outline" size="sm">Send</Button>
                        <Button variant="outline" size="sm">Cancel</Button>
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

                {/* Payment Form Fields */}
                <div className="p-6">
                    <div className="max-w-2xl space-y-6">
                        {/* Payment Type */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Payment Type
                            </label>
                            <div className="flex items-center gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="cash"
                                        checked={samplePaymentData.paymentType === 'cash'}
                                        readOnly
                                        className="w-4 h-4 text-primary border-border focus:ring-primary"
                                    />
                                    <span className="text-foreground font-medium">Cash</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="paymentType"
                                        value="bank"
                                        checked={samplePaymentData.paymentType === 'bank'}
                                        readOnly
                                        className="w-4 h-4 text-primary border-border focus:ring-primary"
                                    />
                                    <span className="text-foreground font-medium">Bank</span>
                                </label>
                            </div>
                        </div>

                        {/* Partner */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Partner
                            </label>
                            <div className="text-foreground font-medium px-3 py-2 rounded-md bg-muted/50">
                                {samplePaymentData.partner}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            {/* Amount */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                    Amount
                                </label>
                                <div className="text-foreground font-bold text-xl px-3 py-2 rounded-md bg-muted/50">
                                    ₹{samplePaymentData.amount.toLocaleString()}
                                </div>
                            </div>

                            {/* Date */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                    Date
                                </label>
                                <div className="text-foreground font-medium px-3 py-2 rounded-md bg-muted/50">
                                    {new Date(samplePaymentData.paymentDate).toLocaleDateString()}
                                </div>
                            </div>
                        </div>

                        {/* Reference */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-primary uppercase tracking-wide">
                                Reference
                            </label>
                            <input
                                type="text"
                                defaultValue={samplePaymentData.reference}
                                className="w-full px-3 py-2 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                                readOnly
                            />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
