import React from 'react';
import { Modal } from '../../components/Modal';
import { formatCurrency } from '../../utils/currency';
import { formatDateTime } from '../../utils/date';
import { Printer, CheckCircle } from 'lucide-react';

export const ReceiptModal = ({ isOpen, onClose, receiptData }) => {
  if (!receiptData) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sale Completed - Customer Receipt" maxWidth="max-w-md">
      <div className="flex flex-col items-center">
        {/* Success Banner */}
        <div className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-50 text-emerald-700 rounded-xl mb-4 text-xs font-semibold">
          <CheckCircle className="w-4 h-4" />
          <span>Checkout Successful!</span>
        </div>

        {/* Receipt Container for on-screen view and @media print */}
        <div
          id="thermal-receipt"
          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 font-mono text-xs text-slate-800 space-y-3"
        >
          {/* Pharmacy Header */}
          <div className="text-center border-b border-dashed border-slate-300 pb-3">
            <h4 className="font-bold text-sm tracking-wider uppercase">Central Pharmacy & Healthcare</h4>
            <p className="text-[10px] text-slate-500">Plot 14-B, Medical Plaza, Karachi</p>
            <p className="text-[10px] text-slate-500">Tel: +92-21-34567890</p>
          </div>

          {/* Transaction Metadata */}
          <div className="text-[11px] space-y-1 border-b border-dashed border-slate-300 pb-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Sale #:</span>
              <span className="font-semibold">{receiptData.sale_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date:</span>
              <span>{formatDateTime(receiptData.sale_date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cashier:</span>
              <span>{receiptData.cashier_name}</span>
            </div>
            {receiptData.customer_name && (
              <div className="flex justify-between">
                <span className="text-slate-500">Customer:</span>
                <span className="font-medium">{receiptData.customer_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Payment:</span>
              <span className="font-bold">
                {receiptData.payment_method} ({receiptData.payment_status})
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase mb-1">
              <span>Item / Batch</span>
              <span className="text-right">Qty × Price</span>
              <span className="text-right">Total</span>
            </div>
            <div className="space-y-1.5">
              {receiptData.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] items-start">
                  <div className="max-w-[150px]">
                    <p className="font-semibold truncate">{item.medicine_name || 'Medicine'}</p>
                    <p className="text-[9px] text-slate-400">Batch: {item.batch_number || 'N/A'}</p>
                  </div>
                  <div className="text-right text-slate-600">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </div>
                  <div className="text-right font-semibold">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-center text-sm font-bold pt-1">
            <span>TOTAL AMOUNT:</span>
            <span className="text-emerald-700 font-extrabold">
              {formatCurrency(receiptData.total_amount)}
            </span>
          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
            <p>Thank you for choosing Central Pharmacy!</p>
            <p>Medicines once sold cannot be returned without original receipt.</p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="w-full flex gap-3 mt-5">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
