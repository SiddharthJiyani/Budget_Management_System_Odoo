import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Home, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthProvider';
import toast from 'react-hot-toast';

const menuData = {
  Account: [
    { label: 'Contact', path: '/account/contact' },
    { label: 'Product', path: '/account/product' },
    { label: 'Analyticals', path: '/account/analyticals' },
    { label: 'Auto Analytic Model', path: '/account/auto-analytic-model' },
    { label: 'Budget', path: '/account/budget' },
  ],
  Purchase: [
    { label: 'Purchase Order', path: '/purchase/order' },
    { label: 'Purchase Bill', path: '/purchase/bill' },
    { label: 'Payment', path: '/purchase/payment' },
  ],
  Sale: [
    { label: 'Sale Order', path: '/sale/order' },
    { label: 'Sale Invoice', path: '/sale/invoice' },
    { label: 'Receipt', path: '/sale/receipt' },
  ],
};

function DropdownMenu({ items, isOpen, onItemClick }) {
  return (
    <div
      className={`dropdown-menu ${isOpen ? 'dropdown-menu-open' : ''}`}
      style={{
        position: 'absolute',
        top: '100%',
        left: '50%',
        transform: 'translateX(-50%)',
        marginTop: '0.5rem',
        minWidth: '220px',
        zIndex: 50,
      }}
    >
      <div className="dropdown-content neu-card p-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => onItemClick(item)}
            className="dropdown-item"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MenuItem({ label, items, isActive, onClick, onItemClick }) {
  return (
    <div className="relative menu-item-wrapper">
      <button
        onClick={onClick}
        className={`menu-item ${isActive ? 'menu-item-active' : ''}`}
      >
        <span className="font-semibold text-base">{label}</span>
        <ChevronDown
          size={18}
          className={`menu-chevron ${isActive ? 'menu-chevron-active' : ''}`}
        />
      </button>
      <DropdownMenu
        items={items}
        isOpen={isActive}
        onItemClick={onItemClick}
      />
    </div>
  );
}

export default function Header() {
  const [activeMenu, setActiveMenu] = useState(null);
  const headerRef = useRef(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    }

    if (activeMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [activeMenu]);

  const handleMenuClick = (menuName) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const handleItemClick = (item) => {
    setActiveMenu(null);
    navigate(item.path);
    toast.success(`Navigating to ${item.label}`);
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header
      ref={headerRef}
      className="header-container"
    >
      <nav className="header-nav">
        <div className="header-content">
          {/* Left side - Home button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="menu-item"
            title="Dashboard"
          >
            <Home size={20} />
            <span className="font-semibold text-base hidden sm:inline">Dashboard</span>
          </button>

          {/* Center - Main menu items */}
          <div className="flex items-center gap-2 md:gap-4 flex-1 justify-center">
            {Object.entries(menuData).map(([menuName, items]) => (
              <MenuItem
                key={menuName}
                label={menuName}
                items={items}
                isActive={activeMenu === menuName}
                onClick={() => handleMenuClick(menuName)}
                onItemClick={handleItemClick}
              />
            ))}
          </div>

          {/* Right side - User info and logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-foreground">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.accountType}
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
