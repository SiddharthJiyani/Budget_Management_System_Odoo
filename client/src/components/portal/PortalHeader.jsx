import { FileText, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import toast from 'react-hot-toast';

/**
 * Portal Header Component
 * 
 * Simplified header for portal users (customers/vendors).
 * Shows only: Logo, My Invoices link, User name, Logout
 * 
 * No admin menus (Account, Purchase, Sale)
 */
export default function PortalHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuth();

    const handleLogout = () => {
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const isActive = location.pathname === '/portal/invoices';

    return (
        <header className="header-container">
            <nav className="header-nav">
                <div className="header-content">
                    {/* Left side - Logo/Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                            <FileText size={22} className="text-primary" />
                        </div>
                        <span className="font-bold text-lg text-foreground hidden sm:inline">
                            Budget Portal
                        </span>
                    </div>

                    {/* Center - My Invoices (single nav item) */}
                    <div className="flex items-center">
                        <button
                            onClick={() => navigate('/portal/invoices')}
                            className={`menu-item ${isActive ? 'menu-item-active' : ''}`}
                        >
                            <FileText size={18} />
                            <span className="font-semibold text-base">My Invoices</span>
                        </button>
                    </div>

                    {/* Right side - User info and logout */}
                    <div className="flex items-center gap-3">
                        {user && (
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-semibold text-foreground">
                                    {user.firstName} {user.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                    Portal User
                                </p>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="menu-item"
                            title="Logout"
                        >
                            <LogOut size={18} />
                            <span className="font-semibold text-base hidden lg:inline">Logout</span>
                        </button>
                    </div>
                </div>
            </nav>
        </header>
    );
}
