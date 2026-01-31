import { useState, useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { Button, Card, Input, Select } from '../ui';
import toast from 'react-hot-toast';

const mockAnalytical = {
  id: 1,
  name: 'Marketing Campaign 2026',
  code: 'MKT-2026',
  type: 'marketing',
  archived: false,
};

const typeOptions = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'research', label: 'Research' },
  { value: 'operations', label: 'Operations' },
  { value: 'hr', label: 'Human Resources' },
];

export default function AnalyticalMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (recordId) {
      setFormData({
        name: mockAnalytical.name,
        code: mockAnalytical.code,
        type: mockAnalytical.type,
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
      toast.success(`Analytical account ${recordId ? 'updated' : 'created'} successfully!`);
      onBack();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    toast.success('Analytical account archived');
    onBack();
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytical Master</h1>
          <p className="text-muted-foreground">
            {recordId ? 'Edit Analytical Account' : 'New Analytical Account'}
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
              label="Account Name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter analytical account name"
              required
            />

            <div className="grid grid-cols-2 gap-5">
              <Input
                label="Account Code"
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="e.g., MKT-2026"
                required
              />
              <Select
                label="Type"
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                options={typeOptions}
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
