import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../ui';
import { getAllCustomerInvoices } from '../../services/customerInvoiceService';
import { toast } from 'react-hot-toast';

export default function CustomerInvoiceList() {
    const navigate = useNavigate();
    const [customerInvoices, setCustomerInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        paymentStatus: 'all',
        search: '',
    });

    useEffect(() => {
        fetchCustomerInvoices();
    }, [filters]);

    const fetchCustomerInvoices = async () => {
        try {
            setLoading(true);
            const response = await getAllCustomerInvoices(filters);
            if (response.success) {
                setCustomerInvoices(response.data.customerInvoices);
            }
        } catch (error) {
            console.error('Error fetching customer invoices:', error);
            toast.error(error.message || 'Failed to fetch customer invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleNewCustomerInvoice = () => {
        navigate('/sale/invoice?view=form');
    };

    const handleRowClick = (id) => {
        navigate(`/sale/invoice?id=${id}`);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { bg: 'bg-gray-200 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', label: 'Draft' },
            confirmed: { bg: 'bg-green-200 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Confirmed' },
            cancelled: { bg: 'bg-red-200 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Cancelled' },
        };

        const config = statusConfig[status] || statusConfig.draft;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const getPaymentStatusBadge = (paymentStatus) => {
        const paymentStatusConfig = {
            not_paid: { bg: 'bg-red-200 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Not Paid' },
            partial: { bg: 'bg-orange-200 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Partial' },
            paid: { bg: 'bg-green-200 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Paid' },
        };

        const config = paymentStatusConfig[paymentStatus] || paymentStatusConfig.not_paid;

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                {config.label}
            </span>
        );
    };

    return (
        <div className="animate-fadeIn">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">Customer Invoices</h1>
                    <p className="text-sm text-muted-foreground">List View</p>
                </div>
                <Button onClick={handleNewCustomerInvoice} variant="primary">
                    New
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-4">
                <div className="flex gap-4 items-center flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search by Invoice Number or Reference..."
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            className="w-full px-4 py-2 rounded-md text-sm bg-input text-foreground placeholder-muted-foreground neu-input focus-ring"
                        />
                    </div>
                    <div>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-4 py-2 rounded-md text-sm bg-input text-foreground neu-input focus-ring"
                        >
                            <option value="all">All Status</option>
                            <option value="draft">Draft</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <select
                            value={filters.paymentStatus}
                            onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                            className="px-4 py-2 rounded-md text-sm bg-input text-foreground neu-input focus-ring"
                        >
                            <option value="all">All Payment Status</option>
                            <option value="not_paid">Not Paid</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                        </select>
                    </div>
                </div>
            </Card>

            {/* Customer Invoices Table */}
            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Loading customer invoices...
                    </div>
                ) : customerInvoices.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No customer invoices found. Click "New" to create one.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    <th className="text-left p-4 font-semibold text-primary text-sm">Invoice No</th>
                                    <th className="text-left p-4 font-semibold text-primary text-sm">Customer Name</th>
                                    <th className="text-left p-4 font-semibold text-primary text-sm">Invoice Date</th>
                                    <th className="text-left p-4 font-semibold text-primary text-sm">Due Date</th>
                                    <th className="text-right p-4 font-semibold text-primary text-sm">Grand Total</th>
                                    <th className="text-right p-4 font-semibold text-primary text-sm">Amount Due</th>
                                    <th className="text-center p-4 font-semibold text-primary text-sm">Payment Status</th>
                                    <th className="text-center p-4 font-semibold text-primary text-sm">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customerInvoices.map((invoice) => (
                                    <tr
                                        key={invoice._id}
                                        onClick={() => handleRowClick(invoice._id)}
                                        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                                    >
                                        <td className="p-4 text-foreground text-sm font-medium">
                                            {invoice.invoiceNo}
                                        </td>
                                        <td className="p-4 text-foreground text-sm">
                                            {invoice.customerId?.name || 'N/A'}
                                        </td>
                                        <td className="p-4 text-foreground text-sm">
                                            {new Date(invoice.invoiceDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-foreground text-sm">
                                            {new Date(invoice.dueDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-foreground text-sm text-right font-semibold">
                                            ₹{invoice.grandTotal?.toLocaleString() || '0'}
                                        </td>
                                        <td className="p-4 text-foreground text-sm text-right font-semibold">
                                            ₹{invoice.amountDue?.toLocaleString() || '0'}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getPaymentStatusBadge(invoice.paymentStatus)}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(invoice.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
}
