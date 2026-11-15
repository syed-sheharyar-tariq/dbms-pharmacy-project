import React, { useState, useEffect, useRef } from 'react';
import { medicinesApi, customersApi, salesApi } from '../../api/client';
import { formatCurrency } from '../../utils/currency';
import { ReceiptModal } from './ReceiptModal';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Banknote,
  User,
  Pill,
} from 'lucide-react';

export const CashierPOSPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Load initial active medicines and customers
  useEffect(() => {
    loadMedicines();
    loadCustomers();
  }, []);

  const loadMedicines = async (query = '') => {
    setLoadingSearch(true);
    try {
      const res = await medicinesApi.list({ search: query || undefined });
      setMedicines(res.data);
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await customersApi.list();
      setCustomers(res.data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  // Debounced search handler
  const searchTimeout = useRef(null);
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadMedicines(val);
    }, 300);
  };

  // Cart operations
  const addToCart = (med) => {
    setErrorMessage('');
    if (med.sellable_quantity <= 0) {
      setErrorMessage(`Cannot add '${med.name}' - zero sellable stock available.`);
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === med.id);
      if (existing) {
        if (existing.quantity >= med.sellable_quantity) {
          setErrorMessage(`Cannot exceed available stock of ${med.sellable_quantity} for '${med.name}'.`);
          return prevCart;
        }
        return prevCart.map((item) =>
          item.id === med.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prevCart,
        {
          id: med.id,
          name: med.name,
          generic_name: med.generic_name,
          selling_price: parseFloat(med.selling_price),
          sellable_quantity: med.sellable_quantity,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (medId, delta) => {
    setErrorMessage('');
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.id === medId) {
            const newQty = item.quantity + delta;
            if (newQty > item.sellable_quantity) {
              setErrorMessage(`Cannot exceed available stock of ${item.sellable_quantity}.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (medId) => {
    setCart((prev) => prev.filter((item) => item.id !== medId));
  };

  const clearCart = () => {
    setCart([]);
    setErrorMessage('');
  };

  // Cart totals
  const cartSubtotal = cart.reduce((acc, item) => acc + item.quantity * item.selling_price, 0);

  // Submit checkout
  const handleCheckout = async () => {
    setErrorMessage('');

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Please add items to proceed.');
      return;
    }

    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      setErrorMessage('A registered customer must be selected for CREDIT sales.');
      return;
    }

    setSubmitting(true);

    // Client-generated UUID idempotency key per Blueprint Section 4.4 & 5.3
    const idempotencyKey = crypto.randomUUID();

    const payload = {
      payment_method: paymentMethod,
      customer_id: selectedCustomer || null,
      items: cart.map((item) => ({
        medicine_id: item.id,
        quantity: item.quantity,
      })),
      idempotency_key: idempotencyKey,
    };

    try {
      const res = await salesApi.create(payload);
      const createdSale = res.data;

      // Fetch official print receipt view
      const receiptRes = await salesApi.receipt(createdSale.id);
      setReceiptData(receiptRes.data);
      setShowReceipt(true);

      // Reset cart and reload live stock
      clearCart();
      setSelectedCustomer('');
      setPaymentMethod('CASH');
      loadMedicines(searchQuery);
    } catch (err) {
      console.error('Sale checkout failed:', err);
      setErrorMessage(err.message || 'Checkout failed. Please check stock availability and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Point of Sale (POS)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Atomic checkout engine with FEFO (First Expiring, First Out) batch deduction
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Register Online
          </span>
        </div>
      </div>

      {/* Main Grid: Medicine Catalog on Left, Checkout Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & Catalog (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search medicine by brand or generic name (e.g. Panadol, Paracetamol)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>

          {/* Catalog Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 min-h-[500px]">
            {loadingSearch ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : medicines.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Pill className="w-10 h-10 mb-2 stroke-[1.5]" />
                <p className="text-xs">No active medicines found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[560px] overflow-y-auto pr-1">
                {medicines.map((med) => {
                  const isOutOfStock = med.sellable_quantity <= 0;
                  return (
                    <div
                      key={med.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                        isOutOfStock
                          ? 'bg-slate-50/80 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-800 leading-snug">{med.name}</h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${
                              isOutOfStock
                                ? 'bg-red-50 text-red-600 border border-red-100'
                                : med.sellable_quantity <= med.reorder_level
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {isOutOfStock ? 'Out of Stock' : `${med.sellable_quantity} in stock`}
                          </span>
                        </div>
                        {med.generic_name && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{med.generic_name}</p>
                        )}
                        <p className="text-[10px] text-slate-400 mt-0.5">{med.category_name || 'General'}</p>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-sm font-bold text-slate-900">
                          {formatCurrency(med.selling_price)}
                        </span>
                        <button
                          onClick={() => addToCart(med)}
                          disabled={isOutOfStock}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition disabled:opacity-40 disabled:pointer-events-none shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Cart (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-800">Current Sale Cart</h3>
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-[11px] text-red-500 hover:text-red-700 font-medium transition"
              >
                Clear Cart
              </button>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Cart Items List */}
          <div className="min-h-[200px] max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <ShoppingCart className="w-8 h-8 mb-2 stroke-[1.5]" />
                <p className="text-xs">Cart is empty. Select medicines from the catalog.</p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-500">
                      {formatCurrency(item.selling_price)} each
                    </p>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="text-slate-500 hover:text-slate-800 p-0.5"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-slate-800 min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="text-slate-500 hover:text-slate-800 p-0.5"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Subtotal & Delete */}
                  <div className="text-right flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {formatCurrency(item.quantity * item.selling_price)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Payment & Customer Settings */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>CASH (Paid)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CREDIT')}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition ${
                    paymentMethod === 'CREDIT'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>CREDIT (Pending)</span>
                </button>
              </div>
            </div>

            {/* Customer Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer {paymentMethod === 'CREDIT' ? '(Required for Credit)' : '(Optional for Cash)'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 transition ${
                    paymentMethod === 'CREDIT' && !selectedCustomer
                      ? 'border-amber-400 focus:ring-amber-500/20'
                      : 'border-slate-200 focus:ring-emerald-500/20'
                  }`}
                >
                  <option value="">-- Walk-in / General Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cart Summary Totals */}
            <div className="bg-slate-50 rounded-xl p-3.5 space-y-1.5 border border-slate-200/80">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} units):</span>
                <span>{formatCurrency(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 border-t border-slate-200">
                <span>Net Total:</span>
                <span className="text-emerald-700 text-base">{formatCurrency(cartSubtotal)}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={submitting || cart.length === 0}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>
                    Complete {paymentMethod} Checkout ({formatCurrency(cartSubtotal)})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      <ReceiptModal
        isOpen={showReceipt}
        onClose={() => setShowReceipt(false)}
        receiptData={receiptData}
      />
    </div>
  );
};
