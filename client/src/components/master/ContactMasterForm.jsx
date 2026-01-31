import { useState, useEffect } from 'react';
import { Home, ArrowLeft, Upload } from 'lucide-react';
import { Button, Card, Input } from '../ui';
import toast from 'react-hot-toast';

// Mock data - replace with actual API calls
const mockContact = {
  id: 1,
  name: 'Azure Interior',
  email: 'azure.Interior24@example.com',
  phone: '8080808080',
  address: {
    street: '123 Main St',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
  },
  tags: ['B2B', 'MSME', 'Retailer', 'Local'],
  image: null,
  archived: false,
};

export default function ContactMasterForm({ recordId, onBack, onHome, onNew }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    tags: '',
    image: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Load data if editing existing record
  useEffect(() => {
    if (recordId) {
      // Simulate API call
      setFormData({
        name: mockContact.name,
        email: mockContact.email,
        phone: mockContact.phone,
        street: mockContact.address.street,
        city: mockContact.address.city,
        state: mockContact.address.state,
        country: mockContact.address.country,
        pincode: mockContact.address.pincode,
        tags: mockContact.tags.join(', '),
        image: mockContact.image,
      });
    }
  }, [recordId]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // In production, upload to server and get URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`Contact ${recordId ? 'updated' : 'created'} successfully!`);
      onBack();
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = () => {
    toast.success('Contact archived');
    onBack();
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Contact Master</h1>
          <p className="text-muted-foreground">
            {recordId ? 'Edit Contact' : 'New Contact'}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-5">
              <Input
                label="Contact Name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Enter contact name"
                required
              />

              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="unique email"
                required
              />

              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Integer"
              />

              <div className="space-y-3">
                <label className="block text-sm font-medium text-muted-foreground">
                  Address
                </label>
                <Input
                  type="text"
                  value={formData.street}
                  onChange={(e) => handleChange('street', e.target.value)}
                  placeholder="Street"
                />
                <Input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="City"
                />
                <Input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleChange('state', e.target.value)}
                  placeholder="State"
                />
                <Input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Country"
                />
                <Input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="Pincode"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-5">
              {/* Image Upload */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Profile Image
                </label>
                <div className="flex items-center gap-4">
                  {formData.image ? (
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="w-24 h-24 rounded-lg object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                      <Upload size={32} className="text-muted-foreground" />
                    </div>
                  )}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="px-4 py-2 bg-muted rounded-lg hover:bg-accent transition-colors text-sm font-medium">
                      Upload image
                    </div>
                  </label>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-muted-foreground">
                  Tags
                  <span className="block text-xs text-primary mt-1">
                    B2B, MSME, Retailer, Local
                  </span>
                </label>
                <textarea
                  value={formData.tags}
                  onChange={(e) => handleChange('tags', e.target.value)}
                  placeholder="Enter tags separated by commas (Many 2 Many Field)"
                  className="w-full px-4 py-3 rounded-lg bg-input text-foreground placeholder-muted-foreground neu-input focus-ring resize-none"
                  rows={4}
                />
                <p className="text-xs text-primary">
                  *Tags could have create and save list (Many 2 Many Field) can be create and
                  save onthe fly
                </p>
              </div>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
