import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowDownToLine, CheckCircle2, AlertCircle, RefreshCw, Package } from 'lucide-react';
import apiClient from '../services/api/client';
import { Card } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function StockInPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialProductId = location.state?.productId || searchParams.get('productId') || '';

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
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

  const loadRecentStockIns = async () => {
    try {
      const res = await apiClient.get('/inventory/transactions?transactionType=STOCK_IN&pageSize=8');
      if (res.success && res.data) {
        setRecentTransactions(res.data);
      }
    } catch (err) {
      console.error('Failed to load stock in history', err);
    }
  };

  useEffect(() => {
    loadProducts();
    loadRecentStockIns();
  }, []);

  const fetchLastSupplier = async (productId) => {
    try {
      const res = await apiClient.get(`/inventory/last-supplier/${productId}`);
      if (res.success && res.data?.supplier) {
        setSupplier(res.data.supplier);
      }
    } catch (err) {
      console.error('Failed to fetch last supplier', err);
    }
  };

  const handleProductChange = async (productId) => {
    setSelectedProductId(productId);
    if (!productId) return;
    const prod = products.find((p) => p.id === productId);
    if (prod && prod.costPrice) {
      setUnitCost(String(prod.costPrice));
    }
    await fetchLastSupplier(productId);
  };

  // Pre-fill when navigating with an initial product ID
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      handleProductChange(initialProductId);
    }
  }, [initialProductId, products]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    const qty = Number(quantity);
    if (!selectedProductId) {
      setStatusMessage({ type: 'error', text: 'Please select a product.' });
      return;
    }
    if (!qty || qty <= 0) {
      setStatusMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/inventory/stock-in', {
        productId: selectedProductId,
        quantity: qty,
        unitCost: unitCost ? Number(unitCost) : undefined,
        supplier: supplier.trim() || undefined,
        notes: notes.trim() || undefined
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Successfully added ${qty} units to '${selectedProduct?.name}'. New stock: ${res.data.product.currentStock}.`
        });
        setQuantity('');
        setNotes('');
        loadProducts();
        loadRecentStockIns();
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to record stock in.'
      });
    } finally {
      setLoading(false);
    }
  };

  const calculatedNewStock = selectedProduct
    ? Number(selectedProduct.currentStock) + (Number(quantity) || 0)
    : null;

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ArrowDownToLine className="w-7 h-7 text-emerald-600" />
          Stock In / Receiving
        </h1>
        <p className="text-sm font-medium text-slate-700 mt-1">
          Receive new inventory from suppliers or restocks to increase available balance.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Stock In Details</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Product *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors"
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
                  Quantity to Add *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors placeholder:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Unit Cost Price ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="e.g. 12.50"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Supplier / Source Name
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. Acme Wholesale Ltd."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Notes / Reference
              </label>
              <textarea
                rows="2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Batch #401, invoice #8821"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-colors placeholder:text-slate-500"
              />
            </div>

            <Button type="submit" loading={loading} className="w-full py-2.5 font-bold">
              Confirm & Record Stock In
            </Button>
          </form>
        </div>

        {/* Live Calculation Preview Card */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-950 to-slate-900 text-white rounded-2xl p-6 border border-slate-800 shadow-md">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              Stock Impact Preview
            </h3>

            {selectedProduct ? (
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-slate-300 block">Selected Product</span>
                  <span className="font-black text-lg text-white">{selectedProduct.name}</span>
                  <span className="text-xs font-mono font-bold text-emerald-400 block">SKU: {selectedProduct.sku}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">Current Stock</span>
                    <span className="text-xl font-black text-white">
                      {selectedProduct.currentStock} {selectedProduct.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-300 block">Adding</span>
                    <span className="text-xl font-black text-emerald-400">
                      +{Number(quantity) || 0}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-300 block">Projected Balance</span>
                  <span className="text-2xl font-black text-emerald-300 font-mono">
                    {calculatedNewStock} {selectedProduct.unit}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-slate-300 py-6 text-center">
                Select a product from the form to view real-time balance calculations.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Stock In Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Recent Stock In Entries</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-right">Qty Added</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-slate-600 font-semibold text-xs">
                    No stock-in transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono font-medium text-slate-600 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">{tx.productName}</td>
                    <td className="py-3 px-4 text-xs font-mono font-semibold text-slate-700">{tx.productSku}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-700 font-mono">
                      +{tx.quantity} {tx.unit}
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
