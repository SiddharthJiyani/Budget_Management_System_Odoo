import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Plus, X, AlertTriangle, Send, Download, Ban, FileText, Sparkles, TrendingUp } from 'lucide-react';
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
  const [isCreatingBill, setIsCreatingBill] = useState(false);
  const [hasVendorBill, setHasVendorBill] = useState(false);
  const [existingVendorBillId, setExistingVendorBillId] = useState(null);
  const [productForm, setProductForm] = useState({
    productName: '',
    productId: '',
    quantity: 1,
    unitPrice: 0,
    budgetAnalyticId: null,
  });
  const [availableProducts, setAvailableProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // AI Recommendation State
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [showAISuggestion, setShowAISuggestion] = useState(false);

  useEffect(() => {
    fetchVendors();
    if (id) {
      loadPurchaseOrder();
    } else {
      generatePoNumber();
    }
  }, [id]);

  // Fetch products when modal opens
  useEffect(() => {
    if (showProductModal) {
      fetchAllProducts();
    }
  }, [showProductModal]);

  // Filter products based on search term
  useEffect(() => {
    if (productSearchTerm) {
      const filtered = availableProducts.filter(p => 
        p.name.toLowerCase().includes(productSearchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(availableProducts);
    }
  }, [productSearchTerm, availableProducts]);

  // Trigger AI recommendation when vendor and product are selected
  useEffect(() => {
    // Debounce the AI call - wait 800ms after user stops typing
    const timeoutId = setTimeout(() => {
      // Only trigger if we have vendor, product name (min 2 chars), and modal is open
      if (formData.vendorId && productForm.productName && productForm.productName.length >= 2 && showProductModal) {
        fetchAIRecommendation(formData.vendorId, productForm.productName);
      } else {
        setAiSuggestion(null);
        setShowAISuggestion(false);
      }
    }, 800);

    // Cleanup: cancel the timeout if dependencies change before 800ms
    return () => clearTimeout(timeoutId);
  }, [formData.vendorId, productForm.productName, showProductModal]);

  const fetchVendors = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CONTACTS.BASE, {
        headers: getAuthHeaders(),
      });
      
      const data = await response.json();

      if (data.success && data.data && data.data.contacts) {
        setVendors(data.data.contacts);
      } else {
        toast.error(data.message || 'Failed to load vendors');
        setVendors([]);
      }
    } catch (error) {
      toast.error('Failed to load vendors');
      setVendors([]);
    }
  };

  const fetchAllProducts = async () => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.PRODUCTS.BASE}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success && data.data && data.data.products) {
        // Filter out archived products
        const activeProducts = data.data.products.filter(p => p.status !== 'archived');
        setAvailableProducts(activeProducts);
        setFilteredProducts(activeProducts);
      } else {
        setAvailableProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      setAvailableProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoadingProducts(false);
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
        
        // Check if a vendor bill already exists for this PO
        await checkVendorBillExists();
      } else {
        toast.error(data.message || 'Failed to load purchase order');
      }
    } catch (error) {
      toast.error('Failed to load purchase order');
    } finally {
      setIsLoading(false);
    }
  };

  const checkVendorBillExists = async () => {
    if (!id) return;
    
    try {
      // Search for vendor bills and filter by purchase order ID on the client side
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.BASE, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      
      if (data.success && data.data && data.data.vendorBills) {
        // Check if any vendor bill has this purchase order ID
        const existingBill = data.data.vendorBills.find(bill => 
          bill.purchaseOrderId && bill.purchaseOrderId._id === id
        );
        if (existingBill) {
          setHasVendorBill(true);
          setExistingVendorBillId(existingBill._id);
        } else {
          setHasVendorBill(false);
          setExistingVendorBillId(null);
        }
      } else {
        setHasVendorBill(false);
        setExistingVendorBillId(null);
      }
    } catch (error) {
      console.error('Error checking vendor bill:', error);
      setHasVendorBill(false);
    }
  };

  const handleCreateBill = async () => {
    // If bill already exists, navigate to it
    if (hasVendorBill && existingVendorBillId) {
      navigate(`/vendor-bills/${existingVendorBillId}`);
      return;
    }

    if (!id || status !== 'confirmed') {
      toast.error('Purchase Order must be confirmed to create a vendor bill');
      return;
    }

    setIsCreatingBill(true);
    try {
      const response = await fetch(API_ENDPOINTS.VENDOR_BILLS.FROM_PO(id), {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Vendor Bill created successfully!');
        setHasVendorBill(true); // Update state to reflect bill creation
        setExistingVendorBillId(data.data._id);
        // Navigate to the created vendor bill
        navigate(`/vendor-bills/${data.data._id}`);
      } else {
        toast.error(data.message || 'Failed to create vendor bill');
      }
    } catch (error) {
      console.error('Error creating vendor bill:', error);
      toast.error('Failed to create vendor bill');
    } finally {
      setIsCreatingBill(false);
    }
  };

  // Fetch AI Analytics Recommendation
  const fetchAIRecommendation = async (vendorId, productName) => {
    if (!vendorId || !productName) {
      setAiSuggestion(null);
      setShowAISuggestion(false);
      return;
    }

    setLoadingAI(true);
    try {
      const response = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.AI_RECOMMEND, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          partnerId: vendorId,
          productId: null, // We only have product name, not ID in this form
        }),
      });

      const data = await response.json();

      if (data.success) {
        const topAI = data.data.aiRecommendations?.[0];
        const topStat = data.data.statisticalRecommendations?.[0];
        
        // Prefer AI recommendation if confidence > 70%, otherwise use statistical
        const recommendation = (topAI && topAI.confidence > 0.7) ? topAI : topStat;
        
        if (recommendation) {
          setAiSuggestion({
            analyticsId: recommendation.analyticsId,
            analyticsName: recommendation.analyticsName,
            confidence: recommendation.confidence,
            reason: recommendation.reason,
            source: topAI && topAI.confidence > 0.7 ? 'AI' : 'Pattern',
            historicalRecords: data.data.historicalSummary?.totalHistoricalRecords || 0,
          });
          setShowAISuggestion(true);
        } else {
          setAiSuggestion(null);
          setShowAISuggestion(false);
        }
      } else {
        setAiSuggestion(null);
        setShowAISuggestion(false);
      }
    } catch (error) {
      console.error('AI recommendation failed:', error);
      setAiSuggestion(null);
      setShowAISuggestion(false);
    } finally {
      setLoadingAI(false);
    }
  };

  // Close product modal and reset all states
  const closeProductModal = () => {
    setShowProductModal(false);
    setProductForm({ productName: '', productId: '', quantity: 1, unitPrice: 0, budgetAnalyticId: null });
    setProductSearchTerm('');
    setAiSuggestion(null);
    setShowAISuggestion(false);
  };

  const handleAddProduct = async () => {
    if (!productForm.productName || !productForm.quantity || !productForm.unitPrice) {
      toast.error('Please fill in all product fields');
      return;
    }

    setIsLoading(true);
    try {
      const totalPrice = productForm.quantity * productForm.unitPrice;
      let analyticsCategory = null;
      let exceedsBudget = false;

      // Check if AI suggestion was applied (budgetAnalyticId is already set)
      if (productForm.budgetAnalyticId) {
        analyticsCategory = productForm.budgetAnalyticId;
        // TODO: Could check budget here if needed
      } else {
        // Auto-assign analytics category using the existing API
        const analyticsResponse = await fetch(API_ENDPOINTS.PURCHASE_ORDERS.AUTO_ASSIGN_ANALYTICS, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            productName: productForm.productName,
            amount: totalPrice,
          }),
        });

        const analyticsData = await analyticsResponse.json();
        analyticsCategory = analyticsData.success ? analyticsData.data.analyticsCategory : null;
        exceedsBudget = analyticsData.success ? analyticsData.data.exceedsBudget : false;
      }

      const newProduct = {
        productName: productForm.productName,
        quantity: parseFloat(productForm.quantity),
        unitPrice: parseFloat(productForm.unitPrice),
        lineTotal: totalPrice,
        budgetAnalyticId: analyticsCategory,
        exceedsBudget: exceedsBudget,
      };

      setProducts([...products, newProduct]);
      closeProductModal();

      if (exceedsBudget && analyticsCategory) {
        toast.error(`Warning: This product exceeds the approved budget for ${analyticsCategory.name}`);
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
              onClick={handleCreateBill}
              variant={hasVendorBill ? "outline" : "primary"}
              size="sm"
              isLoading={isCreatingBill}
              disabled={isCreatingBill || (status !== 'confirmed' && !hasVendorBill) || !id}
              className={hasVendorBill ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : ""}
            >
              <FileText size={16} className="mr-1" />
              {hasVendorBill ? 'View Bill' : 'Create Bill'}
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
                onClick={closeProductModal}
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
                {isLoadingProducts ? (
                  <div className="w-full px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border">
                    Loading products...
                  </div>
                ) : availableProducts.length === 0 ? (
                  <div className="w-full px-3 py-2 rounded-lg bg-muted text-muted-foreground border border-border">
                    No products available. Please create products in Product Master first.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      type="text"
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      placeholder="Search products..."
                    />
                    <select
                      value={productForm.productId}
                      onChange={(e) => {
                        const selectedProduct = availableProducts.find(p => p._id === e.target.value);
                        setProductForm({
                          ...productForm,
                          productId: e.target.value,
                          productName: selectedProduct?.name || '',
                          unitPrice: selectedProduct?.purchasePrice || 0
                        });
                        setProductSearchTerm('');
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-input text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Select a product</option>
                      {filteredProducts.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} - ₹{product.purchasePrice}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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

              {/* AI Suggestion Card */}
              {loadingAI && (
                <div className="bg-muted rounded-lg p-4 flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <p className="text-sm text-muted-foreground">
                    Analyzing purchase patterns with AI...
                  </p>
                </div>
              )}

              {!loadingAI && showAISuggestion && aiSuggestion && (
                <div 
                  className={`rounded-lg p-4 border-2 ${
                    aiSuggestion.confidence > 0.7 
                      ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/40' 
                      : 'bg-muted border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      aiSuggestion.source === 'AI' 
                        ? 'bg-primary/20' 
                        : 'bg-muted-foreground/20'
                    }`}>
                      {aiSuggestion.source === 'AI' ? (
                        <Sparkles size={20} className="text-primary" />
                      ) : (
                        <TrendingUp size={20} className="text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          {aiSuggestion.source === 'AI' ? 'AI Recommendation' : 'Pattern Analysis'}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          aiSuggestion.confidence > 0.7 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted-foreground/20 text-foreground'
                        }`}>
                          {Math.round(aiSuggestion.confidence * 100)}% match
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Analytics: {aiSuggestion.analyticsName}
                      </p>
                      <p className="text-xs text-muted-foreground mb-2">
                        {aiSuggestion.reason}
                      </p>
                      {aiSuggestion.historicalRecords > 0 && (
                        <p className="text-xs text-muted-foreground mb-3">
                          Based on {aiSuggestion.historicalRecords} historical purchase{aiSuggestion.historicalRecords !== 1 ? 's' : ''}
                        </p>
                      )}
                      <Button
                        onClick={() => {
                          setProductForm({ 
                            ...productForm, 
                            budgetAnalyticId: {
                              _id: aiSuggestion.analyticsId,
                              name: aiSuggestion.analyticsName
                            }
                          });
                          setShowAISuggestion(false);
                          toast.success('AI suggestion applied');
                        }}
                        size="sm"
                        variant="primary"
                        className="w-full"
                      >
                        Apply Suggestion
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  onClick={closeProductModal}
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
