import React, { useState, useEffect } from 'react';
import { History, Filter, RefreshCw, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import apiClient from '../services/api/client';
import { Button } from '../components/ui/Button';

export function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0 });

  // Filters
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const loadProducts = async () => {
    try {
      const res = await apiClient.get('/products?pageSize=200');
      if (res.success && res.data) setProducts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/inventory/transactions', {
        params: {
          page,
          pageSize: 20,
          productId: selectedProduct || undefined,
          transactionType: selectedType || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined
        }
      });
      if (res.success && res.data) {
        setTransactions(res.data);
        if (res.meta) setMeta(res.meta);
      }
    } catch (err) {
      console.error('Failed to load transactions ledger', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [page, selectedProduct, selectedType, fromDate, toDate]);

  const resetFilters = () => {
    setSelectedProduct('');
    setSelectedType('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-7 h-7 text-indigo-600" />
            Stock Ledger & Transactions
          </h1>
          <p className="text-sm text-slate-700 font-medium mt-1">
            Complete, immutable audit trail of every stock change across receiving, sales, and adjustments.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={loadTransactions}
          className="flex items-center gap-2 self-start sm:self-auto font-semibold"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-end gap-3">
        <div className="min-w-[180px] flex-1">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Product
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => {
              setSelectedProduct(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="w-44">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            Transaction Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Types</option>
            <option value="STOCK_IN">Stock In (Receiving)</option>
            <option value="SALE">POS Sale</option>
            <option value="ADJUSTMENT_IN">Adjustment In</option>
            <option value="ADJUSTMENT_OUT">Adjustment Out</option>
          </select>
        </div>

        <div className="w-36">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            From Date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="w-36">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
            To Date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {(selectedProduct || selectedType || fromDate || toDate) && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-700 hover:text-slate-900 font-bold py-2 px-3 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Product Name</th>
                <th className="py-3.5 px-4">SKU</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4 text-right">Quantity</th>
                <th className="py-3.5 px-4 text-right">Balance After</th>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-600 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading ledger records...</span>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-600 font-medium text-xs">
                    No transactions match the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  let badgeStyle = 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
                  if (tx.transactionType === 'STOCK_IN') {
                    badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold';
                  } else if (tx.transactionType === 'SALE') {
                    badgeStyle = 'bg-sky-50 text-sky-800 border-sky-300 font-bold';
                  } else if (tx.transactionType === 'ADJUSTMENT_IN') {
                    badgeStyle = 'bg-teal-50 text-teal-800 border-teal-300 font-bold';
                  } else if (tx.transactionType === 'ADJUSTMENT_OUT') {
                    badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
                  }

                  const isPositive = Number(tx.quantity) > 0;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-xs whitespace-nowrap text-slate-700 font-mono font-medium">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{tx.productName}</td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-700 font-semibold">{tx.productSku}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border ${badgeStyle}`}
                        >
                          {tx.transactionType}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold font-mono ${
                          isPositive ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {isPositive ? `+${tx.quantity}` : tx.quantity} {tx.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {tx.balanceAfter}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">{tx.userName}</td>
                      <td className="py-3 px-4 text-xs text-slate-700 font-medium max-w-xs truncate">
                        {tx.reason || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {meta.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-700 font-medium">
              Showing page <span className="font-bold text-slate-900">{meta.page}</span> of{' '}
              <span className="font-bold text-slate-900">{meta.totalPages}</span> ({meta.totalItems} total transactions)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-bold"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

