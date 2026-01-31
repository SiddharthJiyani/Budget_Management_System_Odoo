import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Plus } from 'lucide-react';
import { Button, Card, Input, Select } from '../ui';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

// Removed mock data - using real API

export default function ProductMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    salesPrice: '',
    purchasePrice: '',
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  // Helper to check if a string looks like a MongoDB ObjectId (24 hex chars)
  const isMongoId = (str) => /^[a-f0-9]{24}$/i.test(str);

  const loadCategories = async () => {
    setIsCategoriesLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES.BASE, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        // Filter out categories that have ID-like names (invalid data)
        const validCategories = data.data.filter(cat => 
          cat.name && !isMongoId(cat.name)
        );
        
        const categories = validCategories.map(cat => ({
          value: cat._id,
          label: cat.name,
        }));
        setCategoryOptions(categories);
        
        if (categories.length === 0) {
          toast('No categories found. Create one to get started!', { icon: 'ℹ️' });
        }
      } else {
        toast.error(data.message || 'Failed to load categories');
      }
    } catch (error) {
      console.error('Load categories error:', error);
      toast.error('Failed to load categories');
    } finally {
      setIsCategoriesLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES.BASE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Category created successfully!');
        setNewCategoryName('');
        setShowCreateCategory(false);
        await loadCategories();
        // Auto-select the newly created category
        setFormData(prev => ({ ...prev, category: data.data._id }));
      } else {
        toast.error(data.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      toast.error('Failed to create category');
    }
  };

  useEffect(() => {
    if (recordId) {
      loadProduct();
    }
  }, [recordId]);

  const loadProduct = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(recordId), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        const product = data.data;
        setFormData({
          name: product.name,
          category: product.category?._id || '',
          salesPrice: product.salesPrice.toFixed(2),
          purchasePrice: product.purchasePrice.toFixed(2),
        });
      } else {
        toast.error(data.message || 'Failed to load product');
      }
    } catch (error) {
      console.error('Load product error:', error);
      toast.error('Failed to load product');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const productData = {
        name: formData.name,
        category: formData.category,
        salesPrice: parseFloat(formData.salesPrice),
        purchasePrice: parseFloat(formData.purchasePrice),
      };

      const url = recordId
        ? API_ENDPOINTS.PRODUCTS.BY_ID(recordId)
        : API_ENDPOINTS.PRODUCTS.BASE;

      const method = recordId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Product ${recordId ? 'updated' : 'created'} successfully!`);
        onBack();
      } else {
        toast.error(data.message || 'Failed to save product');
      }
    } catch (error) {
      console.error('Save product error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!recordId) return;

    try {
      const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_ID(recordId), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Product archived');
        onBack();
      } else {
        toast.error(data.message || 'Failed to archive product');
      }
    } catch (error) {
      console.error('Archive product error:', error);
      toast.error('Failed to archive product');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Product Master</h1>
          <p className="text-muted-foreground">
            {recordId ? 'Edit Product' : 'New Product'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <Card className="overflow-hidden">
        {/* Action Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
          <Button
            onClick={onNew}
            variant="outline"
            size="sm"
          >
            New
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="sm"
            isLoading={isLoading}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleArchive} variant="outline" size="sm">
            Archived
          </Button>
          <div className="flex-1" />
          <Button onClick={onHome} variant="outline" size="sm">
            <Home size={16} />
          </Button>
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <div className="max-w-2xl space-y-5">
            <Input
              label="Product Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter product name"
              required
            />

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-muted-foreground">
                    Category <span className="text-destructive ml-1">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCreateCategory(!showCreateCategory)}
                    className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                  >
                    <Plus size={14} />
                    Create New
                  </button>
                </div>
                
                {showCreateCategory ? (
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Enter category name"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      variant="primary"
                      size="sm"
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowCreateCategory(false);
                        setNewCategoryName('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    options={categoryOptions}
                    placeholder={isCategoriesLoading ? "Loading categories..." : categoryOptions.length === 0 ? "No categories - Create one!" : "Selection"}
                    required
                    disabled={isCategoriesLoading}
                  />
                )}
              </div>
              <Input
                label="Sales Price"
                type="number"
                step="0.01"
                value={formData.salesPrice}
                onChange={(e) => handleChange('salesPrice', e.target.value)}
                placeholder="22.20 Rs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div />
              <Input
                label="Purchase Price"
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', e.target.value)}
                placeholder="15.00 Rs"
                required
              />
            </div>

            <div className="text-xs text-primary space-y-1 mt-4">
              <p>*Category can be create and save onthe fly ( Create & Save )</p>
              <p>(Many 2 One Field)</p>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
