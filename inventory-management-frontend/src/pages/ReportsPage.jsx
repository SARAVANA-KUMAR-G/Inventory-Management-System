import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  History,
  Receipt,
  Filter,
  RefreshCw
} from 'lucide-react';
import apiClient, { getAccessToken, getApiBaseUrl } from '../services/api/client';
import { Button } from '../components/ui/Button';

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'movement', 'sales'
  const [loading, setLoading] = useState(false);
  const [stockReport, setStockReport] = useState([]);
  const [movementReport, setMovementReport] = useState([]);
  const [salesReport, setSalesReport] = useState({ summary: {}, items: [] });

  // Filters
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  const loadActiveReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'stock') {
        const res = await apiClient.get('/reports/stock', {
          params: { stockStatus: stockStatus || undefined }
        });
        if (res.success && res.data) setStockReport(res.data);
      } else if (activeTab === 'movement') {
        const res = await apiClient.get('/reports/movement', {
          params: { fromDate: fromDate || undefined, toDate: toDate || undefined }
        });
        if (res.success && res.data) setMovementReport(res.data);
      } else if (activeTab === 'sales') {
        const res = await apiClient.get('/reports/sales', {
          params: { fromDate: fromDate || undefined, toDate: toDate || undefined }
        });
        if (res.success && res.data) setSalesReport(res.data);
      }
    } catch (err) {
      console.error('Failed to load report', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveReport();
  }, [activeTab, fromDate, toDate, stockStatus]);

  const handleExport = async (type) => {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);
      if (stockStatus && type === 'stock') params.append('stockStatus', stockStatus);

      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/reports/${type}/export?${params.toString()}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) throw new Error('Export download failed');

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(err.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Operational Reports & Analytics
          </h1>
          <p className="text-sm text-slate-700 font-medium mt-1">
            Exportable inventory, stock ledger movements, and sales performance summaries.
          </p>
        </div>

        <Button
          onClick={() => handleExport(activeTab)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white self-start sm:self-auto font-bold"
        >
          <Download className="w-4 h-4" />
          Export CSV ({activeTab.toUpperCase()})
        </Button>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('stock')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'stock'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-700 hover:text-slate-950'
          }`}
        >
          <Layers className="w-4 h-4" />
          Inventory Status
        </button>
        <button
          onClick={() => setActiveTab('movement')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'movement'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-700 hover:text-slate-950'
          }`}
        >
          <History className="w-4 h-4" />
          Stock Movement Ledger
        </button>
        <button
          onClick={() => setActiveTab('sales')}
          className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'sales'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-700 hover:text-slate-950'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Sales Performance
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center gap-3">
        {activeTab === 'stock' && (
          <div className="w-48">
            <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
              Stock Status
            </label>
            <select
              value={stockStatus}
              onChange={(e) => setStockStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Stock Levels</option>
              <option value="IN_STOCK">In Stock</option>
              <option value="LOW_STOCK">Low Stock</option>
              <option value="OUT_OF_STOCK">Out of Stock</option>
            </select>
          </div>
        )}

        {(activeTab === 'movement' || activeTab === 'sales') && (
          <>
            <div>
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={loadActiveReport}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* TAB 1: INVENTORY STATUS REPORT */}
      {activeTab === 'stock' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Reorder Level</th>
                  <th className="py-3 px-4 text-right">Unit Cost</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Cost Valuation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockReport.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">{r.sku}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{r.name}</td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">{r.category}</td>
                    <td className="py-3 px-4 text-right font-bold font-mono text-slate-950">
                      {r.currentStock} {r.unit}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">{r.reorderLevel}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">${r.costPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">${r.sellingPrice.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                      ${r.totalCostValue.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          r.status === 'OUT_OF_STOCK'
                            ? 'bg-rose-50 text-rose-800 border border-rose-300'
                            : r.status === 'LOW_STOCK'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK MOVEMENT LEDGER REPORT */}
      {activeTab === 'movement' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-800">
              <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Qty Change</th>
                  <th className="py-3 px-4 text-right">Balance After</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movementReport.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 text-center text-slate-600 font-medium text-xs">
                      No stock movement records for the selected period.
                    </td>
                  </tr>
                ) : (
                  movementReport.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 text-xs font-mono text-slate-700 font-medium whitespace-nowrap">
                        {new Date(m.date).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">{m.sku}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{m.productName}</td>
                      <td className="py-3 px-4 text-xs font-bold text-slate-800">{m.transactionType}</td>
                      <td
                        className={`py-3 px-4 text-right font-bold font-mono ${
                          m.quantity > 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {m.balanceAfter}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold text-slate-800">{m.userName}</td>
                      <td className="py-3 px-4 text-xs text-slate-700 font-medium max-w-xs truncate">
                        {m.reason || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SALES SUMMARY REPORT */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Sales Summary KPI Cards */}
          {salesReport.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-700 font-bold uppercase">Total Sales Count</span>
                <span className="text-2xl font-black text-slate-900 font-mono block mt-1">
                  {salesReport.summary.totalSalesCount || 0}
                </span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-700 font-bold uppercase">Total Revenue</span>
                <span className="text-2xl font-black text-emerald-700 font-mono block mt-1">
                  ${(salesReport.summary.totalRevenue || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-700 font-bold uppercase">Total COGS</span>
                <span className="text-2xl font-black text-slate-800 font-mono block mt-1">
                  ${(salesReport.summary.totalCOGS || 0).toFixed(2)}
                </span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <span className="text-xs text-slate-700 font-bold uppercase">Gross Profit</span>
                <span className="text-2xl font-black text-indigo-700 font-mono block mt-1">
                  ${(salesReport.summary.grossProfit || 0).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Sales Detailed Table */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-800">
                <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Cashier</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Items</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Discount</th>
                    <th className="py-3 px-4 text-right">Tax</th>
                    <th className="py-3 px-4 text-right">Grand Total</th>
                    <th className="py-3 px-4 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {!salesReport.items || salesReport.items.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="py-10 text-center text-slate-600 font-medium text-xs">
                        No sales found for the specified date range.
                      </td>
                    </tr>
                  ) : (
                    salesReport.items.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-4 text-xs font-mono text-slate-700 font-medium whitespace-nowrap">
                          {new Date(s.date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-800">{s.cashierName}</td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                            {s.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">{s.itemCount}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">${s.subtotal.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                          {s.discount > 0 ? `-$${s.discount.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                          {s.tax > 0 ? `+$${s.tax.toFixed(2)}` : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-950">
                          ${s.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          ${s.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
