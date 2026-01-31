import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { User, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';

export default function Login() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId || !password) {
      setError('Please fill all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Using email for now, adjust based on actual API
      const result = await login(loginId, password);

      if (result.success) {
        toast.success('Login successful! 🎉');
        navigate('/dashboard');
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
      <div className="w-full max-w-[480px]">
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

              <div>
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
    </div>
  );
}
