import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui';
import { Input, Select } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui';
import Header from '../components/Header';

const API_URL = 'http://localhost:4000/api/auth';

export default function CreateUser() {
  const [formData, setFormData] = useState({
    name: '',
    loginId: '',
    email: '',
    role: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const roleOptions = [
    { value: 'admin', label: 'Admin - All access rights' },
    { value: 'portal', label: 'Portal User - View & pay invoices/orders/bills' },
  ];

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.loginId) {
      newErrors.loginId = 'Login ID is required';
    } else if (formData.loginId.length < 6 || formData.loginId.length > 12) {
      newErrors.loginId = 'Login ID must be 6-12 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9])/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and special character';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          loginId: formData.loginId,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          accountType: formData.role,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`${formData.role === 'admin' ? 'Admin' : 'Portal'} user created successfully! 🎉`);
        // Reset form
        setFormData({
          name: '',
          loginId: '',
          email: '',
          role: '',
          password: '',
          confirmPassword: '',
        });
      } else {
        toast.error(data.message || 'Failed to create user');
        if (data.message?.includes('email')) {
          setErrors(prev => ({ ...prev, email: 'Email already exists' }));
        }
        if (data.message?.includes('login')) {
          setErrors(prev => ({ ...prev, loginId: 'Login ID already exists' }));
        }
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  return (
    <>
      <Header />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12 animate-fadeIn">
        <div className="w-full max-w-[720px]">
        <Card className="animate-slideIn">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="text-primary" size={24} />
            </div>
            <CardTitle>Create User</CardTitle>
            <CardDescription>Admin only - Create new user account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Desktop: Two-column grid, Mobile: Single column */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <Input
                  label="Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Enter full name"
                  icon={User}
                  error={errors.name}
                  disabled={isLoading}
                  required
                />

                <Select
                  label="Role"
                  value={formData.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  options={roleOptions}
                  placeholder="Select user role"
                  error={errors.role}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="Login ID"
                  type="text"
                  value={formData.loginId}
                  onChange={(e) => handleChange('loginId', e.target.value)}
                  placeholder="6-12 characters, unique"
                  icon={User}
                  error={errors.loginId}
                  disabled={isLoading}
                  required
                />

                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    icon={Lock}
                    error={errors.password}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[52px] text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <Input
                  label="Email ID"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com, unique"
                  icon={Mail}
                  error={errors.email}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="Re-Enter Password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  placeholder="Confirm password"
                  icon={Lock}
                  error={errors.confirmPassword}
                  disabled={isLoading}
                  required
                />
              </div>

              <CardFooter className="px-0 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </CardFooter>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}
