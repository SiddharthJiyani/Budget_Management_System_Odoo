import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Select } from '../ui';
import toast from 'react-hot-toast';

const mockModel = {
  id: 1,
  partnerTag: 'vip',
  partner: 'mr-a',
  productCategory: 'wooden-furniture',
  product: 'office-chair',
  analyticToApply: 'deepawali',
};

const partnerTagOptions = [
  { value: 'vip', label: 'VIP Customer' },
  { value: 'regular', label: 'Regular Customer' },
  { value: 'wholesale', label: 'Wholesale' },
];

const partnerOptions = [
  { value: 'mr-a', label: 'Mr. A' },
  { value: 'azure-interior', label: 'Azure Interior' },
  { value: 'nimesh-pathak', label: 'Nimesh Pathak' },
];

const productCategoryOptions = [
  { value: 'wooden-furniture', label: 'Wooden Furniture' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'electronics', label: 'Electronics' },
];

const productOptions = [
  { value: 'office-chair', label: 'Office Chair' },
  { value: 'laptop', label: 'Laptop Dell XPS 15' },
];

const analyticOptions = [
  { value: 'deepawali', label: 'Deepawali' },
  { value: 'marriage-session', label: 'Marriage Session' },
  { value: 'furniture-expo', label: 'Furniture Expo 2026' },
];

export default function AutoAnalyticalModelForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    partnerTag: '',
    partner: '',
    productCategory: '',
    product: '',
    analyticToApply: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    if (recordId) {
      setFormData({
        partnerTag: mockModel.partnerTag,
        partner: mockModel.partner,
        productCategory: mockModel.productCategory,
        product: mockModel.product,
        analyticToApply: mockModel.analyticToApply,
      });
      setStatus('confirmed');
    }
  }, [recordId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('confirmed');
      toast.success(`Model ${recordId ? 'updated' : 'created'} successfully!`);
      onBack();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    toast.success('Model archived');
    onBack();
  };

  const handleCancel = () => {
    setStatus('cancelled');
    toast.success('Model cancelled');
  };

  const isReadOnly = status === 'confirmed' || status === 'cancelled';
  const isDisabled = status === 'archived' || status === 'cancelled';

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Auto Analytical Model</h1>
          <p className="text-muted-foreground">
            {recordId ? 'Edit Model' : 'New Model'}
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
          <Button
            onClick={onNew}
            variant="outline"
            size="sm"
            disabled={isDisabled}
          >
            New
          </Button>
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="sm"
            isLoading={isLoading}
            disabled={isLoading || isDisabled}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handleArchive} variant="outline" size="sm" disabled={isDisabled}>
            Archived
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              status === 'draft' 
                ? 'bg-muted text-muted-foreground'
                : status === 'confirmed'
                ? 'bg-success/20 text-success'
                : 'bg-destructive/20 text-destructive'
            }`}>
              {status === 'draft' ? 'Draft' : status === 'confirmed' ? 'Confirm' : 'Cancelled'}
            </span>
            {status === 'draft' && (
              <Button
                onClick={handleCancel}
                variant="outline"
                size="sm"
              >
                Cancel
              </Button>
            )}
          </div>
          <Button onClick={onHome} variant="outline" size="sm">
            <Home size={16} />
          </Button>
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft size={16} />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            {/* Section 1: Rule Conditions */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-6">Rule Conditions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-5">
                  <Select
                    label="Partner Tag"
                    value={formData.partnerTag}
                    onChange={(e) => handleChange('partnerTag', e.target.value)}
                    options={partnerTagOptions}
                    placeholder="Select Partner Tag"
                    disabled={isReadOnly || isDisabled}
                  />

                  <Select
                    label="Product Category"
                    value={formData.productCategory}
                    onChange={(e) => handleChange('productCategory', e.target.value)}
                    options={productCategoryOptions}
                    placeholder="Select Product Category"
                    disabled={isReadOnly || isDisabled}
                  />
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  <Select
                    label="Partner"
                    value={formData.partner}
                    onChange={(e) => handleChange('partner', e.target.value)}
                    options={partnerOptions}
                    placeholder="Select Partner"
                    disabled={isReadOnly || isDisabled}
                  />

                  <Select
                    label="Product"
                    value={formData.product}
                    onChange={(e) => handleChange('product', e.target.value)}
                    options={productOptions}
                    placeholder="Select Product"
                    disabled={isReadOnly || isDisabled}
                  />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border" />

            {/* Section 2: Auto Apply Analytical Model */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-6">
                Auto Apply Analytical Model
              </h2>
              <div className="max-w-md">
                <Select
                  label="Analytics to Apply"
                  value={formData.analyticToApply}
                  onChange={(e) => handleChange('analyticToApply', e.target.value)}
                  options={analyticOptions}
                  placeholder="Select Analytic"
                  disabled={isReadOnly || isDisabled}
                />
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
