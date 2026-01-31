import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Input, Select } from '../ui';
import toast from 'react-hot-toast';

// Mock data
const mockProduct = {
  id: 1,
  name: 'Office Chair',
  category: 'furniture',
  salesPrice: 5500.0,
  purchasePrice: 4200.0,
  archived: false,
};

const categoryOptions = [
  { value: 'furniture', label: 'Furniture' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'software', label: 'Software' },
];

export default function ProductMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    salesPrice: '',
    purchasePrice: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (recordId) {
      setFormData({
        name: mockProduct.name,
        category: mockProduct.category,
        salesPrice: mockProduct.salesPrice.toFixed(2),
        purchasePrice: mockProduct.purchasePrice.toFixed(2),
      });
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
      toast.success(`Product ${recordId ? 'updated' : 'created'} successfully!`);
      onBack();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    toast.success('Product archived');
    onBack();
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
              <Select
                label="Category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                options={categoryOptions}
                placeholder="Selection"
                required
              />
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
