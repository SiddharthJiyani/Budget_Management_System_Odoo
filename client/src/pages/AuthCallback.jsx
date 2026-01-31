import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = 'http://localhost:4000/api/auth';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const hasRun = useRef(false); // Prevent double execution

  useEffect(() => {
    // Prevent running twice in StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google login failed');
        navigate('/login');
        return;
      }

      if (!token) {
        toast.error('Authentication failed');
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (data.success) {
          setAuthData(token, data.user);
          toast.success('Welcome! 🎉');
          navigate('/dashboard');
        } else {
          toast.error('Authentication failed');
          navigate('/login');
        }
      } catch (error) {
        toast.error('Something went wrong');
        navigate('/login');
      }
    };

    handleCallback();
  }, []); // Empty deps - run once on mount

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-foreground font-medium text-lg">Completing sign in...</p>
        <p className="text-muted-foreground mt-2">Please wait</p>
      </div>
    </div>
  );
}
