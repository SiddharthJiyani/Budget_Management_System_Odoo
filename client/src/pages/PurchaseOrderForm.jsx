import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Plus, X, AlertTriangle, Send, Download, Ban } from 'lucide-react';
import { Button, Card, Input, Select } from '../components/ui';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../config/api';
import Header from '../components/Header';

export default function PurchaseOrderForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [purchaseOrder, setPurchaseOrder] = useState(null);
  const [formData, setFormData] = useState({
    vendorId: '',
    poDate: new Date().toISOString().split('T')[0],
    poNumber: '',
    reference: '',
    notes: '',
  });
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('draft');
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    productName: '',
    quantity: 1,
    unitPrice: 0,
  });

  useEffect(() => {
    fetchVendors();
    if (id) {
      loadPurchaseOrder();
    } else {
      generatePoNumber();
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

  const generatePoNumber = async () => {
    // Auto-generate PO number on backend, just display placeholder
    const year = new Date().getFullYear();
    setFormData(prev => ({ ...prev, poNumber: `PO-${year}-XXXX` }));
  };

  const loadPurchaseOrder = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.BY_ID(id), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        const po = data.data;
        setPurchaseOrder(po);
        setFormData({
          vendorId: po.vendorId?._id || '',
          poDate: po.poDate ? po.poDate.split('T')[0] : '',
          poNumber: po.poNumber || '',
          reference: po.reference || '',
          notes: po.notes || '',
        });
        setProducts(po.lines || []);
        setStatus(po.status || 'draft');
      } else {
        toast.error(data.message || 'Failed to load purchase order');
      }
    } catch (error) {
      toast.error('Failed to load purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.productName || !productForm.quantity || !productForm.unitPrice) {
      toast.error('Please fill in all product fields');
      return;
    }

    setIsLoading(true);
    try {
      // Auto-assign analytics category
      const totalPrice = productForm.quantity * productForm.unitPrice;
      const analyticsResponse = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.AUTO_ASSIGN_ANALYTICS, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productName: productForm.productName,
          amount: totalPrice,
        }),
      });

      const analyticsData = await analyticsResponse.json();

      const newProduct = {
        productName: productForm.productName,
        quantity: parseFloat(productForm.quantity),
        unitPrice: parseFloat(productForm.unitPrice),
        lineTotal: totalPrice,
        budgetAnalyticId: analyticsData.success ? analyticsData.data.analyticsCategory : null,
        exceedsBudget: analyticsData.success ? analyticsData.data.exceedsBudget : false,
      };

      setProducts([...products, newProduct]);
      setShowProductModal(false);
      setProductForm({ productName: '', quantity: 1, unitPrice: 0 });

      if (analyticsData.success && analyticsData.data.exceedsBudget) {
        toast.error(`Warning: This product exceeds the approved budget for ${analyticsData.data.analyticsCategory.name}`);
      } else {
        toast.success('Product added successfully');
      }
    } catch (error) {
      toast.error('Failed to add product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveProduct = (index) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!formData.vendorId) {
      toast.error('Please select a vendor');
      return;
    }

    if (products.length === 0) {
      toast.error('Please add at least one product');
      return;
    }

    setIsLoading(true);
    try {
      const poData = {
        vendorId: formData.vendorId,
        poDate: formData.poDate,
        reference: formData.reference,
        lines: products.map(p => ({
          productName: p.productName,
          quantity: p.quantity,
          unitPrice: p.unitPrice,
          budgetAnalyticId: p.budgetAnalyticId?._id || null,
          exceedsBudget: p.exceedsBudget || false,
        })),
        notes: formData.notes,
      };

      const url = id
        ? API_ENDPOINTS.PURCHASE_ORDERS.BY_ID(id)
        : API_ENDPOINTS.PURCHASE_ORDERS.BASE;
      const method = id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(poData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Purchase order ${id ? 'updated' : 'created'} successfully!`);
        if (!id) {
          // Navigate to the created purchase order
          navigate(`/purchase/orders/${data.data._id}`);
        } else {
          await loadPurchaseOrder();
        }
      } else {
        toast.error(data.message || 'Failed to save purchase order');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!id) {
      toast.error('Please save the purchase order first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.CONFIRM(id), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase order confirmed successfully!');
        await loadPurchaseOrder();
      } else {
        toast.error(data.message || 'Failed to confirm purchase order');
      }
    } catch (error) {
      toast.error('Failed to confirm purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintPDF = async () => {
    if (!id) {
      toast.error('Please save the purchase order first');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.PDF(id), {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${formData.poNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('PDF downloaded successfully');
      } else {
        toast.error('Failed to generate PDF');
      }
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const handleSendToVendor = async () => {
    if (!id) {
      toast.error('Please save the purchase order first');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.SEND(id), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase order sent to vendor');
        await loadPurchaseOrder();
      } else {
        toast.error(data.message || 'Failed to send purchase order');
      }
    } catch (error) {
      toast.error('Failed to send purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!id) {
      navigate('/purchase/orders');
      return;
    }

    if (!confirm('Are you sure you want to cancel this purchase order?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.CANCEL(id), {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Purchase order cancelled');
        await loadPurchaseOrder();
      } else {
        toast.error(data.message || 'Failed to cancel purchase order');
      }
    } catch (error) {
      toast.error('Failed to cancel purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const canEdit = status === 'draft';
  const grandTotal = products.reduce((sum, p) => sum + (p.lineTotal || 0), 0);

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-1">Purchase Order</h1>
            <p className="text-sm text-muted-foreground">
              {id ? 'Edit Purchase Order' : 'Create New Purchase Order'}
            </p>
          </div>

      <Card className="overflow-hidden neu-card">
        {/* Action Bar & Status Ribbon */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/20">
          {/* Left: Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/purchase/orders')}
              variant="outline"
              size="sm"
            >
              <ArrowLeft size={16} className="mr-1" />
              Back to List
            </Button>
            <Button
              onClick={handleSave}
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={isLoading || !canEdit}
            >
              Save
            </Button>
            <Button
              onClick={handleConfirm}
              variant="primary"
              size="sm"
              isLoading={isLoading}
              disabled={isLoading || status !== 'draft'}
            >
              Confirm
            </Button>
            <Button
              onClick={handlePrintPDF}
              variant="outline"
              size="sm"
              disabled={!id}
            >
              <Download size={16} className="mr-1" />
              Print
            </Button>
            <Button
              onClick={handleSendToVendor}
              variant="outline"
              size="sm"
              disabled={!id || status === 'cancelled'}
            >
              <Send size={16} className="mr-1" />
              Send
            </Button>
            <Button
              onClick={handleCancel}
              variant="outline"
              size="sm"
              disabled={status === 'cancelled'}
            >
              <Ban size={16} className="mr-1" />
              Cancel
            </Button>
          </div>

          {/* Right: Status Stepper */}
          <div className="flex items-center gap-1">
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${
                status === 'draft' ? 'text-foreground' : 'text-muted-foreground/60'
              }`}
            >
              Draft
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300 ${
                status === 'confirmed'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground/60'
              }`}
            >
              Confirmed
            </span>
            <span className="text-muted-foreground/40">→</span>
            <span
              className={`px-3 py-1 text-xs font-semibold transition-all duration-300 ${
                status === 'cancelled' ? 'text-destructive' : 'text-muted-foreground/60'
              }`}
            >
              Cancelled
            </span>
          </div>
        </div>

        {/* PO Details Section */}
        <div className="px-6 py-4 bg-card border-b border-border">
          <div className="max-w-5xl mx-auto space-y-3">
            {/* PO Number & Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                  PO Number
                </label>
                <Input
                  type="text"
                  value={formData.poNumber}
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
                  value={formData.poDate}
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
            <div className="text-center py-12 text-muted-foreground">
              No products added. Click "Add Product" to add items.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-border bg-muted/10">
                    <th className="text-left px-4 py-2 font-semibold text-primary text-xs">Product</th>
                    <th className="text-left px-4 py-2 font-semibold text-primary text-xs">Analytics</th>
                    <th className="text-right px-4 py-2 font-semibold text-primary text-xs">Quantity</th>
                    <th className="text-right px-4 py-2 font-semibold text-primary text-xs">Unit Price</th>
                    <th className="text-right px-4 py-2 font-semibold text-primary text-xs">Total</th>
                    {canEdit && (
                      <th className="text-center px-4 py-2 font-semibold text-primary text-xs">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => (
                    <tr key={index} className="border-b border-border/30">
                      <td className="px-4 py-3 text-sm text-foreground">
                        {product.productName}
                        {product.exceedsBudget && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
                            <AlertTriangle size={12} />
                            Exceeds Approved Budget
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.budgetAnalyticId?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">
                        {product.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-foreground">
                        {product.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-foreground">
                        {product.lineTotal.toFixed(2)}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveProduct(index)}
                            className="text-destructive hover:bg-destructive/10 p-1 rounded"
                          >
                            <X size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td colSpan={canEdit ? 4 : 3} className="px-4 py-3 text-right text-sm">
                      Grand Total:
                    </td>
                    <td className="px-4 py-3 text-right text-lg text-foreground">
                      {grandTotal.toFixed(2)}
                    </td>
                    {canEdit && <td></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">Add Product</h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Product Name *
                </label>
                <Input
                  type="text"
                  value={productForm.productName}
                  onChange={(e) =>
                    setProductForm({ ...productForm, productName: e.target.value })
                  }
                  placeholder="Enter product name"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Quantity *
                </label>
                <Input
                  type="number"
                  value={productForm.quantity}
                  onChange={(e) =>
                    setProductForm({ ...productForm, quantity: e.target.value })
                  }
                  min="1"
                  step="1"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Unit Price *
                </label>
                <Input
                  type="number"
                  value={productForm.unitPrice}
                  onChange={(e) =>
                    setProductForm({ ...productForm, unitPrice: e.target.value })
                  }
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={() => setShowProductModal(false)}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProduct}
                  variant="primary"
                  isLoading={isLoading}
                >
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
