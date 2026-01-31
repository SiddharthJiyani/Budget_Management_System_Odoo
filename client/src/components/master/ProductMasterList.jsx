import { useState, useEffect } from 'react';
import { Home, Trash2, RotateCcw } from 'lucide-react';
import { Button, Card } from '../ui';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

// Removed mock data - now using backend API

export default function ProductMasterList({ onNew, onEdit, onHome }) {
  const [activeTab, setActiveTab] = useState('new');
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load products when tab changes
  useEffect(() => {
    loadProducts();
  }, [activeTab]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINTS.PRODUCTS.BASE}?status=${activeTab}`, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      console.log('prod data', data);

      if (data.success) {
        setProducts(data.data.products || []);
      } else {
        toast.error(data.message || 'Failed to load products');
      }
    } catch (error) {
      console.error('Load products error:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedRows.size === products.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(products.map((p) => p._id)));
    }
  };

  const handleDelete = async (e, product) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to archive "${product.name}"?`)) {
      try {
        const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(product._id), {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();

        if (data.success) {
          toast.success(`${product.name} archived successfully`);
          loadProducts(); // Reload the list
        } else {
          toast.error(data.message || 'Failed to archive product');
        }
      } catch (error) {
        console.error('Archive product error:', error);
        toast.error('Failed to archive product');
      }
    }
  };

  const handleToggleArchive = async (e, product) => {
    e.stopPropagation();
    const isArchived = product.status === 'archived';
    const action = isArchived ? 'restore' : 'archive';

    const toastId = toast.loading(`${action === 'archive' ? 'Archiving' : 'Restoring'} ${product.name}...`);

    try {
      const response = await fetch(
        isArchived
          ? API_ENDPOINTS.PRODUCTS.UNARCHIVE(product._id)
          : API_ENDPOINTS.PRODUCTS.BY_ID(product._id),
        {
          method: isArchived ? 'POST' : 'DELETE',
          headers: getAuthHeaders(),
        }
      );
      const data = await response.json();

      if (data.success) {
        toast.success(`${product.name} ${action}d successfully`, { id: toastId });
        loadProducts();
      } else {
        toast.error(data.message || `Failed to ${action} product`, { id: toastId });
      }
    } catch (error) {
      console.error(`${action} product error:`, error);
      toast.error(`Failed to ${action} product`, { id: toastId });
    }
  };

  const handleUnarchive = async (e, product) => {
    e.stopPropagation();
    if (window.confirm(`Restore "${product.name}"?`)) {
      try {
        const response = await fetch(API_ENDPOINTS.PRODUCTS.UNARCHIVE(product._id), {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`${product.name} restored`);
          loadProducts();
        } else {
          toast.error(data.message || 'Failed to restore');
        }
      } catch (error) {
        toast.error('Failed to restore product');
      }
    }
  };

  const handlePermanentDelete = async (e, product) => {
    e.stopPropagation();
    if (window.confirm(`⚠️ Permanently delete "${product.name}"? This cannot be undone!`)) {
      const toastId = toast.loading(`Permanently deleting ${product.name}...`);

      try {
        const response = await fetch(API_ENDPOINTS.PRODUCTS.PERMANENT_DELETE(product._id), {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (data.success) {
          toast.success(`${product.name} permanently deleted`, { id: toastId });
          loadProducts();
        } else {
          toast.error(data.message || 'Failed to delete', { id: toastId });
        }
      } catch (error) {
        toast.error('Failed to delete product', { id: toastId });
      }
    }
  };


  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Product Master</h1>
          <p className="text-muted-foreground">List View</p>
        </div>
        <Button
          onClick={onHome}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home size={18} />
          Home
        </Button>
      </div>

      {/* Main Card */}
      <Card className="overflow-hidden">
        {/* Tab Bar */}
        <div className="flex border-b border-border bg-muted/30">
          <button
            onClick={() => setActiveTab('new')}
            className={`px-6 py-3 font-semibold transition-all ${activeTab === 'new'
              ? 'bg-card text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
          >
            New
          </button>
          <button
            onClick={() => setActiveTab('archived')}
            className={`px-6 py-3 font-semibold transition-all ${activeTab === 'archived'
              ? 'bg-card text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
          >
            Archived
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3 px-6">
            <Button onClick={onNew} variant="primary" size="sm">
              New
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                <th className="text-left p-4 font-semibold text-primary">
                  <input
                    type="checkbox"
                    checked={
                      products.length > 0 &&
                      selectedRows.size === products.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer"
                  />
                </th>
                <th className="text-left p-4 font-semibold text-primary">Product Name</th>
                <th className="text-left p-4 font-semibold text-primary">Category</th>
                <th className="text-left p-4 font-semibold text-primary">Sales Price</th>
                <th className="text-left p-4 font-semibold text-primary">Purchase Price</th>
                <th className="text-center p-4 font-semibold text-primary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    Loading products...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-12 text-muted-foreground">
                    No products found. Click "New" to create one.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product._id}
                    onClick={() => onEdit(product._id)}
                    className="border-b border-border hover:bg-muted/50 transition-all cursor-pointer group"
                  >
                    <td
                      className="p-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectRow(product._id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedRows.has(product._id)}
                        onChange={() => { }}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                    </td>
                    <td className="p-4 font-medium text-foreground group-hover:text-primary transition-colors">
                      {product.name}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {/* Show category name if it's a valid name (not an ID) */}
                      {product.category?.name && !/^[a-f0-9]{24}$/i.test(product.category.name)
                        ? product.category.name
                        : '-'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      ₹ {product.salesPrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      ₹ {product.purchasePrice.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <label
                          className="relative inline-flex items-center cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={product.status === 'archived'}
                            onChange={(e) => handleToggleArchive(e, product)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-warning">
                          </div>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {product.status === 'archived' ? 'Archived' : 'Active'}
                          </span>
                        </label>

                        {/* Delete Button */}
                        {product.status === 'archived' ? (
                          /* Permanent Delete for archived items */
                          <button
                            onClick={(e) => handlePermanentDelete(e, product)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                            title="Permanently delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        ) : (
                          /* Archive (soft delete) for new items */
                          <button
                            onClick={(e) => handleDelete(e, product)}
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all hover:scale-110"
                            title="Archive product"
                          >
                            <Trash2 size={16} />
                          </button>
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
  );
}
