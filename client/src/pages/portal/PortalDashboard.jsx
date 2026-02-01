import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { Mail, Calendar, User, FileText, ShoppingCart, DollarSign, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import PortalHeader from '../../components/portal/PortalHeader';
import { Card } from '../../components/ui';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function PortalDashboard() {
  const { user, token, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [contactInfo, setContactInfo] = useState(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    pendingInvoices: 0,
    totalAmount: 0,
    pendingAmount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!authLoading && user?.accountType === 'admin') {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  // Fetch contact info and stats
  useEffect(() => {
    async function fetchPortalData() {
      if (!token) return;

      try {
        setLoading(true);

        // Fetch contact information
        const contactResponse = await fetch(`${API_URL}/api/portal/my-profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (contactResponse.ok) {
          const contactData = await contactResponse.json();
          if (contactData.success) {
            setContactInfo(contactData.data);
          }
        }

        // Fetch invoice/bill stats
        const statsResponse = await fetch(`${API_URL}/api/portal/my-stats`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          if (statsData.success) {
            setStats(statsData.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch portal data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    if (token && !authLoading) {
      fetchPortalData();
    }
  }, [token, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const accountType = contactInfo?.type || user?.accountType || 'portal';
  const displayType = accountType === 'vendor' ? 'Vendor' : accountType === 'customer' ? 'Customer' : 'Portal User';

  return (
    <>
      <PortalHeader />
      <div className="header-spacer" />
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">

          {/* User Profile Card */}
          <div className="bg-card border border-border rounded-lg shadow-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                <img
                  src={user?.profilePhoto || contactInfo?.image || 'https://t4.ftcdn.net/jpg/05/49/98/39/240_F_549983970_bRCkYfk0P6PP5fKbMhZMIb07mCJ6esXL.jpg'}
                  alt={contactInfo?.name || user?.firstName || 'User'}
                  className="w-24 h-24 rounded-full border-4 border-border object-cover"
                />
              </div>

              {/* User Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {contactInfo?.name || `${user?.firstName || 'User'} ${user?.lastName || ''}`} 👋
                </h1>
                <p className="text-muted-foreground">
                  Welcome to your dashboard!
                </p>
              </div>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail size={20} className="text-primary" />
                </div>
                <span className="font-medium text-foreground">Email</span>
              </div>
              <p className="text-muted-foreground break-all">
                {contactInfo?.email || user?.email}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <User size={20} className="text-secondary-foreground" />
                </div>
                <span className="font-medium text-foreground">Account Type</span>
              </div>
              <p className="text-muted-foreground capitalize">{displayType}</p>
            </div>

            <div className="bg-card border border-border rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Calendar size={20} className="text-success" />
                </div>
                <span className="font-medium text-foreground">Member Since</span>
              </div>
              <p className="text-muted-foreground">
                {contactInfo?.createdAt 
                  ? new Date(contactInfo.createdAt).toLocaleDateString()
                  : user?.createdAt 
                  ? new Date(user.createdAt).toLocaleDateString() 
                  : 'N/A'}
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <User size={20} className="text-accent-foreground" />
                </div>
                <span className="font-medium text-foreground">User ID</span>
              </div>
              <p className="text-muted-foreground text-sm font-mono">
                {contactInfo?._id || user?._id}
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              {accountType === 'vendor' ? 'Bill Summary' : 'Invoice Summary'}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total {accountType === 'vendor' ? 'Bills' : 'Invoices'}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.totalInvoices}
                  </p>
                </div>
                <div className="p-3 bg-primary/20 rounded-lg">
                  <FileText size={24} className="text-primary" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Pending {accountType === 'vendor' ? 'Bills' : 'Invoices'}
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.pendingInvoices}
                  </p>
                </div>
                <div className="p-3 bg-warning/20 rounded-lg">
                  <Clock size={24} className="text-warning" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Amount
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    ₹{stats.totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-success/20 rounded-lg">
                  <DollarSign size={24} className="text-success" />
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Pending Amount
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    ₹{stats.pendingAmount.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-destructive/20 rounded-lg">
                  <ShoppingCart size={24} className="text-destructive" />
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold text-foreground mb-4">Quick Actions</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => navigate('/portal/invoices')}
                className="bg-card border border-border rounded-lg shadow p-6 hover:bg-accent/5 transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <FileText size={24} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      View {accountType === 'vendor' ? 'Bills' : 'Invoices'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      See all your {accountType === 'vendor' ? 'bills' : 'invoices'} and payment status
                    </p>
                  </div>
                </div>
              </button>

              {contactInfo?.phone && (
                <div className="bg-card border border-border rounded-lg shadow p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <Mail size={24} className="text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground mb-1">Contact Info</h3>
                      <p className="text-sm text-muted-foreground">{contactInfo.phone}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
