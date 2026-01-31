import { useAuth } from '../context/AuthProvider';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, User, Mail, Calendar, Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, logout, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
            ← Home
          </Link>
          <button onClick={handleLogout} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            <LogOut size={18} />
            Logout
          </button>
        </div>

        {/* User Profile Card */}
        <div className="bg-card border border-border rounded-lg shadow-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={user?.profilePhoto || 'https://t4.ftcdn.net/jpg/05/49/98/39/240_F_549983970_bRCkYfk0P6PP5fKbMhZMIb07mCJ6esXL.jpg'}
                alt={user?.firstName || 'User'}
                className="w-24 h-24 rounded-full border-4 border-border object-cover"
              />
              {user?.googleId && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 border-2 border-border">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {user?.firstName || 'User'} {user?.lastName || ''} 👋
              </h1>
              <p className="text-muted-foreground">
                Welcome to your dashboard!
              </p>
            </div>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail size={20} className="text-primary" />
              </div>
              <span className="font-medium text-foreground">Email</span>
            </div>
            <p className="text-muted-foreground break-all">{user?.email}</p>
          </div>

          <div className="bg-card border border-border rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Shield size={20} className="text-secondary-foreground" />
              </div>
              <span className="font-medium text-foreground">Account Type</span>
            </div>
            <p className="text-muted-foreground capitalize">{user?.accountType || 'User'}</p>
          </div>

          <div className="bg-card border border-border rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Calendar size={20} className="text-success" />
              </div>
              <span className="font-medium text-foreground">Member Since</span>
            </div>
            <p className="text-muted-foreground">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="bg-card border border-border rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-accent/20 rounded-lg">
                <User size={20} className="text-accent-foreground" />
              </div>
              <span className="font-medium text-foreground">User ID</span>
            </div>
            <p className="text-muted-foreground text-sm font-mono">{user?._id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
