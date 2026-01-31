import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, Banknote, Smartphone, ArrowLeft, Check } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import toast from 'react-hot-toast';
import Header from '../components/Header';

export default function PaymentModal() {
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [vendorBill, setVendorBill] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'razorpay',
    reference: '',
    notes: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);

  const paymentMethods = [
    {
      id: 'razorpay',
      name: 'Online Payment',
      icon: <Smartphone size={20} />,
      description: 'Pay using Razorpay gateway',
      color: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      icon: <Banknote size={20} />,
      description: 'Cash payment offline',
      color: 'border-green-200 bg-green-50 text-green-700',
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      icon: <CreditCard size={20} />,
      description: 'Direct bank transfer',
      color: 'border-purple-200 bg-purple-50 text-purple-700',
    },
  ];

  useEffect(() => {
    fetchVendorBill();
  }, [id]);

  const fetchVendorBill = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.BY_ID(id), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        const bill = data.data;  // API returns data directly, not data.data.vendorBill
        setVendorBill(bill);
        setPaymentData(prev => ({
          ...prev,
          amount: (bill && bill.dueAmount) ? bill.dueAmount : 0,
        }));
      } else {
        toast.error(data.message || 'Failed to fetch vendor bill');
        navigate('/vendor-bills');
      }
    } catch (error) {
      toast.error('Failed to fetch vendor bill');
      navigate('/vendor-bills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({ ...prev, [field]: value }));
  };

  const createRazorpayOrder = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.CREATE_PAYMENT(id), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          paymentMethod: 'razorpay',
          reference: paymentData.reference,
          notes: paymentData.notes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data;  // Backend returns payment data directly in data.data
      } else {
        throw new Error(data.message || 'Failed to create payment order');
      }
    } catch (error) {
      throw error;
    }
  };

  const verifyRazorpayPayment = async (razorpayPaymentId, razorpayOrderId, razorpaySignature) => {
    try {
      console.log('Verifying payment with:', { razorpayPaymentId, razorpayOrderId, razorpaySignature, amount: paymentData.amount });
      
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.VERIFY_PAYMENT(id), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpayPaymentId,
          razorpayOrderId,
          razorpaySignature,
          amount: paymentData.amount,
          notes: paymentData.notes,
        }),
      });

      const data = await response.json();
      console.log('Payment verification response:', data);

      if (data.success) {
        toast.success('Payment completed successfully!');
        navigate('/vendor-bills');
      } else {
        console.error('Payment verification failed:', data);
        toast.error(data.message || 'Payment verification failed');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Payment verification failed');
    }
  };

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    try {
      const payment = await createRazorpayOrder();
      
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: payment.amount || payment.amount * 100,
        currency: 'INR',
        name: 'Budget Management System',
        description: `Payment for Bill ${vendorBill?.billNumber || 'N/A'}`,
        order_id: payment.orderId,
        handler: function (response) {
          verifyRazorpayPayment(
            response.razorpay_payment_id,
            response.razorpay_order_id,
            response.razorpay_signature
          );
        },
        prefill: {
          name: vendorBill.vendorId?.name || '',
          email: vendorBill.vendorId?.email || '',
          contact: vendorBill.vendorId?.phone || '',
        },
        theme: {
          color: '#3B82F6',
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            toast.error('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error(error.message || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  const handleOfflinePayment = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.CREATE_PAYMENT(id), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentData,
          paymentDate: paymentData.paymentDate,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Payment recorded successfully!');
        navigate('/vendor-bills');
      } else {
        toast.error(data.message || 'Failed to record payment');
      }
    } catch (error) {
      toast.error('Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (paymentData.amount <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    if (paymentData.amount > vendorBill.dueAmount) {
      toast.error('Payment amount cannot exceed due amount');
      return;
    }

    if (paymentData.paymentMethod === 'razorpay') {
      await handleRazorpayPayment();
    } else {
      await handleOfflinePayment();
    }
  };

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="header-spacer" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </>
    );
  }

  if (!vendorBill) {
    return (
      <>
        <Header />
        <div className="header-spacer" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">Vendor bill not found</p>
            <Button onClick={() => navigate('/vendor-bills')} className="mt-4">
              Back to Bills
            </Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8 animate-fadeIn">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              onClick={() => navigate(`/vendor-bills/${id}`)}
              variant="ghost"
              size="sm"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">Payment</h1>
              <p className="text-sm text-muted-foreground">
                Process payment for Bill {vendorBill?.billNumber || 'N/A'}
              </p>
            </div>
          </div>

          {/* Bill Summary */}
          <Card className="p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  {vendorBill?.vendorId?.name || 'N/A'}
                </h3>
                <p className="text-sm text-muted-foreground">Bill #{vendorBill?.billNumber || 'N/A'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{vendorBill?.grandTotal?.toFixed(2) || '0.00'}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Paid Amount</p>
                <p className="font-semibold text-green-600">
                  ₹{((vendorBill?.grandTotal || 0) - (vendorBill?.dueAmount || 0))?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Due Amount</p>
                <p className="font-semibold text-red-600">
                  ₹{vendorBill?.dueAmount?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Payment Status</p>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  vendorBill?.paymentStatus === 'paid'
                    ? 'text-green-600 bg-green-50 border-green-200'
                    : vendorBill?.paymentStatus === 'partial'
                    ? 'text-orange-600 bg-orange-50 border-orange-200'
                    : 'text-red-600 bg-red-50 border-red-200'
                }`}>
                  {vendorBill?.paymentStatus?.replace('_', ' ').toUpperCase() || 'N/A'}
                </span>
              </div>
            </div>
          </Card>

          {/* Payment Form */}
          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Payment Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0.01"
                  max={vendorBill?.dueAmount || 0}
                  step="0.01"
                  value={paymentData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum payable amount: ₹{vendorBill?.dueAmount?.toFixed(2) || '0.00'}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`relative rounded-lg border-2 cursor-pointer transition-all ${
                        paymentData.paymentMethod === method.id
                          ? `${method.color} border-current`
                          : 'border-border bg-background hover:border-primary/30'
                      }`}
                      onClick={() => handleInputChange('paymentMethod', method.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {method.icon}
                            <span className="font-medium">{method.name}</span>
                          </div>
                          {paymentData.paymentMethod === method.id && (
                            <Check size={16} className="text-current" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Payment Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={paymentData.paymentDate}
                  onChange={(e) => handleInputChange('paymentDate', e.target.value)}
                  required
                />
              </div>

              {/* Reference */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reference
                </label>
                <Input
                  value={paymentData.reference}
                  onChange={(e) => handleInputChange('reference', e.target.value)}
                  placeholder="Transaction ID, Cheque number, etc."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background text-foreground resize-none"
                  placeholder="Additional payment notes..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
                <Button
                  type="button"
                  onClick={() => navigate(`/vendor-bills/${id}`)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isProcessing || paymentData.amount <= 0}
                  variant="primary"
                >
                  <CreditCard size={16} className="mr-1" />
                  {isProcessing 
                    ? 'Processing...' 
                    : paymentData.paymentMethod === 'razorpay' 
                    ? 'Pay Now' 
                    : 'Record Payment'
                  }
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}