import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import {
  Pill,
  ShieldCheck,
  Lock,
  Mail,
  User,
  Phone,
  AlertCircle,
  CheckCircle,
  Building2,
  ShoppingBag,
  Package,
  Activity,
} from 'lucide-react';
import heroBg from '../../assets/hero-bg.jpg';

export const LoginPage = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('Cashier');
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiConnected, setApiConnected] = useState(null);

  useEffect(() => {
    // Probe backend health to ensure frontend is communicating with port 8001
    apiClient
      .get('/health')
      .then(() => setApiConnected(true))
      .catch((err) => {
        console.warn('Backend probe warning:', err.message);
        setApiConnected(false);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo('');
    setLoading(true);

    try {
      if (isSignup) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full staff name');
        }
        const result = await signup(email, password, fullName, role, contact);
        if (result?.confirmationRequired) {
          setSuccessInfo(
            'Account initialized! Supabase requires email verification. Please check your inbox to confirm, or sign in directly if email verification is disabled in your Supabase project.'
          );
          setIsSignup(false);
          return;
        }
      } else {
        await login(email, password);
      }
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Authentication error:', err);
      let msg = err.message || 'Invalid email or password';
      if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid staff email or password. Please verify and try again.';
      } else if (msg.includes('Email not confirmed')) {
        msg = 'Your email address is not confirmed in Supabase yet. Please check your email or disable "Confirm email" in Supabase Auth.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (targetEmail, targetRole) => {
    setIsSignup(false);
    setEmail(targetEmail);
    setPassword('PharmacyMaster2026!');
    setError('');
    setSuccessInfo(`Loaded credentials for ${targetRole}. Click 'Sign In to Portal' to proceed.`);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-slate-950 overflow-hidden">
      {/* Background Hero Image with Vignette & Glass Blur Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{ backgroundImage: `url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/80 to-emerald-950/75 backdrop-blur-[2px]" />

      {/* Main Glassmorphic Card */}
      <div className="relative z-10 w-full max-w-lg bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-6 sm:p-8 border border-white/40 my-6 transition-all">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/25 mb-3">
            <Pill className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-850 tracking-tight">
            Central Pharmacy
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Inventory & Sales Management System • Production Portal
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50/95 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Success / Notice Alert */}
        {successInfo && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-50/95 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{successInfo}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Sign Up Specific Fields */}
          {isSignup && (
            <>
              {/* Role Selection Cards */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Register Staff Account As:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Manager Option */}
                  <button
                    type="button"
                    onClick={() => setRole('Manager')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      role === 'Manager'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Building2 className={`w-3.5 h-3.5 ${role === 'Manager' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">Manager</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Chief Pharmacist, Pricing & Reports
                    </span>
                  </button>

                  {/* Cashier Option */}
                  <button
                    type="button"
                    onClick={() => setRole('Cashier')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      role === 'Cashier'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShoppingBag className={`w-3.5 h-3.5 ${role === 'Cashier' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">Cashier</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      POS Terminal, Billing & Credit
                    </span>
                  </button>

                  {/* Stock Handler Option */}
                  <button
                    type="button"
                    onClick={() => setRole('Stock Handler')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      role === 'Stock Handler'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-900 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Package className={`w-3.5 h-3.5 ${role === 'Stock Handler' ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">Stock</span>
                    </div>
                    <span className="text-[10px] text-slate-500 leading-tight">
                      Batches, Purchases & Expiry
                    </span>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Tariq Mahmood"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Contact / Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="+92-300-1234567"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@pharmacy.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{isSignup ? `Register as ${role}` : 'Sign In to Portal'}</span>
              </>
            )}
          </button>
        </form>

        {/* 1-Click Instant Demo Credentials */}
        {!isSignup && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Instant Pre-Configured Demo Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('manager@pharmacy.com', 'Manager')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition text-center shadow-xs"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('cashier@pharmacy.com', 'Cashier')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition text-center shadow-xs"
              >
                Cashier
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('stock@pharmacy.com', 'Stock Handler')}
                className="py-1.5 px-2 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300 border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 transition text-center shadow-xs"
              >
                Stock
              </button>
            </div>
          </div>
        )}

        {/* Toggle Signup/Login Mode */}
        <div className="mt-4 pt-3 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);
              setError('');
              setSuccessInfo('');
            }}
            className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold hover:underline transition"
          >
            {isSignup
              ? 'Already registered? Return to Sign In'
              : 'Register New Staff Member (Manager, Cashier, or Stock)'}
          </button>
        </div>

        {/* Backend Connectivity Status Indicator */}
        <div className="mt-3 text-center">
          {apiConnected === true && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-[11px] font-medium text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Pharmacy API Connected (Port 8001)
            </span>
          )}
          {apiConnected === false && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-[11px] font-medium text-amber-800 border border-amber-200">
              <AlertCircle className="w-3 h-3 text-amber-600" />
              API Disconnected • Press Ctrl + F5 to reload fresh settings
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
