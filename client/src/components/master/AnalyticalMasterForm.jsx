import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Input, Select } from '../ui';
import toast from 'react-hot-toast';

const mockAnalytical = {
  id: 1,
  name: 'Deepawali',
  description: 'Festival season analytics for decoration and lighting products',
  startDate: '2026-10-20',
  endDate: '2026-11-05',
  productCategory: 'decoration',
  status: 'Confirmed',
  archived: false,
};

const categoryOptions = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'stationery', label: 'Stationery' },
];

export default function AnalyticalMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    productCategory: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (recordId) {
      setFormData({
        name: mockAnalytical.name,
        description: mockAnalytical.description,
        startDate: mockAnalytical.startDate,
        endDate: mockAnalytical.endDate,
        productCategory: mockAnalytical.productCategory,
      });
    }
  }, [recordId]);

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
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Analytic ${recordId ? 'updated' : 'created'} successfully!`);
      onBack();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    toast.success('Analytic archived');
    onBack();
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

            <Select
              label="Product Category"
              value={formData.productCategory}
              onChange={(e) => handleChange('productCategory', e.target.value)}
              options={categoryOptions}
              placeholder="Select product category (optional)"
            />
          </div>
        </form>
      </Card>
    </div>
  );
}
