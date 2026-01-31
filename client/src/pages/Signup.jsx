import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, CheckCircle, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';

const API_URL = 'http://localhost:4000/api/auth';

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    loginId: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkingLoginId, setCheckingLoginId] = useState(false);
  const [loginIdStatus, setLoginIdStatus] = useState(null); // 'available', 'taken', or null
  const navigate = useNavigate();

  // Password validation checklist
  const passwordValidation = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[^a-zA-Z0-9]/.test(formData.password),
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First Name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last Name is required';
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

    // Check loginId uniqueness when it changes
    if (field === 'loginId') {
      setLoginIdStatus(null);
      if (value.length >= 6 && value.length <= 12) {
        checkLoginIdAvailability(value);
      }
    }
  };

  // Check loginId availability with debouncing
  const checkLoginIdAvailability = async (loginId) => {
    setCheckingLoginId(true);

    try {
      const response = await fetch(`${API_URL}/check-loginid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId }),
      });

      const data = await response.json();

      if (data.success) {
        setLoginIdStatus(data.available ? 'available' : 'taken');
        if (!data.available) {
          setErrors(prev => ({ ...prev, loginId: 'Login ID already taken' }));
        }
      }
    } catch (error) {
      console.error('Error checking loginId:', error);
    } finally {
      setCheckingLoginId(false);
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
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          loginId: formData.loginId,
          accountType: 'portal', // Portal (Invoicing) user only
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        toast.success('Account created successfully! 🎉');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(data.message || 'Signup failed');
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

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md text-center animate-fadeIn">
          <CardContent className="py-12">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-success" size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Account Created!</h2>
            <p className="text-muted-foreground">
              Your portal account has been created successfully. Redirecting to login...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12 animate-fadeIn">
      <div className="w-full max-w-lg">
        <Card className="animate-slideIn">
          <CardHeader className="text-center">
            <CardTitle>Sign Up Page</CardTitle>
            <CardDescription>Create your invoicing portal account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Desktop: Two-column grid, Mobile: Single column */}
              <div className="">
                <Input
                  label="First Name"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  placeholder="Enter your first name"
                  icon={User}
                  error={errors.firstName}
                  disabled={isLoading}
                  required
                />

                <Input
                  label="Last Name"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  placeholder="Enter your last name"
                  icon={User}
                  error={errors.lastName}
                  disabled={isLoading}
                  required
                />

                <div className="relative">
                  <Input
                    label="Login ID"
                    type="text"
                    value={formData.loginId}
                    onChange={(e) => handleChange('loginId', e.target.value)}
                    placeholder="6-12 characters"
                    icon={User}
                    error={errors.loginId}
                    disabled={isLoading}
                    required
                  />
                  {formData.loginId.length >= 6 && (
                    <div className="absolute right-3 top-[43px] flex items-center gap-2">
                      {checkingLoginId ? (
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      ) : loginIdStatus === 'available' ? (
                        <Check className="text-success" size={20} />
                      ) : loginIdStatus === 'taken' ? (
                        <X className="text-destructive" size={20} />
                      ) : null}
                    </div>
                  )}
                </div>

                <Input
                  label="Email ID"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="you@example.com"
                  icon={Mail}
                  error={errors.email}
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
                    className="absolute right-3 top-[43px] text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    label="Re-Enter Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    placeholder="Confirm your password"
                    icon={Lock}
                    error={errors.confirmPassword}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[43px] text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Password Strength Checklist */}
              {formData.password && (
                <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-2">
                  <p className="text-sm font-medium text-foreground mb-3">Password Requirements:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <PasswordRequirement
                      met={passwordValidation.minLength}
                      text="At least 8 characters"
                    />
                    <PasswordRequirement
                      met={passwordValidation.hasUpperCase}
                      text="One uppercase letter"
                    />
                    <PasswordRequirement
                      met={passwordValidation.hasLowerCase}
                      text="One lowercase letter"
                    />
                    <PasswordRequirement
                      met={passwordValidation.hasNumber}
                      text="One number"
                    />
                    <PasswordRequirement
                      met={passwordValidation.hasSpecialChar}
                      text="One special character"
                    />
                    <PasswordRequirement
                      met={formData.password === formData.confirmPassword && formData.confirmPassword !== ''}
                      text="Passwords match"
                    />
                  </div>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              <p className="text-center text-sm text-muted-foreground pt-2">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Password Requirement Component
function PasswordRequirement({ met, text }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="text-success flex-shrink-0" size={16} />
      ) : (
        <X className="text-muted-foreground flex-shrink-0" size={16} />
      )}
      <span className={met ? 'text-success' : 'text-muted-foreground'}>
        {text}
      </span>
    </div>
  );
}
