import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { inventoryApi, medicinesApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';
import { EmptyState } from '../../components/EmptyState';
import { Badge } from '../../components/Badge';
import { Boxes, PlusCircle, Search, Calendar, AlertTriangle } from 'lucide-react';

export const BatchesPage = () => {
  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [selectedMed, setSelectedMed] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMedicines();
    loadBatches();
  }, [selectedMed]);

  const loadMedicines = async () => {
    try {
      const res = await medicinesApi.list();
      setMedicines(res.data);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    }
  };

  const loadBatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedMed) params.medicine_id = selectedMed;
      const res = await inventoryApi.batches(params);
      setBatches(res.data);
    } catch (err) {
      console.error('Failed to load batches:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Inventory Batches</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Active and depleted inventory batches ordered by expiration date (FEFO)
          </p>
        </div>
        <Link
          to="/stock/purchase"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Receive New Batch</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600">Filter by Medicine:</label>
        <select
          value={selectedMed}
          onChange={(e) => setSelectedMed(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Medicines</option>
          {medicines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : batches.length === 0 ? (
          <EmptyState icon={Boxes} title="No inventory batches found" description="No batch records match the selected criteria." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Cost Price</th>
                  <th className="py-3 px-4">Received</th>
                  <th className="py-3 px-4 text-right">Available</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{b.batch_number}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{b.medicine_name || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{b.supplier_name || '-'}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDate(b.purchase_date)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] ${
                          b.is_expired
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : b.is_expiring_soon
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'text-slate-800'
                        }`}
                      >
                        {formatDate(b.expiry_date)} {b.is_expired ? '(Expired)' : b.is_expiring_soon ? '(30d)' : ''}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatCurrency(b.purchase_price)}</td>
                    <td className="py-3 px-4 text-slate-500">{b.qty_received} units</td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-bold ${
                          b.qty_available === 0
                            ? 'text-slate-400'
                            : b.is_expired
                            ? 'text-red-500'
                            : 'text-emerald-700 font-extrabold'
                        }`}
                      >
                        {b.qty_available} units
                      </span>
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
