import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, FileText, Download } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import toast from 'react-hot-toast';
import Header from '../components/Header';

export default function PurchasePayment() {
    const navigate = useNavigate();
    const [pendingBills, setPendingBills] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchPendingBills();
    }, []);

    const fetchPendingBills = async () => {
        setIsLoading(true);
        try {
            // Fetch all confirmed vendor bills with pending payments
            const response = await fetch(`${API_ENDPOINTS.VENDOR_BILLS.BASE}?status=confirmed`, {
                headers: getAuthHeaders(),
            });
            const data = await response.json();

            if (data.success) {
                // Filter only bills that have due amount > 0 (pending payment)
                const pending = (data.data.vendorBills || []).filter(
                    bill => bill.dueAmount && bill.dueAmount > 0
                );
                setPendingBills(pending);
            } else {
                toast.error(data.message || 'Failed to fetch pending bills');
            }
        } catch (error) {
            toast.error('Failed to fetch pending bills');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePay = (billId) => {
        navigate(`/vendor-bills/${billId}/payment`);
    };

    const paymentStatusColors = {
        not_paid: 'text-red-600 bg-red-50 border-red-200',
        partial: 'text-orange-600 bg-orange-50 border-orange-200',
        paid: 'text-green-600 bg-green-50 border-green-200',
    };

    return (
        <>
            <Header />
            <div className="header-spacer" />
            <div className="min-h-screen bg-background p-8 animate-fadeIn">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-foreground mb-1">Bill Payment</h1>
                        <p className="text-sm text-muted-foreground">
                            Manage pending vendor bill payments
                        </p>
                    </div>

                    {/* Pending Bills Table */}
                    <Card className="overflow-hidden">
                        {isLoading && (
                            <div className="flex justify-center items-center p-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        )}

                        {!isLoading && pendingBills.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-2">No pending payments</p>
                                <p className="text-sm">All vendor bills are paid!</p>
                            </div>
                        )}

                        {!isLoading && pendingBills.length > 0 && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted/10 border-b border-border">
                                        <tr>
                                            <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Bill Number</th>
                                            <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Vendor</th>
                                            <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Bill Date</th>
                                            <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Due Date</th>
                                            <th className="text-right px-6 py-3 font-semibold text-primary text-sm">Total Amount</th>
                                            <th className="text-right px-6 py-3 font-semibold text-primary text-sm">Due Amount</th>
                                            <th className="text-center px-6 py-3 font-semibold text-primary text-sm">Payment Status</th>
                                            <th className="text-center px-6 py-3 font-semibold text-primary text-sm">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingBills.map((bill) => (
                                            <tr
                                                key={bill._id}
                                                className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{bill.billNumber}</div>
                                                    {bill.reference && (
                                                        <div className="text-xs text-muted-foreground">Ref: {bill.reference}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-foreground">{bill.vendorId?.name || 'N/A'}</div>
                                                    <div className="text-xs text-muted-foreground">{bill.vendorId?.email || 'No email'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {new Date(bill.billDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-muted-foreground">
                                                    {new Date(bill.dueDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-sm">
                                                    ₹{bill.grandTotal?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-sm font-semibold text-red-600">
                                                    ₹{bill.dueAmount?.toFixed(2) || '0.00'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span
                                                        className={`px-2 py-1 rounded-full text-xs font-medium border ${paymentStatusColors[bill.paymentStatus] || 'text-gray-600 bg-gray-50 border-gray-200'
                                                            }`}
                                                    >
                                                        {bill.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <Button
                                                            onClick={() => handlePay(bill._id)}
                                                            variant="primary"
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            <CreditCard size={16} className="mr-1" />
                                                            Pay
                                                        </Button>
                                                        <Button
                                                            onClick={() => navigate(`/vendor-bills/${bill._id}`)}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <FileText size={16} className="mr-1" />
                                                            View
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </>
    );
}
