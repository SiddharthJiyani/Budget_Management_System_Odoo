import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Input, Select } from '../ui';
import toast from 'react-hot-toast';
import { API_ENDPOINTS, getAuthHeaders } from '../../config/api';

// Removed mock data - using real API

export default function AnalyticalMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    productCategory: '',
    type: 'Expense',
  });
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.CATEGORIES.BASE, {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        setCategoryOptions(data.data.map(cat => ({
          value: cat._id,
          label: cat.name,
        })));
      }
    } catch (error) {
      console.error('Load categories error:', error);
    }
  };

  useEffect(() => {
    if (recordId) {
      loadAnalytic();
    }
  }, [recordId]);

  const loadAnalytic = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS.BY_ID(recordId), {
        headers: getAuthHeaders(),
      });
      const data = await response.json();

      if (data.success) {
        const analytic = data.data;
        setFormData({
          name: analytic.name,
          description: analytic.description || '',
          startDate: analytic.startDate ? analytic.startDate.split('T')[0] : '',
          endDate: analytic.endDate ? analytic.endDate.split('T')[0] : '',
          productCategory: analytic.productCategory?._id || '',
          type: analytic.type || 'Expense',
        });
      } else {
        toast.error(data.message || 'Failed to load analytic');
      }
    } catch (error) {
      console.error('Load analytic error:', error);
      toast.error('Failed to load analytic');
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Analytic Name is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End Date must be greater than or equal to Start Date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      const analyticData = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        productCategory: formData.productCategory || null,
        type: formData.type,
      };

      const url = recordId
        ? API_ENDPOINTS.ANALYTICS.BY_ID(recordId)
        : API_ENDPOINTS.ANALYTICS.BASE;

      const method = recordId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(analyticData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Analytic ${recordId ? 'updated' : 'created'} successfully!`);
        onBack();
      } else {
        toast.error(data.message || 'Failed to save analytic');
      }
    } catch (error) {
      console.error('Save analytic error:', error);
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!recordId) return;

    try {
      const response = await fetch(API_ENDPOINTS.ANALYTICS.BY_ID(recordId), {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Analytic archived');
        onBack();
      } else {
        toast.error(data.message || 'Failed to archive analytic');
      }
    } catch (error) {
      console.error('Archive analytic error:', error);
      toast.error('Failed to archive analytic');
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics Master</h1>
          <p className="text-muted-foreground">
            {recordId ? 'Edit Analytic' : 'New Analytic'}
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
          <div className="max-w-3xl space-y-5">
            <Input
              label="Analytic Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter analytic name (e.g., Deepawali, Marriage Session)"
              error={errors.name}
              required
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Enter description (optional)"
                className="w-full px-4 py-3 rounded-lg bg-input text-foreground placeholder-muted-foreground neu-input focus-ring resize-none"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
              />
              <Input
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                error={errors.endDate}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Select
                label="Product Category"
                value={formData.productCategory}
                onChange={(e) => handleChange('productCategory', e.target.value)}
                options={categoryOptions}
                placeholder="Select product category (optional)"
              />
              
              <Select
                label="Type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                options={[
                  { value: 'Income', label: 'Income' },
                  { value: 'Expense', label: 'Expense' },
                ]}
                placeholder="Select type"
                required
              />
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
