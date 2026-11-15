import React, { useState, useEffect } from 'react';
import { alertsApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { EmptyState } from '../../components/EmptyState';
import { AlertTriangle, Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const AlertsPage = () => {
  const [activeTab, setActiveTab] = useState('low-stock');
  const [lowStock, setLowStock] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [expired, setExpired] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const [lowRes, expRes, expdRes] = await Promise.all([
        alertsApi.lowStock(),
        alertsApi.expiring(),
        alertsApi.expired(),
      ]);
      setLowStock(lowRes.data);
      setExpiring(expRes.data);
      setExpired(expdRes.data);
    } catch (err) {
      console.error('Failed to load inventory alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Inventory & Expiry Alerts</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time safety monitors for low reorder levels, upcoming expiries, and quarantined batches
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('low-stock')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'low-stock'
              ? 'border-amber-500 text-amber-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span>Low Stock Reorders ({lowStock.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('expiring')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'expiring'
              ? 'border-blue-500 text-blue-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-500" />
          <span>Expiring Within 30 Days ({expiring.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('expired')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === 'expired'
              ? 'border-red-500 text-red-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-red-500" />
          <span>Expired Stock Quarantine ({expired.length})</span>
        </button>
      </div>

      {/* Alert Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activeTab === 'low-stock' ? (
          lowStock.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="All stock levels adequate"
              description="No medicines are currently at or below their reorder threshold."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Reorder Threshold</th>
                    <th className="py-3 px-4 text-right">Sellable Stock Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lowStock.map((m) => (
                    <tr key={m.id} className="hover:bg-amber-50/30 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{m.name}</td>
                      <td className="py-3 px-4">{m.category_name || '-'}</td>
                      <td className="py-3 px-4">{formatCurrency(m.selling_price)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-600">{m.reorder_level} units</td>
                      <td className="py-3 px-4 text-right font-extrabold text-amber-700">
                        {m.sellable_quantity} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'expiring' ? (
          expiring.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No upcoming expiries"
              description="No inventory batches are scheduled to expire within the next 30 days."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Medicine</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Expiration Date</th>
                    <th className="py-3 px-4 text-right">Units at Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {expiring.map((b) => (
                    <tr key={b.id} className="hover:bg-blue-50/30 transition">
                      <td className="py-3 px-4 font-bold text-slate-900">{b.batch_number}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{b.medicine_name}</td>
                      <td className="py-3 px-4 text-slate-500">{b.supplier_name}</td>
                      <td className="py-3 px-4 font-bold text-blue-700">{formatDate(b.expiry_date)}</td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{b.qty_available} units</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : expired.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Zero expired inventory"
            description="No expired batches with stock units remain in the pharmacy."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Expired On</th>
                  <th className="py-3 px-4 text-right">Units to Quarantine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expired.map((b) => (
                  <tr key={b.id} className="hover:bg-red-50/30 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{b.batch_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{b.medicine_name}</td>
                    <td className="py-3 px-4 text-slate-500">{b.supplier_name}</td>
                    <td className="py-3 px-4 font-bold text-red-600">{formatDate(b.expiry_date)}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-red-700">
                      {b.qty_available} units
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
