import React, { useState, useEffect } from 'react';
import { creditApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { EmptyState } from '../../components/EmptyState';
import { CreditCard, CheckCircle, AlertCircle, Clock, Check } from 'lucide-react';

export const CreditManagementPage = () => {
  const [pendingCredits, setPendingCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    loadPendingCredits();
  }, []);

  const loadPendingCredits = async () => {
    setLoading(true);
    try {
      const res = await creditApi.pending();
      setPendingCredits(res.data);
    } catch (err) {
      console.error('Failed to load pending credit sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (saleId, saleNumber, amount) => {
    if (
      !window.confirm(
        `Confirm full receipt of ${formatCurrency(amount)} for credit sale ${saleNumber}?\n\nNote: Partial payments are not supported. This records full settlement.`
      )
    ) {
      return;
    }

    setSettlingId(saleId);
    setStatusMessage({ text: '', type: '' });

    try {
      const res = await creditApi.settle(saleId);
      setStatusMessage({ text: res.data.message || 'Settlement completed!', type: 'success' });
      loadPendingCredits();
    } catch (err) {
      console.error('Settlement error:', err);
      setStatusMessage({ text: err.message || 'Settlement failed', type: 'error' });
    } finally {
      setSettlingId(null);
    }
  };

  const totalOutstanding = pendingCredits.reduce((acc, c) => acc + parseFloat(c.total_amount), 0);

  return (
    <div className="space-y-6">
      {/* Title & Total Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Credit Management & Settlement</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track outstanding credit sales and record atomic full settlements
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl px-4 py-2 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">Total Outstanding</p>
            <p className="text-base font-extrabold text-amber-900">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage.text && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Pending Credit List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : pendingCredits.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No outstanding credit sales"
            description="All credit accounts are currently settled in full."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Sale Number</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Originating Cashier</th>
                  <th className="py-3 px-4">Amount Due</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingCredits.map((item) => (
                  <tr key={item.sale_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{item.sale_number}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(item.sale_date)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.customer_name}</td>
                    <td className="py-3 px-4 text-slate-500">{item.customer_phone || '-'}</td>
                    <td className="py-3 px-4">{item.cashier_name}</td>
                    <td className="py-3 px-4 font-bold text-amber-700 text-sm">
                      {formatCurrency(item.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleSettle(item.sale_id, item.sale_number, item.total_amount)}
                        disabled={settlingId === item.sale_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition disabled:opacity-50"
                      >
                        {settlingId === item.sale_id ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Mark Fully Paid</span>
                      </button>
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
