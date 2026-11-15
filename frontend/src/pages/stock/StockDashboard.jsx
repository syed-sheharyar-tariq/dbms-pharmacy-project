import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardsApi } from '../../api/client';
import { StatCard } from '../../components/StatCard';
import { Boxes, PlusCircle, AlertTriangle, Pill, Clock } from 'lucide-react';

export const StockDashboard = () => {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStockMetrics();
  }, []);

  const loadStockMetrics = async () => {
    setLoading(true);
    try {
      const res = await dashboardsApi.stock();
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load stock dashboard:', err);
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
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Stock Handler Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Inventory levels, receiving, and expiry tracking</p>
        </div>
        <Link
          to="/stock/purchase"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Receive New Batch</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Medicines"
          value={metrics?.total_active_medicines || 0}
          subtitle="Registered catalog items"
          icon={Pill}
          color="blue"
        />
        <StatCard
          title="Sellable Units"
          value={metrics?.sellable_stock_units || 0}
          subtitle="Available unexpired inventory"
          icon={Boxes}
          color="emerald"
        />
        <StatCard
          title="Low Stock Items"
          value={metrics?.low_stock_medicines_count || 0}
          subtitle="Items at or below reorder level"
          icon={AlertTriangle}
          color="amber"
        />
        <StatCard
          title="Expiring Batches (30d)"
          value={metrics?.expiring_batches_count || 0}
          subtitle={`${metrics?.expired_batches_count || 0} already expired`}
          icon={Clock}
          color="red"
        />
      </div>
    </div>
  );
};
