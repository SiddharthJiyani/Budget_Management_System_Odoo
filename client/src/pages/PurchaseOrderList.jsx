import { useState, useEffect } from 'react';
import { Plus, FileText, Send, Ban, Download } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function PurchaseOrderList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [activeTab]);

  const fetchPurchaseOrders = async () => {
    setIsLoading(true);
    try {
      const statusParam = activeTab === 'all' ? 'all' : activeTab;
      const url = `${API_ENDPOINTS.PURCHASE_ORDERS.BASE}?status=${statusParam}`;

      const response = await fetch(url, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setPurchaseOrders(data.data.purchaseOrders || []);
      } else {
        toast.error(data.message || 'Failed to load purchase orders');
        setPurchaseOrders([]);
      }
    } catch (error) {
      console.error('Fetch purchase orders error:', error);
      toast.error('Failed to load purchase orders');
      setPurchaseOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPDF = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.PDF(id), {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PO-${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded successfully');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Print PDF error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleSendToVendor = async (id) => {
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.SEND(id), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase order sent to vendor');
        fetchPurchaseOrders();
      } else {
        toast.error(data.message || 'Failed to send purchase order');
      }
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Failed to send purchase order');
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) {
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.CANCEL(id), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase order cancelled');
        fetchPurchaseOrders();
      } else {
        toast.error(data.message || 'Failed to cancel purchase order');
      }
    } catch (error) {
      console.error('Cancel error:', error);
      toast.error('Failed to cancel purchase order');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-success/20 text-success';
      case 'cancelled':
        return 'bg-destructive/20 text-destructive';
      case 'draft':
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Purchase Orders</h1>
              <p className="text-sm text-muted-foreground">Manage your purchase orders</p>
            </div>
          </div>

      {/* Table Card */}
      <Card className="overflow-hidden neu-card">
        {/* Tabs and New Button Bar */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab('draft')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'draft'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setActiveTab('confirmed')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'confirmed'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'cancelled'
                ? 'bg-card text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            Cancelled
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-6">
            <Button
              onClick={() => navigate('/purchase/orders/new')}
              variant="primary"
              size="sm"
            >
              <Plus size={16} className="mr-1" />
              New Purchase Order
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                <th className="text-left p-4 font-semibold text-primary text-sm">PO Number</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">Vendor</th>
                <th className="text-left p-4 font-semibold text-primary text-sm">Date</th>
                <th className="text-right p-4 font-semibold text-primary text-sm">Total Amount</th>
                <th className="text-center p-4 font-semibold text-primary text-sm">Status</th>
                <th className="text-center p-4 font-semibold text-primary text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    Loading purchase orders...
                  </td>
                </tr>
              ) : purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    No purchase orders found. Click "New Purchase Order" to create one.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr
                    key={po._id}
                    className="border-b border-border group transition-all duration-300 hover:shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)] hover:bg-muted/30"
                  >
                    <td
                      className="p-4 font-medium text-foreground group-hover:text-primary transition-colors duration-200 cursor-pointer"
                      onClick={() => navigate(`/purchase/orders/${po._id}`)}
                    >
                      {po.poNumber}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {po.vendorId?.name || 'N/A'}
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      {new Date(po.poDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right text-foreground font-medium">
                      {po.grandTotal?.toLocaleString() || '0'}/-
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${getStatusBadgeClass(
                          po.status
                        )}`}
                      >
                        {po.status?.charAt(0).toUpperCase() + po.status?.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/purchase/orders/${po._id}`)}
                          className="p-2 rounded-lg bg-card border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                          title="View"
                        >
                          <FileText size={16} />
                        </button>
                        <button
                          onClick={() => handlePrintPDF(po._id)}
                          className="p-2 rounded-lg bg-card border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                          title="Print PDF"
                        >
                          <Download size={16} />
                        </button>
                        {po.status !== 'cancelled' && (
                          <>
                            <button
                              onClick={() => handleSendToVendor(po._id)}
                              className="p-2 rounded-lg bg-card border border-border hover:bg-success hover:text-white transition-all"
                              title="Send to Vendor"
                            >
                              <Send size={16} />
                            </button>
                            {po.status === 'draft' && (
                              <button
                                onClick={() => handleCancel(po._id)}
                                className="p-2 rounded-lg bg-card border border-border hover:bg-destructive hover:text-white transition-all"
                                title="Cancel"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
        </div>
      </div>
    </>
  );
}
