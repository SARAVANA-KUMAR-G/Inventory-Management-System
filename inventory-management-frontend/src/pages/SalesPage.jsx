import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  RotateCcw,
  Printer,
  FileText,
  Calendar,
  CreditCard,
  Banknote,
  QrCode,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import apiClient from '../services/api/client';
import { Card, Badge, Modal } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

export function SalesPage() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0 });

  // Filters
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  // Selected Sale Details & Return Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnInputs, setReturnInputs] = useState({});
  const [returnReason, setReturnReason] = useState('Customer Changed Mind');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSales = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/sales', {
        params: {
          page,
          pageSize: 20,
          invoiceNumber,
          paymentMethod,
          fromDate,
          toDate
        }
      });
      if (res.success) {
        setSales(res.data);
        setMeta(res.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, [page, invoiceNumber, paymentMethod, fromDate, toDate]);

  const handleOpenDetail = async (saleId) => {
    try {
      const res = await apiClient.get(`/sales/${saleId}`);
      if (res.success) {
        setSelectedSale(res.data);
        setShowDetailModal(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load sale details');
    }
  };

  const handleOpenReturn = async (saleId) => {
    try {
      const res = await apiClient.get(`/sales/${saleId}`);
      if (res.success) {
        setSelectedSale(res.data);
        const initial = {};
        res.data.items.forEach((i) => {
          initial[i.id] = 0;
        });
        setReturnInputs(initial);
        setReturnReason('Customer Changed Mind');
        setShowReturnModal(true);
      }
    } catch (err) {
      alert(err.message || 'Failed to load sale for return');
    }
  };

  const handleConfirmReturn = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSale) return;

    const items = Object.entries(returnInputs)
      .map(([saleItemId, qty]) => ({ saleItemId, quantity: Number(qty) }))
      .filter((r) => r.quantity > 0);

    if (items.length === 0) {
      alert('Please specify a return quantity greater than 0 for at least one item');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post(`/sales/${selectedSale.id}/returns`, {
        items,
        reason: returnReason
      });

      if (res.success) {
        setShowReturnModal(false);
        loadSales();
        alert(
          `Return processed successfully! Total refund due: $${Number(res.data?.totalRefundAmount || 0).toFixed(
            2
          )}. Inventory stock has been restored.`
        );
      }
    } catch (err) {
      alert(err.message || 'Return failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalReturnQty = Object.values(returnInputs).reduce((sum, q) => sum + (Number(q) || 0), 0);
  const totalRefundAmount = selectedSale
    ? selectedSale.items.reduce((sum, item) => {
        const qty = Number(returnInputs[item.id]) || 0;
        const lineTotal = Number(item.lineTotal || 0);
        const originalQty = Number(item.quantity || 1);
        return sum + (lineTotal / originalQty) * qty;
      }, 0)
    : 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED': return <Badge variant="success">Completed</Badge>;
      case 'PARTIALLY_RETURNED': return <Badge variant="warning">Partially Returned</Badge>;
      case 'RETURNED': return <Badge variant="danger">Fully Returned</Badge>;
      case 'CANCELLED': return <Badge variant="default">Cancelled</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Orders & History</h1>
          <p className="text-sm text-slate-700 font-medium">Review past transactions, reprint customer invoices, and process returns</p>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by invoice number (e.g. INV-2026)..."
            value={invoiceNumber}
            onChange={(e) => { setInvoiceNumber(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={paymentMethod}
          onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
          className="w-full md:w-44 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
        >
          <option value="">All Payments</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="UPI">UPI</option>
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
          className="w-full md:w-40 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
        />

        <input
          type="date"
          value={toDate}
          onChange={(e) => { setToDate(e.target.value); setPage(1); }}
          className="w-full md:w-40 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
        />
      </Card>

      {/* Sales Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-600 font-medium">Loading sales records...</td>
                </tr>
              ) : sales.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-600 font-medium">No sales records found</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-800">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs font-mono font-medium">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {sale.customerName}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-slate-800">
                      {sale.paymentMethod}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-950">
                      ${sale.grandTotal.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(sale.status)}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 font-medium">
                      {sale.cashierName}
                    </td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(sale.id)}
                        className="text-xs font-semibold text-slate-800"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </Button>

                      {sale.status !== 'RETURNED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReturn(sale.id)}
                          className="text-xs text-rose-700 font-bold hover:bg-rose-50"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Return
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
          <span>Showing {sales.length} of {meta.totalItems} transactions</span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="font-semibold"
            >
              Previous
            </Button>
            <span className="font-bold text-slate-900">Page {page} of {meta.totalPages || 1}</span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage(p => p + 1)}
              className="font-semibold"
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* SALE DETAILS MODAL */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Invoice: ${selectedSale?.invoiceNumber || ''}`}
        maxWidth="max-w-xl"
      >
        {selectedSale && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-600 font-bold block">Customer:</span>
                <span className="font-bold text-slate-950">{selectedSale.customer?.name || 'Walk-in'}</span>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">Date:</span>
                <span className="font-semibold text-slate-900">{new Date(selectedSale.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">Payment Method:</span>
                <span className="font-bold text-slate-900">{selectedSale.paymentMethod}</span>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">Status:</span>
                {getStatusBadge(selectedSale.status)}
              </div>
            </div>

            <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 p-2.5 bg-slate-100 font-bold text-slate-800">
                <span className="col-span-2">Item</span>
                <span className="text-center">Qty</span>
                <span className="text-right">Total</span>
              </div>
              {selectedSale.items.map((it) => (
                <div key={it.id} className="grid grid-cols-4 p-2.5 items-center">
                  <div className="col-span-2">
                    <p className="font-bold text-slate-950">{it.productName}</p>
                    <span className="text-[10px] text-slate-600 font-mono font-semibold">${it.unitPrice.toFixed(2)} / {it.unit}</span>
                  </div>
                  <span className="text-center font-bold text-slate-900">{it.quantity}</span>
                  <span className="text-right font-mono font-bold text-slate-950">${it.lineTotal.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 font-mono text-right font-semibold text-slate-800 border border-slate-200">
              <div>Subtotal: ${selectedSale.subtotal.toFixed(2)}</div>
              {selectedSale.discountAmount > 0 && <div className="text-emerald-800 font-bold">Discount: -${selectedSale.discountAmount.toFixed(2)}</div>}
              <div>Tax: ${selectedSale.taxAmount.toFixed(2)}</div>
              <div className="text-sm font-black text-slate-950 pt-1 border-t border-slate-300">
                Grand Total: ${selectedSale.grandTotal.toFixed(2)}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-1" />
                Print Invoice
              </Button>
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* SALE RETURN MODAL */}
      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title={`Process Customer Return — ${selectedSale?.invoiceNumber || ''}`}
        maxWidth="max-w-2xl"
      >
        {selectedSale && (
          <form onSubmit={handleConfirmReturn} className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-600 font-bold block">Invoice:</span>
                <span className="font-bold text-emerald-800 font-mono text-sm">{selectedSale.invoiceNumber}</span>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">Sale Date:</span>
                <span className="font-semibold text-slate-900">{new Date(selectedSale.createdAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-600 font-bold block">Original Total:</span>
                <span className="font-bold text-slate-900 font-mono text-sm">${selectedSale.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Select Items to Return *
              </label>
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                <div className="grid grid-cols-12 p-2.5 bg-slate-100 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  <span className="col-span-5">Item</span>
                  <span className="col-span-2 text-center">Purchased</span>
                  <span className="col-span-2 text-center">Returnable</span>
                  <span className="col-span-3 text-right">Return Qty</span>
                </div>
                {selectedSale.items.map((it) => {
                  const returnable = it.returnableQuantity !== undefined ? it.returnableQuantity : it.quantity;
                  const currentInput = returnInputs[it.id] ?? 0;
                  const isFullyReturned = returnable <= 0;

                  return (
                    <div key={it.id} className="grid grid-cols-12 p-3 items-center hover:bg-slate-50/70 transition-colors">
                      <div className="col-span-5 pr-2">
                        <p className="font-bold text-slate-900 text-sm leading-tight">{it.productName}</p>
                        <span className="text-[10px] text-slate-600 font-mono font-semibold">
                          ${it.unitPrice.toFixed(2)} / {it.unit} (SKU: {it.productSku})
                        </span>
                        {it.returnedQuantity > 0 && (
                          <span className="block text-[10px] text-amber-700 font-bold">
                            Previously returned: {it.returnedQuantity} {it.unit}
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-center font-bold text-slate-800 font-mono">
                        {it.quantity} {it.unit}
                      </div>
                      <div className="col-span-2 text-center font-bold font-mono">
                        {isFullyReturned ? (
                          <span className="text-rose-700 text-[11px]">0 (Fully Returned)</span>
                        ) : (
                          <span className="text-emerald-700">{returnable} {it.unit}</span>
                        )}
                      </div>
                      <div className="col-span-3 text-right">
                        {isFullyReturned ? (
                          <span className="text-slate-400 font-semibold italic text-xs">No items left</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={returnable}
                              step="1"
                              value={currentInput}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(returnable, Number(e.target.value) || 0));
                                setReturnInputs({ ...returnInputs, [it.id]: val });
                              }}
                              className="w-16 px-2 py-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                            />
                            <button
                              type="button"
                              onClick={() => setReturnInputs({ ...returnInputs, [it.id]: returnable })}
                              className="text-[10px] font-bold text-indigo-600 hover:underline px-1 py-0.5"
                              title="Return max returnable units"
                            >
                              Max
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Return Reason *
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              >
                <option value="Customer Changed Mind">Customer Changed Mind</option>
                <option value="Defective / Damaged Item">Defective / Damaged Item</option>
                <option value="Incorrect Item / Size">Incorrect Item / Size</option>
                <option value="Expired Stock">Expired Stock</option>
                <option value="Billing / Quantity Error">Billing / Quantity Error</option>
                <option value="Other">Other Reason</option>
              </select>
            </div>

            {/* Refund Calculation Summary Box */}
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-900 block">Total Units Being Returned:</span>
                <span className="text-lg font-black font-mono text-emerald-950">{totalReturnQty} item(s)</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-900 block">Total Refund Due Customer:</span>
                <span className="text-xl font-black font-mono text-emerald-950">${totalRefundAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button variant="secondary" type="button" onClick={() => setShowReturnModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={totalReturnQty <= 0}
                loading={isSubmitting}
                className="font-bold bg-rose-700 hover:bg-rose-800 text-white"
              >
                Confirm Return & Restore Stock
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
