import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Tags,
  Truck,
  Users,
  CreditCard,
  Boxes,
  BarChart3,
  UserCog,
  LogOut,
  Menu,
  X,
  AlertTriangle,
  History,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';

export const MainLayout = ({ children }) => {
  const { profile, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Build navigation items based strictly on role
  const getNavLinks = () => {
    if (role === 'Manager') {
      return [
        { name: 'Dashboard', path: '/manager/dashboard', icon: LayoutDashboard },
        { name: 'POS Checkout', path: '/cashier/pos', icon: ShoppingCart },
        { name: 'Medicines', path: '/manager/medicines', icon: Pill },
        { name: 'Categories', path: '/manager/categories', icon: Tags },
        { name: 'Suppliers', path: '/manager/suppliers', icon: Truck },
        { name: 'Customers', path: '/cashier/customers', icon: Users },
        { name: 'Credit Management', path: '/credit', icon: CreditCard },
        { name: 'Stock & Batches', path: '/stock/batches', icon: Boxes },
        { name: 'Stock Purchase', path: '/stock/purchase', icon: PlusCircle },
        { name: 'Inventory Alerts', path: '/stock/alerts', icon: AlertTriangle },
        { name: 'Sales History', path: '/sales/history', icon: History },
        { name: 'Reports', path: '/manager/reports', icon: BarChart3 },
        { name: 'Staff Users', path: '/manager/users', icon: UserCog },
      ];
    } else if (role === 'Cashier') {
      return [
        { name: 'POS Checkout', path: '/cashier/pos', icon: ShoppingCart },
        { name: 'Shift Dashboard', path: '/cashier/dashboard', icon: LayoutDashboard },
        { name: 'Customers', path: '/cashier/customers', icon: Users },
        { name: 'Pending Credit', path: '/credit', icon: CreditCard },
        { name: 'Sales History', path: '/sales/history', icon: History },
      ];
    } else if (role === 'Stock Handler') {
      return [
        { name: 'Stock Dashboard', path: '/stock/dashboard', icon: LayoutDashboard },
        { name: 'Receive Stock', path: '/stock/purchase', icon: PlusCircle },
        { name: 'Batches List', path: '/stock/batches', icon: Boxes },
        { name: 'Suppliers', path: '/manager/suppliers', icon: Truck },
        { name: 'Expiry & Alerts', path: '/stock/alerts', icon: AlertTriangle },
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'Manager':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Cashier':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Stock Handler':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shrink-0">
        <div className="h-16 flex items-center gap-3 px-6 bg-slate-950 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Central Pharmacy</h1>
            <p className="text-[10px] text-slate-400 font-medium">Inventory & POS v1.0</p>
          </div>
        </div>

        {/* User Info Capsule */}
        <div className="p-4 mx-3 my-3 bg-slate-800/60 rounded-xl border border-slate-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 font-bold flex items-center justify-center text-xs">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{profile?.name || 'Staff Member'}</p>
            <span
              className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-semibold border ${getRoleBadgeColor()}`}
            >
              {role}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between h-14 px-4 bg-slate-900 border-b border-slate-800 text-white">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold">Central Pharmacy</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${
                  isActive ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-medium text-red-400"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
};
