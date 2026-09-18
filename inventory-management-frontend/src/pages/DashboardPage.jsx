import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  XCircle,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  Clock,
  ArrowUpRight,
  Receipt,
  Boxes,
  RefreshCw,
  Layers
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/api/client';
import { Button } from '../components/ui/Button';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [summary, setSummary] = useState(null);
  const [salesTrend, setSalesTrend] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [sumRes, trendRes, topRes] = await Promise.all([
        apiClient.get('/dashboard/summary'),
        apiClient.get('/dashboard/sales-trend').catch(() => ({ success: false, data: [] })),
        apiClient.get('/dashboard/top-products').catch(() => ({ success: false, data: [] }))
      ]);

      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      if (trendRes.success && trendRes.data) setSalesTrend(trendRes.data);
      if (topRes.success && topRes.data) setTopProducts(topRes.data);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    // Initial load with spinner
    loadDashboard(true);

    // Active real-time auto-refresh interval (every 4 seconds)
    const interval = setInterval(() => {
      loadDashboard(false);
    }, 4000);

    // Sync immediately when window/tab regains focus
    const handleFocus = () => loadDashboard(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const chartData = {
    labels: salesTrend.map((d) => d.date),
    datasets: [
      {
        label: 'Revenue ($)',
        data: salesTrend.map((d) => d.revenue),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `$${context.raw.toFixed(2)}`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: '#334155',
          font: { weight: 'bold', size: 11 },
          callback: (value) => `$${value}`
        },
        grid: { color: 'rgba(203, 213, 225, 0.6)' }
      },
      x: {
        ticks: {
          color: '#334155',
          font: { weight: 'bold', size: 11 }
        },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-7xl">
      {/* Top Header & Fast Operations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.firstName || 'User'} 👋
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-700 mt-0.5 sm:mt-1">
            Real-time operations, stock alerts, and daily sales overview.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
          <Button
            onClick={() => navigate('/pos')}
            className="flex items-center justify-center gap-1.5 sm:gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold text-xs sm:text-sm py-2 px-3"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span>New Sale (POS)</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/stock-in')}
            className="flex items-center justify-center gap-1.5 sm:gap-2 text-slate-800 font-semibold text-xs sm:text-sm py-2 px-3"
          >
            <ArrowDownToLine className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Stock In</span>
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/stock-out')}
            className="flex items-center justify-center gap-1.5 sm:gap-2 text-slate-800 font-semibold text-xs sm:text-sm py-2 px-3"
          >
            <ArrowUpFromLine className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Adjust Stock</span>
          </Button>
          {isAdmin && (
            <Button
              variant="secondary"
              onClick={() => navigate('/products')}
              className="flex items-center justify-center gap-1.5 sm:gap-2 text-slate-800 font-semibold text-xs sm:text-sm py-2 px-3"
            >
              <PlusCircle className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Products</span>
            </Button>
          )}
          <button
            onClick={() => loadDashboard(true)}
            title="Refresh metrics"
            className="col-span-2 sm:col-span-1 p-2 sm:p-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold sm:text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="sm:hidden">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Products */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Total Products
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800 shrink-0">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {summary?.totalProducts || 0}
            </span>
            <span className="text-xs font-semibold text-slate-700 block mt-0.5">Active catalog items</span>
          </div>
        </div>

        {/* Total Stock Units */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Stock Units
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <Layers className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono">
              {summary?.totalStockItems || 0}
            </span>
            <span className="text-xs font-semibold text-slate-700 block mt-0.5">Physical units in store</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Low Stock
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
              {summary?.lowStockCount || 0}
            </span>
            <span className="text-xs font-semibold text-slate-700 block mt-0.5">At or below reorder level</span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Out of Stock
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-xl sm:text-2xl font-black text-rose-700 font-mono">
              {summary?.outOfStockCount || 0}
            </span>
            <span className="text-xs font-semibold text-slate-700 block mt-0.5">Immediate restock required</span>
          </div>
        </div>

        {/* Inventory Valuation */}
        <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Inventory Value
            </span>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4">
            <span className="text-xl sm:text-2xl font-black text-emerald-700 font-mono">
              ${(summary?.totalStockValuation || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs font-semibold text-slate-700 block mt-0.5">Asset cost valuation</span>
          </div>
        </div>
      </div>

      {/* Visual Trends & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* 7-Day Revenue Trend Chart */}
        <div className="lg:col-span-2 p-4 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base">7-Day Sales Trend</h3>
              <p className="text-xs font-semibold text-slate-700">Daily store revenue performance</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-700 block">Today's Sales</span>
              <span className="text-lg sm:text-xl font-black text-emerald-700 font-mono">
                ${(summary?.todayRevenue || 0).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="h-56 sm:h-64 w-full min-w-0">
            {salesTrend.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600 font-medium text-xs">
                No recent sales data to display.
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Products */}
        <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs flex flex-col">
          <div className="mb-4">
            <h3 className="font-bold text-slate-900 text-base">Top Selling Products</h3>
            <p className="text-xs font-semibold text-slate-700">By total revenue</p>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="py-8 sm:py-12 text-center text-slate-600 font-medium text-xs">
                No product sales recorded yet.
              </div>
            ) : (
              topProducts.map((p, idx) => (
                <div key={p.productId || idx} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-800 text-xs font-black flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate text-xs sm:text-sm">{p.name}</p>
                      <p className="text-[11px] font-semibold text-slate-600 font-mono">{p.sku} • {p.totalQuantitySold} sold</p>
                    </div>
                  </div>
                  <span className="font-bold text-slate-900 font-mono shrink-0 text-xs sm:text-sm">
                    ${p.totalRevenue?.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Operational Feeds: Low Stock, Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Low Stock Alerts Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                Low & Out of Stock Alerts
              </h3>
              <p className="text-xs font-semibold text-slate-700">Items needing prompt restocking</p>
            </div>
            <button
              onClick={() => navigate('/stock-in')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline shrink-0"
            >
              Stock In &rarr;
            </button>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Product</th>
                  <th className="py-2.5 px-3 text-right">Current Stock</th>
                  <th className="py-2.5 px-3 text-right">Reorder Level</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {!summary?.lowStockAlerts || summary.lowStockAlerts.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-600 font-semibold">
                      ✅ All inventory levels are healthy!
                    </td>
                  </tr>
                ) : (
                  summary.lowStockAlerts.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span className="font-bold text-slate-900 block">{item.name}</span>
                        <span className="font-mono text-xs font-semibold text-slate-600">{item.sku}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-black font-mono text-slate-900">
                        {item.currentStock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-700">
                        {item.reorderLevel} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'OUT_OF_STOCK'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.status === 'OUT_OF_STOCK' ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => navigate('/stock-in', { state: { productId: item.id } })}
                          className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold text-[11px] transition-colors"
                        >
                          + Restock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Sales Feed */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-700" />
                Recent Sales
              </h3>
              <p className="text-xs font-semibold text-slate-700">Last 5 completed transactions</p>
            </div>
            <button
              onClick={() => navigate('/sales')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              All Sales &rarr;
            </button>
          </div>

          <div className="divide-y divide-slate-200">
            {!summary?.recentSales || summary.recentSales.length === 0 ? (
              <div className="py-8 text-center text-slate-600 font-semibold text-xs">
                No recent sales recorded yet.
              </div>
            ) : (
              summary.recentSales.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 font-mono text-sm">{s.invoiceNumber}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200 text-[10px] text-slate-800 font-bold">
                        {s.paymentMethod}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 block mt-0.5">
                      Cashier: {s.cashierName} • {s.itemCount} items
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-900 font-mono text-sm block">
                      ${s.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 font-mono">
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
