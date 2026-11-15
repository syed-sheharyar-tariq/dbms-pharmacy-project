import React, { useState, useEffect } from 'react';
import { dashboardsApi, salesApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { StatCard } from '../../components/StatCard';
import { Badge } from '../../components/Badge';
import {
  Banknote,
  Boxes,
  AlertTriangle,
  Clock,
  CreditCard,
  Pill,
  ShoppingBag,
  History,
} from 'lucide-react';

export const ManagerDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, salesRes] = await Promise.all([
        dashboardsApi.manager(),
        salesApi.list({ limit: 5 }),
      ]);
      setMetrics(dashRes.data);
      setRecentSales(salesRes.data);
    } catch (err) {
      console.error('Failed to load manager dashboard:', err);
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
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Executive Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Live business operations, sales performance, and inventory health overview
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(metrics?.today_sales_total)}
          subtitle={`${metrics?.today_sales_count || 0} transactions (Paid: ${formatCurrency(
            metrics?.today_paid_total
          )})`}
          icon={Banknote}
          color="emerald"
        />
        <StatCard
          title="Active Catalog"
          value={metrics?.active_medicines_count || 0}
          subtitle={`${metrics?.sellable_stock_units || 0} sellable units in stock`}
          icon={Pill}
          color="blue"
        />
        <StatCard
          title="Pending Credit"
          value={formatCurrency(metrics?.pending_credit_total)}
          subtitle="Outstanding customer receivables"
          icon={CreditCard}
          color="purple"
        />
        <StatCard
          title="Inventory Alerts"
          value={(metrics?.low_stock_count || 0) + (metrics?.expiring_soon_batch_count || 0)}
          subtitle={`${metrics?.low_stock_count || 0} Low Stock • ${
            metrics?.expiring_soon_batch_count || 0
          } Expiring`}
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Recent Sales Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-800">Recent Completed Sales</h3>
          </div>
          <a
            href="/sales/history"
            className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            View All Sales →
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="pb-2.5">Sale Number</th>
                <th className="pb-2.5">Date & Time</th>
                <th className="pb-2.5">Cashier</th>
                <th className="pb-2.5">Customer</th>
                <th className="pb-2.5">Payment</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2.5 font-bold text-slate-900">{sale.sale_number}</td>
                  <td className="py-2.5 text-slate-500">{formatDateTime(sale.sale_date)}</td>
                  <td className="py-2.5">{sale.cashier_name || 'Staff'}</td>
                  <td className="py-2.5">{sale.customer_name || 'Walk-in'}</td>
                  <td className="py-2.5">{sale.payment_method}</td>
                  <td className="py-2.5">
                    <Badge variant={sale.payment_status === 'PAID' ? 'success' : 'warning'}>
                      {sale.payment_status}
                    </Badge>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(sale.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
