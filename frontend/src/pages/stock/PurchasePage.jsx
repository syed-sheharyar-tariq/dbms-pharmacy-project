import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi, medicinesApi, suppliersApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { PlusCircle, CheckCircle, AlertCircle, ArrowLeft, Boxes } from 'lucide-react';

export const PurchasePage = () => {
  const navigate = useNavigate();
  const [medicines, setMedicines] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    medicine_id: '',
    supplier_id: '',
    batch_number: '',
    purchase_date: todayStr,
    expiry_date: '',
    purchase_price: '',
    qty_received: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [medsRes, supsRes] = await Promise.all([
        medicinesApi.list(),
        suppliersApi.list(),
      ]);
      setMedicines(medsRes.data);
      setSuppliers(supsRes.data);
      if (medsRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, medicine_id: medsRes.data[0].id }));
      }
      if (supsRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, supplier_id: supsRes.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to load initial purchase data:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (formData.expiry_date < formData.purchase_date) {
      setErrorMsg('Expiry date cannot be earlier than purchase date.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        medicine_id: formData.medicine_id,
        supplier_id: formData.supplier_id,
        batch_number: formData.batch_number.trim(),
        purchase_date: formData.purchase_date,
        expiry_date: formData.expiry_date,
        purchase_price: parseFloat(formData.purchase_price),
        qty_received: parseInt(formData.qty_received, 10),
      };

      await inventoryApi.purchase(payload);
      setSuccessMsg(`Batch '${payload.batch_number}' received successfully!`);
      // Reset batch-specific fields
      setFormData((prev) => ({
        ...prev,
        batch_number: '',
        expiry_date: '',
        purchase_price: '',
        qty_received: '',
      }));
    } catch (err) {
      console.error('Purchase reception error:', err);
      setErrorMsg(err.message || 'Failed to record batch purchase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Title & Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Receive Stock Batch</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log pharmaceutical shipments with batch identification and expiration dates
          </p>
        </div>
        <button
          onClick={() => navigate('/stock/batches')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>View All Batches</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reception Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Medicine *</label>
              <select
                required
                value={formData.medicine_id}
                onChange={(e) => setFormData({ ...formData, medicine_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.generic_name ? `(${m.generic_name})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Supplier / Wholesaler *</label>
              <select
                required
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Batch / Lot Number *
            </label>
            <input
              type="text"
              required
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              placeholder="e.g. BATCH-2026-X1"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-slate-400 mt-1">Must be unique per medicine.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Purchase Date *</label>
              <input
                type="date"
                required
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expiration Date *</label>
              <input
                type="date"
                required
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Purchase Unit Cost (PKR) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Quantity Received *</label>
              <input
                type="number"
                min="1"
                required
                value={formData.qty_received}
                onChange={(e) => setFormData({ ...formData, qty_received: e.target.value })}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Commit Inventory Batch</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
