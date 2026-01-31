import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Save, FileText, Send, CreditCard, ArrowLeft, Download } from 'lucide-react';
import { Button, Card, Input } from '../components/ui';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
import toast from 'react-hot-toast';
import Header from '../components/Header';

export default function VendorBillForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    vendorId: '',
    billDate: new Date().toISOString().split('T')[0],
    billNumber: '',
    reference: '',
    notes: '',
  });

  const [vendors, setVendors] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState('draft');
  const [paymentStatus, setPaymentStatus] = useState('not_paid');
  const [dueAmount, setDueAmount] = useState(0);
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    productName: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    fetchVendors();
    fetchAnalytics();
    if (isEdit) {
      fetchVendorBill();
    } else {
      generateBillNumber();
    }
  }, [id]);

  const fetchVendors = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.VENDORS.BASE, {
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success && data.data && data.data.vendors) {
        setVendors(data.data.vendors);
      } else {
        toast.error(data.message || 'Failed to load vendors');
        setVendors([]);
      }
    } catch (error) {
      toast.error('Failed to load vendors');
      setVendors([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analytics`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setAnalytics(data.data.analytics || []);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  const generateBillNumber = async () => {
    // Auto-generate bill number on backend, just display placeholder
    const year = new Date().getFullYear();
    setFormData(prev => ({ ...prev, billNumber: `BILL-${year}-XXXX` }));
  };

  const fetchVendorBill = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching vendor bill with ID:', id);
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.BY_ID(id), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      console.log('Vendor bill response:', data);

      if (data.success) {
        // The backend returns the vendor bill directly in data, not data.vendorBill
        const bill = data.data;
        console.log('Bill data:', bill);

        setFormData({
          vendorId: bill.vendorId?._id || '',
          billDate: bill.billDate ? bill.billDate.split('T')[0] : '',
          billNumber: bill.billNumber || '',
          reference: bill.reference || '',
          notes: bill.notes || '',
        });

        // Ensure all products have calculated totalPrice
        const processedLines = (bill.lines || []).map(line => ({
          ...line,
          totalPrice: line.totalPrice || (line.quantity * line.unitPrice)
        }));

        setProducts(processedLines);
        setStatus(bill.status || 'draft');
        setPaymentStatus(bill.paymentStatus || 'not_paid');
        setDueAmount(bill.dueAmount || 0);
      } else {
        console.error('Failed to fetch vendor bill:', data);
        toast.error(data.message || 'Failed to fetch vendor bill');
        navigate('/vendor-bills');
      }
    } catch (error) {
      console.error('Error fetching vendor bill:', error);
      toast.error('Failed to fetch vendor bill: ' + error.message);
      navigate('/vendor-bills');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.productName || !productForm.quantity || !productForm.unitPrice) {
      toast.error('Please fill in all product fields');
      return;
    }

    const newProduct = {
      productName: productForm.productName,
      description: productForm.productName,
      quantity: parseInt(productForm.quantity),
      unitPrice: parseFloat(productForm.unitPrice),
      totalPrice: parseInt(productForm.quantity) * parseFloat(productForm.unitPrice),
      // budgetAnalyticId will be auto-assigned by backend
    };

    setProducts([...products, newProduct]);
    setProductForm({ productName: '', quantity: 1, unitPrice: 0 });
    setShowProductModal(false);
    toast.success('Product added successfully');
  };

  const handleRemoveProduct = (index) => {
    const updatedProducts = products.filter((_, i) => i !== index);
    setProducts(updatedProducts);
    toast.success('Product removed');
  };

  const calculateTotal = () => {
    return products.reduce((sum, product) => {
      const totalPrice = product.totalPrice || (product.quantity * product.unitPrice) || 0;
      return sum + totalPrice;
    }, 0);
  };

  const canEdit = status === 'draft' || !id;

  const handleSubmit = async (action = 'save') => {
    if (!formData.vendorId) {
      toast.error('Please select a vendor');
      return;
    }

    if (products.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setIsSaving(true);
    try {
      // Calculate due date as 30 days from bill date
      const billDate = new Date(formData.billDate);
      const dueDate = new Date(billDate);
      dueDate.setDate(dueDate.getDate() + 30);

      const submitData = {
        vendorId: formData.vendorId,
        billDate: formData.billDate,
        dueDate: dueDate.toISOString().split('T')[0],
        reference: formData.reference,
        notes: formData.notes,
        lines: products,
      };

      console.log('Submitting vendor bill:', submitData);

      const url = isEdit
        ? API_ENDPOINTS.VENDOR_BILLS.BY_ID(id)
        : API_ENDPOINTS.VENDOR_BILLS.BASE;

      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (data.success) {
        const billId = data.data?.vendorBill?._id || data.data?._id;
        toast.success(isEdit ? 'Vendor bill updated successfully' : 'Vendor bill created successfully');

        if (action === 'confirm' && billId) {
          await confirmBill(billId);
        } else if (action === 'save' && !isEdit && billId) {
          // For new bills saved as draft, navigate to edit page to stay on the form
          navigate(`/vendor-bills/${billId}`, { replace: true });
        } else if (action === 'save' && isEdit) {
          // For editing existing bills, reload the data to show updated values
          await fetchVendorBill();
        }
        // For save on existing bills, stay on the same page (no navigation)
      } else {
        console.error('Save failed:', data);
        toast.error(data.message || 'Failed to save vendor bill');
      }
    } catch (error) {
      console.error('Error saving vendor bill:', error);
      toast.error('Failed to save vendor bill: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmBill = async (billId) => {
    try {
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.CONFIRM(billId), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Vendor bill confirmed successfully');
        navigate('/vendor-bills');
      } else {
        toast.error(data.message || 'Failed to confirm vendor bill');
      }
    } catch (error) {
      toast.error('Failed to confirm vendor bill');
    }
  };

  const handlePayment = () => {
    navigate(`/vendor-bills/${id}/payment`);
  };

  const handleSendEmail = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.SEND(id), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Vendor bill sent successfully');
      } else {
        toast.error(data.message || 'Failed to send vendor bill');
      }
    } catch (error) {
      toast.error('Failed to send vendor bill');
    }
  };

  const handlePrint = () => {
    window.open(API_ENDPOINTS.VENDOR_BILLS.PDF(id), '_blank');
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

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8 animate-fadeIn">
        <div className="max-w-6xl mx-auto">
          <Card className="overflow-hidden shadow-lg">
            {/* Header Section */}
            <div className="flex items-center justify-between px-6 py-4 bg-card border-b border-border">
              {/* Left: Actions */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate('/vendor-bills')}
                  variant="ghost"
                  size="sm"
                >
                  <ArrowLeft size={16} className="mr-1" />
                  Back
                </Button>
                {id && (
                  <>
                    <Button
                      onClick={handlePrint}
                      variant="outline"
                      size="sm"
                      disabled={!id}
                    >
                      <Download size={16} className="mr-1" />
                      Print
                    </Button>
                    <Button
                      onClick={handleSendEmail}
                      variant="outline"
                      size="sm"
                      disabled={!id || status === 'cancelled'}
                    >
                      <Send size={16} className="mr-1" />
                      Send
                    </Button>
                    {status === 'confirmed' && dueAmount > 0 && (
                      <Button
                        onClick={handlePayment}
                        variant="primary"
                        size="sm"
                      >
                        <CreditCard size={16} className="mr-1" />
                        Pay
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Right: Status Stepper */}
              <div className="flex items-center gap-1">
                <span
                  className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${status === 'draft' ? 'text-foreground' : 'text-muted-foreground/60'
                    }`}
                >
                  Draft
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${status === 'confirmed'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground/60'
                    }`}
                >
                  Confirmed
                </span>
                <span className="text-muted-foreground/40">→</span>
                <span
                  className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${status === 'cancelled' ? 'text-destructive' : 'text-muted-foreground/60'
                    }`}
                >
                  Cancelled
                </span>
              </div>
            </div>

            {/* Bill Details Section */}
            <div className="px-6 py-4 bg-card border-b border-border">
              <div className="max-w-5xl mx-auto space-y-3">
                {/* Bill Number & Date */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Bill Number
                    </label>
                    <Input
                      type="text"
                      value={formData.billNumber}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Date
                    </label>
                    <Input
                      type="date"
                      value={formData.billDate}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                      Reference
                    </label>
                    <Input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="Optional reference"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* Vendor */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Vendor *
                  </label>
                  <select
                    value={formData.vendorId}
                    onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                    disabled={!canEdit}
                    className="w-full px-3 py-2 rounded-lg bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Vendor</option>
                    {vendors.map((vendor) => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    disabled={!canEdit}
                    className="w-full px-3 py-2 rounded-lg bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    rows="2"
                  />
                </div>
              </div>
            </div>

            {/* Products Section */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Products</h3>
                {canEdit && (
                  <Button
                    onClick={() => setShowProductModal(true)}
                    variant="primary"
                    size="sm"
                  >
                    <Plus size={16} className="mr-1" />
                    Add Product
                  </Button>
                )}
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p className="mb-2">No products added yet</p>
                  {canEdit && (
                    <Button onClick={() => setShowProductModal(true)} variant="outline" size="sm">
                      <Plus size={16} className="mr-1" />
                      Add First Product
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border border-border rounded-lg overflow-hidden">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Budget Analytics
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Total
                        </th>
                        {canEdit && (
                          <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Actions
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products.map((product, index) => (
                        <tr key={index} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">
                            {product.productName || product.description}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {product.budgetAnalyticId?.name || (
                              <span className="text-xs italic text-muted-foreground/60">No analytics assigned</span>
                            )}
                            {product.autoAssigned && product.budgetAnalyticId?.name && (
                              <span className="ml-2 px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded">
                                Auto
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">
                            {product.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono">
                            ₹{product.unitPrice?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-mono font-semibold">
                            ₹{(product.totalPrice || (product.quantity * product.unitPrice))?.toFixed(2) || '0.00'}
                          </td>
                          {canEdit && (
                            <td className="px-4 py-3 text-center">
                              <Button
                                onClick={() => handleRemoveProduct(index)}
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive/80"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/10">
                      <tr>
                        <td colSpan={canEdit ? "4" : "4"} className="px-4 py-3 text-right font-semibold text-foreground">
                          Total:
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-lg text-primary">
                          ₹{calculateTotal().toFixed(2)}
                        </td>
                        {canEdit && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canEdit && (
              <div className="px-6 py-4 bg-muted/10 border-t border-border">
                <div className="flex justify-end gap-3">
                  <Button
                    onClick={() => navigate('/vendor-bills')}
                    variant="outline"
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleSubmit('save')}
                    variant="outline"
                    disabled={isSaving}
                  >
                    <Save size={16} className="mr-1" />
                    {isSaving ? 'Saving...' : 'Save Draft'}
                  </Button>
                  <Button
                    onClick={() => handleSubmit('confirm')}
                    variant="primary"
                    disabled={isSaving}
                  >
                    <FileText size={16} className="mr-1" />
                    {isSaving ? 'Confirming...' : 'Confirm Bill'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* Product Modal */}
          {showProductModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <Card className="w-full max-w-md p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Add Product</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Product Name *
                    </label>
                    <Input
                      value={productForm.productName}
                      onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Quantity *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={productForm.quantity}
                      onChange={(e) => setProductForm({ ...productForm, quantity: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Unit Price *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={productForm.unitPrice}
                      onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      onClick={() => {
                        setShowProductModal(false);
                        setProductForm({ productName: '', quantity: 1, unitPrice: 0 });
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddProduct} variant="primary">
                      Add Product
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}