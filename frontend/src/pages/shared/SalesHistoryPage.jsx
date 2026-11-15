import React, { useState, useEffect } from 'react';
import { salesApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { ReceiptModal } from '../cashier/ReceiptModal';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { History, Printer, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export const SalesHistoryPage = () => {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 20;

  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    loadSales();
  }, [page]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await salesApi.list({ limit, offset: page * limit });
      setSales(res.data);
    } catch (err) {
      console.error('Failed to load sales history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (saleId) => {
    try {
      const res = await salesApi.receipt(saleId);
      setReceiptData(res.data);
      setShowReceipt(true);
    } catch (err) {
      alert(`Could not fetch receipt: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Sales History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit record of all cash, credit, and settled pharmacy transactions
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : sales.length === 0 ? (
          <EmptyState icon={History} title="No sales records found" description="Completed transactions will be archived here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                  <th className="py-3 px-4">Sale Number</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Items Count</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {sales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{s.sale_number}</td>
                    <td className="py-3 px-4 text-slate-500">{formatDateTime(s.sale_date)}</td>
                    <td className="py-3 px-4">{s.cashier_name || 'Staff'}</td>
                    <td className="py-3 px-4">{s.customer_name || 'Walk-in Customer'}</td>
                    <td className="py-3 px-4 font-medium">{s.payment_method}</td>
                    <td className="py-3 px-4">
                      <Badge variant={s.payment_status === 'PAID' ? 'success' : 'warning'}>
                        {s.payment_status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-slate-500">{s.items?.length || 0} batches</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(s.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handlePrintReceipt(s.id)}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Print / View Receipt"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500">
            Page {page + 1} ({sales.length} items shown)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={sales.length < limit}
              className="p-1.5 text-slate-500 hover:text-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        receiptData={receiptData}
      />
    </div>
  );
};
