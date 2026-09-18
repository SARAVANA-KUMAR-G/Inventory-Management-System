import React, { useState, useEffect } from 'react';
import { ArrowUpFromLine, AlertTriangle, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import apiClient from '../services/api/client';
import { Button } from '../components/ui/Button';

export function StockOutPage() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState('ADJUSTMENT_OUT');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('Damaged');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentAdjustments, setRecentAdjustments] = useState([]);
  const [statusMessage, setStatusMessage] = useState(null);

  const loadProducts = async () => {
    try {
      const res = await apiClient.get('/products?pageSize=200&includeInactive=false');
      if (res.success && res.data) {
        setProducts(res.data);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    }
  };

  const loadRecentAdjustments = async () => {
    try {
      const res = await apiClient.get('/inventory/transactions?pageSize=10');
      if (res.success && res.data) {
        const adjustmentsOnly = res.data.filter(
          (t) => t.transactionType === 'ADJUSTMENT_IN' || t.transactionType === 'ADJUSTMENT_OUT'
        );
        setRecentAdjustments(adjustmentsOnly);
      }
    } catch (err) {
      console.error('Failed to load adjustment history', err);
    }
  };

  useEffect(() => {
    loadProducts();
    loadRecentAdjustments();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const currentStock = selectedProduct ? Number(selectedProduct.currentStock) : 0;
  const qtyNumber = Number(quantity) || 0;

  const willBeNegative = adjustType === 'ADJUSTMENT_OUT' && qtyNumber > currentStock;
  const calculatedNewStock = selectedProduct
    ? adjustType === 'ADJUSTMENT_IN'
      ? currentStock + qtyNumber
      : currentStock - qtyNumber
    : null;

  const handleTypeChange = (newType) => {
    setAdjustType(newType);
    if (newType === 'ADJUSTMENT_IN') {
      setReason('Missed Count');
    } else {
      setReason('Damaged');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!selectedProductId) {
      setStatusMessage({ type: 'error', text: 'Please select a product.' });
      return;
    }
    if (qtyNumber <= 0) {
      setStatusMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }
    if (willBeNegative) {
      setStatusMessage({
        type: 'error',
        text: `Cannot reduce ${qtyNumber} units. Only ${currentStock} units available in stock.`
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/inventory/adjustment', {
        productId: selectedProductId,
        type: adjustType,
        quantity: qtyNumber,
        reason,
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Adjustment recorded for '${selectedProduct?.name}'. New stock balance: ${res.data.product.currentStock}.`
        });
        setQuantity('');
        setNotes('');
        setReason(adjustType === 'ADJUSTMENT_IN' ? 'Missed Count' : 'Damaged');
        loadProducts();
        loadRecentAdjustments();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to record stock adjustment.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowUpFromLine className="w-6 sm:w-7 h-6 sm:h-7 text-amber-600" />
          Stock Adjustment / Waste & Returns
        </h1>
        <p className="text-xs sm:text-sm font-medium text-slate-700 mt-1">
          Record stock reductions (damaged, expired, lost) or inventory audit corrections.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-start gap-3 animate-fadeIn ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-semibold'
              : 'bg-rose-50 border border-rose-300 text-rose-900 font-semibold'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Main Adjustment Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Adjustment Details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Product *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
              >
                <option value="">Select a product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) - Current Stock: {p.currentStock} {p.unit}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Adjustment Type *
                </label>
                <select
                  value={adjustType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
                >
                  <option value="ADJUSTMENT_OUT">Stock Out (Decrease Stock)</option>
                  <option value="ADJUSTMENT_IN">Stock In (Increase Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 5"
                  required
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none transition-colors placeholder:text-slate-500 ${
                    willBeNegative
                      ? 'border-rose-400 ring-2 ring-rose-500/20 bg-rose-50/20'
                      : 'border-slate-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600'
                  }`}
                />
                {willBeNegative && (
                  <span className="text-xs text-rose-700 font-bold mt-1 block">
                    Quantity exceeds current available stock ({currentStock}).
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Reason Category *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
              >
                {adjustType === 'ADJUSTMENT_IN' ? (
                  <>
                    <option value="Missed Count">Missed Count / Found Items</option>
                    <option value="Late Arrival">Late Arrival / Delayed Inbound</option>
                    <option value="Customer Return">Customer Return / Restock</option>
                    <option value="Audit Surplus">Audit Surplus / Count Correction</option>
                    <option value="Other">Other Reason</option>
                  </>
                ) : (
                  <>
                    <option value="Damaged">Damaged Goods</option>
                    <option value="Expired">Expired Stock</option>
                    <option value="Lost">Lost / Shrinkage</option>
                    <option value="Correction">Inventory Count Correction</option>
                    <option value="Other">Other Reason</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Notes / Explanation
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Provide details (e.g. dropped during unpacking, found 2 misplaced units on shelf B)"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={willBeNegative || !selectedProductId || qtyNumber <= 0}
              loading={loading}
              className="w-full py-2.5 font-bold"
            >
              Confirm & Apply Adjustment
            </Button>
          </form>
        </div>

        {/* Live Calculation Preview Card */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl p-4 sm:p-6 border border-slate-800 shadow-md">
            <h3 className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              Stock Impact Preview
            </h3>

            {selectedProduct ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Selected Product</span>
                  <span className="font-black text-base sm:text-lg text-white">{selectedProduct.name}</span>
                  <span className="text-xs font-mono font-bold text-amber-400 block">SKU: {selectedProduct.sku}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">Current Stock</span>
                    <span className="text-lg sm:text-xl font-black text-white">
                      {currentStock} {selectedProduct.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">Adjustment</span>
                    <span
                      className={`text-lg sm:text-xl font-black ${
                        adjustType === 'ADJUSTMENT_OUT' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {adjustType === 'ADJUSTMENT_OUT' ? `-${qtyNumber}` : `+${qtyNumber}`}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 block">Projected Balance</span>
                  <span
                    className={`text-xl sm:text-2xl font-black font-mono ${
                      willBeNegative ? 'text-rose-400' : 'text-slate-100'
                    }`}
                  >
                    {calculatedNewStock} {selectedProduct.unit}
                  </span>
                  {willBeNegative && (
                    <span className="text-xs text-rose-300 font-bold block mt-1">
                      ⚠️ Negative stock forbidden
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs sm:text-sm font-medium text-slate-300 py-6 text-center">
                Select a product from the form to view real-time balance calculations.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Adjustments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Recent Adjustments Log</h2>

        {/* Mobile Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentAdjustments.length === 0 ? (
            <div className="py-8 text-center text-slate-600 font-semibold text-xs">
              No adjustments recorded yet.
            </div>
          ) : (
            recentAdjustments.map((tx) => (
              <div key={tx.id} className="py-3 px-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          tx.transactionType === 'ADJUSTMENT_IN'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {tx.transactionType === 'ADJUSTMENT_IN' ? 'IN' : 'OUT'}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 truncate">{tx.productName}</h4>
                    </div>
                    <p className="text-xs font-mono text-slate-600 font-semibold">SKU: {tx.productSku}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-black text-sm font-mono block ${
                        tx.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.unit}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">Bal: {tx.balanceAfter}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                  <span>{new Date(tx.createdAt).toLocaleDateString()} by {tx.userName}</span>
                  {tx.reason && <span className="truncate max-w-[140px] font-medium">{tx.reason}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Qty</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentAdjustments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-600 font-semibold text-xs">
                    No adjustments recorded yet.
                  </td>
                </tr>
              ) : (
                recentAdjustments.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono font-medium text-slate-600 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{tx.productName}</td>
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-700">{tx.productSku}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          tx.transactionType === 'ADJUSTMENT_IN'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {tx.transactionType}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-black font-mono ${
                        tx.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                      {tx.balanceAfter}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800">{tx.userName}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700 max-w-xs truncate">
                      {tx.reason || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
