import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardsApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { StatCard } from '../../components/StatCard';
import { Banknote, ShoppingBag, CreditCard, ShoppingCart } from 'lucide-react';

export const CashierDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCashierMetrics();
  }, []);

  const loadCashierMetrics = async () => {
    setLoading(true);
    try {
      const res = await dashboardsApi.cashier();
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load cashier dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title & POS Quick Launch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Cashier Shift Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Your personal checkout performance today</p>
        </div>
        <Link
          to="/cashier/pos"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Open POS Register</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Today's Shift Sales"
          value={formatCurrency(metrics?.my_today_sales_total)}
          subtitle={`${metrics?.my_today_sales_count || 0} checkouts completed`}
          icon={Banknote}
          color="emerald"
        />
        <StatCard
          title="Completed Transactions"
          value={metrics?.my_today_sales_count || 0}
          subtitle="Sales processed on your register"
          icon={ShoppingBag}
          color="blue"
        />
        <StatCard
          title="My Pending Credit"
          value={formatCurrency(metrics?.my_pending_credit_amount)}
          subtitle={`${metrics?.my_pending_credit_count || 0} pending credit sales`}
          icon={CreditCard}
          color="amber"
        />
      </div>
    </div>
  );
};
