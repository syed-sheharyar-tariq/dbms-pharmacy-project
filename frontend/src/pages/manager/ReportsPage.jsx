import React, { useState, useEffect } from 'react';
import { reportsApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { StatCard } from '../../components/StatCard';
import { BarChart3, Boxes, CreditCard, Calendar, Filter } from 'lucide-react';

export const ReportsPage = () => {
  const [activeReport, setActiveReport] = useState('sales');

  // Date filters for sales report
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const [salesData, setSalesData] = useState(null);
  const [inventoryData, setInventoryData] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeReport === 'sales') loadSalesReport();
    if (activeReport === 'inventory') loadInventoryReport();
    if (activeReport === 'credit') loadCreditReport();
  }, [activeReport]);

  const loadSalesReport = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.sales({ start_date: startDate, end_date: endDate });
      setSalesData(res.data);
    } catch (err) {
      console.error('Failed to load sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadInventoryReport = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.inventory();
      setInventoryData(res.data);
    } catch (err) {
      console.error('Failed to load inventory report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCreditReport = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.credit();
      setCreditData(res.data);
    } catch (err) {
      console.error('Failed to load credit report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight">Business Intelligence & Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Audited sales revenue, inventory valuation, and customer credit ledger
        </p>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveReport('sales')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeReport === 'sales'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Sales & Revenue Report</span>
        </button>
        <button
          onClick={() => setActiveReport('inventory')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeReport === 'inventory'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Stock Valuation & Expiry Audit</span>
        </button>
        <button
          onClick={() => setActiveReport('credit')}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeReport === 'credit'
              ? 'border-emerald-600 text-emerald-800 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Customer Credit Balances</span>
        </button>
      </div>

      {/* SALES REPORT VIEW */}
      {activeReport === 'sales' && (
        <div className="space-y-6">
          {/* Date Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>
            <button
              onClick={loadSalesReport}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition"
            >
              Filter
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : salesData && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Gross Revenue"
                  value={formatCurrency(salesData.gross_sales_amount)}
                  subtitle={`${salesData.total_transactions} total checkouts`}
                  icon={BarChart3}
                  color="emerald"
                />
                <StatCard
                  title="Collected (Paid)"
                  value={formatCurrency(salesData.paid_sales_amount)}
                  subtitle="Cash checkouts & settled credit"
                  icon={BarChart3}
                  color="blue"
                />
                <StatCard
                  title="Pending Receivables"
                  value={formatCurrency(salesData.pending_credit_amount)}
                  subtitle="Outstanding customer credit"
                  icon={CreditCard}
                  color="amber"
                />
              </div>

              {/* Daily Breakdown Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  Daily Sales Breakdown
                </h3>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Transactions</th>
                      <th className="py-2.5 px-3">Paid Revenue</th>
                      <th className="py-2.5 px-3">Pending Credit</th>
                      <th className="py-2.5 px-3 text-right">Daily Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {salesData.daily_summaries.map((d) => (
                      <tr key={d.sale_date} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{d.sale_date}</td>
                        <td className="py-2.5 px-3 text-slate-500">{d.sales_count} sales</td>
                        <td className="py-2.5 px-3 text-emerald-700 font-medium">
                          {formatCurrency(d.paid_sales_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-amber-700 font-medium">
                          {formatCurrency(d.pending_credit_amount)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(d.total_sales_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* INVENTORY REPORT VIEW */}
      {activeReport === 'inventory' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : inventoryData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Catalog Medicines"
                  value={inventoryData.total_medicines}
                  subtitle="Active and archived pharmaceutical items"
                  icon={Boxes}
                  color="blue"
                />
                <StatCard
                  title="Sellable Stock"
                  value={`${inventoryData.total_sellable_units} units`}
                  subtitle="Available unexpired inventory"
                  icon={Boxes}
                  color="emerald"
                />
                <StatCard
                  title="Low Stock Items"
                  value={inventoryData.low_stock_count}
                  subtitle="Medicines needing purchase order"
                  icon={Boxes}
                  color="amber"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-3 px-4">Medicine</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Selling Price</th>
                      <th className="py-3 px-4">Reorder Level</th>
                      <th className="py-3 px-4">Sellable Units</th>
                      <th className="py-3 px-4">Expired Units</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {inventoryData.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{item.medicine_name}</td>
                        <td className="py-3 px-4 text-slate-500">{item.category_name}</td>
                        <td className="py-3 px-4">{formatCurrency(item.selling_price)}</td>
                        <td className="py-3 px-4">{item.reorder_level} units</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.sellable_stock} units</td>
                        <td className="py-3 px-4 text-red-500 font-semibold">
                          {item.expired_stock > 0 ? `${item.expired_stock} units` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              item.is_low_stock
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.is_low_stock ? 'Low Stock' : 'Adequate'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* CREDIT REPORT VIEW */}
      {activeReport === 'credit' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : creditData && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  title="Outstanding Balance"
                  value={formatCurrency(creditData.total_outstanding_credit)}
                  subtitle={`${creditData.pending_customers_count} accounts with dues`}
                  icon={CreditCard}
                  color="amber"
                />
                <StatCard
                  title="Historically Settled"
                  value={formatCurrency(creditData.total_settled_credit)}
                  subtitle="Recovered customer receivables"
                  icon={CreditCard}
                  color="emerald"
                />
                <StatCard
                  title="Credit Customers"
                  value={creditData.customers.length}
                  subtitle="Registered store credit accounts"
                  icon={CreditCard}
                  color="blue"
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Phone</th>
                      <th className="py-3 px-4">Pending Sales</th>
                      <th className="py-3 px-4">Outstanding Due</th>
                      <th className="py-3 px-4 text-right">Settled Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {creditData.customers.map((c) => (
                      <tr key={c.customer_id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-bold text-slate-900">{c.customer_name}</td>
                        <td className="py-3 px-4 text-slate-500">{c.customer_phone || '-'}</td>
                        <td className="py-3 px-4">{c.pending_sales_count} sales</td>
                        <td className="py-3 px-4 font-bold text-amber-700">
                          {formatCurrency(c.total_pending_amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-700">
                          {formatCurrency(c.total_settled_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
