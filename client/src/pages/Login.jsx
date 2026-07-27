import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { User, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import DemoAccessDialog from '../components/DemoAccessDialog';

const DEMO_ACCOUNTS = [
  {
    key: 'admin',
    label: 'Admin demo',
    note: 'Full access to master data, users, and approvals.',
    values: [
      { label: 'Login ID', value: 'demo-admin' },
      { label: 'Password', value: 'Demo@1234' },
    ],
    fill: { loginId: 'demo-admin', password: 'Demo@1234' },
  },
  {
    key: 'portal',
    label: 'Portal demo',
    note: 'Customer/vendor view for invoices and payments.',
    values: [
      { label: 'Login ID', value: 'demo-portal' },
      { label: 'Password', value: 'Demo@1234' },
    ],
    fill: { loginId: 'demo-portal', password: 'Demo@1234' },
  },
];

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoDialog, setShowDemoDialog] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const autofillDemo = (item) => {
    setLoginId(item.fill.loginId);
    setPassword(item.fill.password);
    setShowDemoDialog(false);
    toast.success(`${item.label} filled`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId || !password) {
      setError('Please fill all fields');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(loginId, password);

      if (result.success) {
        toast.success('Login successful! 🎉');

        // Redirect based on user account type
        // Portal users (customers/vendors) go to their invoices
        // Admin users go to dashboard
        if (result.user?.accountType === 'portal') {
          navigate('/portal/invoices');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid Login ID or Password');
        toast.error('Invalid Login ID or Password');
      }
    } catch (error) {
      setError('Invalid Login ID or Password');
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-lg">
        <Card className="animate-slideIn">
          <CardHeader className="text-center">
            <CardTitle>Login Page</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Login ID"
                type="text"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="Enter your login ID"
                icon={User}
                disabled={isLoading}
                required
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  icon={Lock}
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

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 animate-slideIn">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>

              <button
                type="button"
                onClick={() => setShowDemoDialog(true)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles size={16} />
                Click here for demo access
              </button>

              <div className="flex items-center justify-center gap-4 text-sm pt-2">
                <Link
                  to="/forgot-password"
                  className="text-primary hover:underline font-medium"
                >
                  Forget Password?
                </Link>
                <span className="text-muted-foreground">|</span>
                <Link
                  to="/signup"
                  className="text-primary hover:underline font-medium"
                >
                  Sign Up
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <DemoAccessDialog
        open={showDemoDialog}
        title="Demo accounts for recruiter review"
        description="Use these credentials to quickly explore the admin and portal flows. Click Autofill Demo to fill the login form instantly."
        items={DEMO_ACCOUNTS}
        onClose={() => setShowDemoDialog(false)}
        onAutofill={autofillDemo}
      />
    </div>
  );
}
