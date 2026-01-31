import { useState, useEffect } from 'react';
import { Plus, FileText, Send, Ban, Download, CreditCard, BarChart3 } from 'lucide-react';
import { Button, Card } from '../components/ui';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';

export default function VendorBillList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [vendorBills, setVendorBills] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const tabs = [
    { key: 'all', label: 'All', count: vendorBills.length },
    { key: 'draft', label: 'Draft', count: vendorBills.filter(bill => bill.status === 'draft').length },
    { key: 'confirmed', label: 'Confirmed', count: vendorBills.filter(bill => bill.status === 'confirmed').length },
    { key: 'cancelled', label: 'Cancelled', count: vendorBills.filter(bill => bill.status === 'cancelled').length },
  ];

  const paymentStatusColors = {
    not_paid: 'text-red-600 bg-red-50 border-red-200',
    partial: 'text-orange-600 bg-orange-50 border-orange-200',
    paid: 'text-green-600 bg-green-50 border-green-200',
  };

  useEffect(() => {
    fetchVendorBills();
  }, [activeTab]);

  const fetchVendorBills = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }

      const response = await fetch(`${API_ENDPOINTS.VENDOR_BILLS.BASE}?${params}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setVendorBills(data.data.vendorBills || []);
      } else {
        toast.error(data.message || 'Failed to fetch vendor bills');
      }
    } catch (error) {
      toast.error('Failed to fetch vendor bills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action, billId) => {
    setIsLoading(true);
    try {
      let endpoint, method = 'PATCH';
      let successMessage = '';

      switch (action) {
        case 'confirm':
          endpoint = API_ENDPOINTS.VENDOR_BILLS.CONFIRM(billId);
          successMessage = 'Vendor bill confirmed successfully';
          break;
        case 'cancel':
          endpoint = API_ENDPOINTS.VENDOR_BILLS.CANCEL(billId);
          successMessage = 'Vendor bill cancelled successfully';
          break;
        case 'send':
          endpoint = API_ENDPOINTS.VENDOR_BILLS.SEND(billId);
          method = 'POST';
          successMessage = 'Vendor bill sent successfully';
          break;
        case 'print':
          window.open(API_ENDPOINTS.VENDOR_BILLS.PDF(billId), '_blank');
          return;
        case 'pay':
          navigate(`/vendor-bills/${billId}/payment`);
          return;
        default:
          return;
      }

      const response = await fetch(endpoint, {
        method,
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(successMessage);
        fetchVendorBills();
      } else {
        toast.error(data.message || `Failed to ${action} vendor bill`);
      }
    } catch (error) {
      toast.error(`Failed to ${action} vendor bill`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBills = vendorBills.filter(bill => {
    if (activeTab === 'all') return true;
    return bill.status === activeTab;
  });

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Vendor Bills</h1>
              <p className="text-sm text-muted-foreground">Manage your vendor bills and payments</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => navigate('/master-data?type=budget')}
                variant="outline"
                size="sm"
              >
                <BarChart3 size={16} className="mr-1" />
                Budget
              </Button>
              <Button
                onClick={() => navigate('/vendor-bills/new')}
                variant="primary"
                size="sm"
              >
                <Plus size={16} className="mr-1" />
                New Bill
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 mb-6 bg-muted/30 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab.label}
                <span className="text-white ml-1.5 px-1.5 py-0.5 text-xs bg-muted rounded-full">
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Bills Table */}
          <Card className="overflow-hidden">
            {isLoading && (
              <div className="flex justify-center items-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
            
            {!isLoading && filteredBills.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No vendor bills found</p>
                <p className="text-sm mb-4">Create your first vendor bill to get started</p>
                <Button onClick={() => navigate('/vendor-bills/new')} variant="primary">
                  <Plus size={16} className="mr-1" />
                  New Bill
                </Button>
              </div>
            )}

            {!isLoading && filteredBills.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/10 border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Bill Number</th>
                      <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Vendor</th>
                      <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Bill Date</th>
                      <th className="text-left px-6 py-3 font-semibold text-primary text-sm">Due Date</th>
                      <th className="text-right px-6 py-3 font-semibold text-primary text-sm">Amount</th>
                      <th className="text-right px-6 py-3 font-semibold text-primary text-sm">Due Amount</th>
                      <th className="text-center px-6 py-3 font-semibold text-primary text-sm">Status</th>
                      <th className="text-center px-6 py-3 font-semibold text-primary text-sm">Payment</th>
                      <th className="text-center px-6 py-3 font-semibold text-primary text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((bill) => (
                      <tr
                        key={bill._id}
                        className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors"
                        onClick={() => navigate(`/vendor-bills/${bill._id}`)}
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
                        <td className="px-6 py-4 text-right font-mono text-sm">
                          ₹{bill.dueAmount?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              bill.status === 'draft'
                                ? 'text-blue-600 bg-blue-50 border-blue-200'
                                : bill.status === 'confirmed'
                                ? 'text-green-600 bg-green-50 border-green-200'
                                : 'text-red-600 bg-red-50 border-red-200'
                            }`}
                          >
                            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium border ${
                              paymentStatusColors[bill.paymentStatus] || 'text-gray-600 bg-gray-50 border-gray-200'
                            }`}
                          >
                            {bill.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              onClick={() => handleAction('print', bill._id)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0"
                            >
                              <Download size={18} />
                            </Button>
                            
                            {bill.status === 'confirmed' && bill.dueAmount > 0 && (
                              <Button
                                onClick={() => handleAction('pay', bill._id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-green-600 hover:text-green-700"
                              >
                                <CreditCard size={18} />
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => handleAction('send', bill._id)}
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 p-0 text-blue-600 hover:text-blue-700"
                              disabled={!bill.vendorId?.email}
                            >
                              <Send size={18} />
                            </Button>
                            
                            {bill.status === 'draft' && (
                              <Button
                                onClick={() => handleAction('confirm', bill._id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-green-600 hover:text-green-700"
                              >
                                <FileText size={18} />
                              </Button>
                            )}
                            
                            {bill.status !== 'cancelled' && (
                              <Button
                                onClick={() => handleAction('cancel', bill._id)}
                                variant="ghost"
                                size="sm"
                                className="h-10 w-10 p-0 text-red-600 hover:text-red-700"
                              >
                                <Ban size={18} />
                              </Button>
                            )}
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