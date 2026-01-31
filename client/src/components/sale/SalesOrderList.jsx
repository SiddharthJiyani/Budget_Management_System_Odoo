import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../ui';
import { getAllSalesOrders } from '../../services/salesOrderService';
import { toast } from 'react-hot-toast';

export default function SalesOrderList() {
    const navigate = useNavigate();
    const [salesOrders, setSalesOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        status: 'all',
        search: '',
    });

    useEffect(() => {
        fetchSalesOrders();
    }, [filters]);

    const fetchSalesOrders = async () => {
        try {
            setLoading(true);
            const response = await getAllSalesOrders(filters);
            if (response.success) {
                setSalesOrders(response.data.salesOrders);
            }
        } catch (error) {
            console.error('Error fetching sales orders:', error);
            toast.error(error.message || 'Failed to fetch sales orders');
        } finally {
            setLoading(false);
        }
    };

    const handleNewSalesOrder = () => {
        navigate('/sale/order?view=form');
    };

    const handleRowClick = (id) => {
        navigate(`/sale/order?id=${id}`);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Draft' },
            confirmed: { bg: 'bg-green-200', text: 'text-green-700', label: 'Confirmed' },
            cancelled: { bg: 'bg-red-200', text: 'text-red-700', label: 'Cancelled' },
        };

        const config = statusConfig[status] || statusConfig.draft;

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
                    <h1 className="text-3xl font-bold text-foreground mb-1">Sales Orders</h1>
                    <p className="text-sm text-muted-foreground">List View</p>
                </div>
                <Button onClick={handleNewSalesOrder} variant="primary">
                    New
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-4">
                <div className="flex gap-4 items-center">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search by SO Number or Reference..."
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
                </div>
            </Card>

            {/* Sales Orders Table */}
            <Card className="overflow-hidden p-0">
                {loading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        Loading sales orders...
                    </div>
                ) : salesOrders.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No sales orders found. Click "New" to create one.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    <th className="text-left p-4 font-semibold text-primary text-sm">SO Number</th>
                                    <th className="text-left p-4 font-semibold text-primary text-sm">Customer Name</th>
                                    <th className="text-left p-4 font-semibold text-primary text-sm">SO Date</th>
                                    <th className="text-right p-4 font-semibold text-primary text-sm">Grand Total</th>
                                    <th className="text-center p-4 font-semibold text-primary text-sm">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesOrders.map((so) => (
                                    <tr
                                        key={so._id}
                                        onClick={() => handleRowClick(so._id)}
                                        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                                    >
                                        <td className="p-4 text-foreground text-sm font-medium">
                                            {so.soNumber}
                                        </td>
                                        <td className="p-4 text-foreground text-sm">
                                            {so.customerId?.name || 'N/A'}
                                        </td>
                                        <td className="p-4 text-foreground text-sm">
                                            {new Date(so.soDate).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-foreground text-sm text-right font-semibold">
                                            ₹{so.grandTotal?.toLocaleString() || '0'}
                                        </td>
                                        <td className="p-4 text-center">
                                            {getStatusBadge(so.status)}
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
