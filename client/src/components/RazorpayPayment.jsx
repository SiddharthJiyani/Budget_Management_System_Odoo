import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const RazorpayPayment = () => {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null); // 'success', 'failed', null

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle payment
  const handlePayment = async () => {
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setPaymentStatus(null);

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay SDK');
        setLoading(false);
        return;
      }

      // Create order on backend
      const orderResponse = await fetch('http://localhost:4000/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'INR',
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        toast.error(orderData.message || 'Failed to create order');
        setLoading(false);
        return;
      }

      // Get Razorpay key
      const keyResponse = await fetch('http://localhost:4000/api/payment/key');
      const keyData = await keyResponse.json();

      // Configure Razorpay options
      const options = {
        key: keyData.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Your Company Name',
        description: 'Payment for services',
        image: 'https://your-logo-url.com/logo.png', // Optional: Add your logo
        order_id: orderData.order.id,
        handler: async function (response) {
          // Payment successful, verify on backend
          try {
            const verifyResponse = await fetch('http://localhost:4000/api/payment/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              setPaymentStatus('success');
              toast.success('Payment successful! 🎉');
              setAmount('');
            } else {
              setPaymentStatus('failed');
              toast.error('Payment verification failed');
            }
          } catch (error) {
            console.error('Verification error:', error);
            setPaymentStatus('failed');
            toast.error('Payment verification failed');
          }
          setLoading(false);
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            toast.error('Payment cancelled');
          },
        },
        prefill: {
          name: 'John Doe',
          email: 'john@example.com',
          contact: '9999999999',
        },
        notes: {
          address: 'Corporate Office',
        },
        theme: {
          color: '#3b82f6',
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on('payment.failed', function (response) {
        setPaymentStatus('failed');
        toast.error('Payment failed');
        setLoading(false);
        console.error('Payment failed:', response.error);
      });

      razorpay.open();
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Something went wrong');
      setLoading(false);
    }
  };

return (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <div className="w-full max-w-md bg-card rounded-xl shadow-lg shadow-primary/10 border border-border">
      
      {/* Header */}
      <div className="p-6 border-b border-border text-center">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-card-foreground">
          Razorpay Payment
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Secure and reliable payment processing
        </p>
      </div>

      {/* Form */}
      <div className="p-6 space-y-6">
        {/* Amount Input */}
        <div>
          <label
            htmlFor="amount"
            className="block text-sm font-medium text-card-foreground mb-2"
          >
            Amount (INR)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              ₹
            </span>
            <input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={loading}
              className="w-full pl-8 pr-3 py-2.5 border border-input rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        {/* Pay Button */}
        <button
          onClick={handlePayment}
          disabled={loading || !amount}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-medium py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pay Now
            </>
          )}
        </button>

        {/* Success Message */}
        {paymentStatus === 'success' && (
          <div className="flex gap-3 p-4 rounded-lg border border-success/30 bg-success/10">
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-medium text-success">
                Payment Successful
              </p>
              <p className="text-sm text-success/80">
                Your payment has been completed successfully.
              </p>
            </div>
          </div>
        )}

        {/* Failure Message */}
        {paymentStatus === 'failed' && (
          <div className="flex gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/10">
            <XCircle className="w-5 h-5 text-destructive mt-0.5" />
            <div>
              <p className="font-medium text-destructive">
                Payment Failed
              </p>
              <p className="text-sm text-destructive/80">
                Please try again or use another method.
              </p>
            </div>
          </div>
        )}

        {/* Footer Info */}
        <div className="pt-4 border-t border-border text-xs text-muted-foreground flex justify-between">
          <span>Secure Payment</span>
          <span>Powered by Razorpay</span>
        </div>

        {/* Test Mode */}
        <div className="p-3 rounded-lg bg-secondary border border-border text-xs text-secondary-foreground text-center">
          Test Mode: Use card <span className="font-mono">4111 1111 1111 1111</span>
        </div>
      </div>
    </div>
  </div>
);

};

export default RazorpayPayment;
