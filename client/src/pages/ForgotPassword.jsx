import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui';
import { API_ENDPOINTS } from '../config/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSent(true);
        toast.success('Reset link sent to your email');
      } else {
        toast.error(data.message || 'Could not send reset link');
      }
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fadeIn">
        <Card className="w-full max-w-md text-center animate-slideIn">
          <CardContent className="py-12 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
              <CheckCircle className="text-success" size={32} />
            </div>
            <h1 className="text-2xl font-semibold text-card-foreground">Check your inbox</h1>
            <p className="text-muted-foreground">
              We sent a password reset link if the email exists in our system.
            </p>
            <Link to="/login" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              <ArrowLeft size={16} /> Back to login
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-md">
        <Card className="animate-slideIn">
          <CardHeader className="text-center">
            <CardTitle>Forgot Password</CardTitle>
            <CardDescription>Enter your email and we will send a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                icon={Mail}
                disabled={isLoading}
                required
              />

              <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} disabled={isLoading}>
                {isLoading ? 'Sending link...' : 'Send reset link'}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Back to login
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}