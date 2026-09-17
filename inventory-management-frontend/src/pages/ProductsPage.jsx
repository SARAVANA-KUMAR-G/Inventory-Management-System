import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';
import apiClient, { getApiBaseUrl } from '../services/api/client';
import { Card, Badge, Modal } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

export function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, totalItems: 0 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    barcode: '',
    categoryId: '',
    unit: 'pcs',
    costPrice: '',
    sellingPrice: '',
    initialStock: '0',
    reorderLevel: '10',
    location: ''
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/products', {
        params: {
          page,
          pageSize: 15,
          search,
          categoryId: selectedCategory,
          stockStatus,
          includeInactive: true
        }
      });
      if (res.success) {
        setProducts(res.data);
        setMeta(res.meta);
      }
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadCategories() {
      const res = await apiClient.get('/categories');
      if (res.success) setCategories(res.data);
    }
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [page, search, selectedCategory, stockStatus]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      name: '',
      barcode: '',
      categoryId: categories[0]?.id || '',
      unit: 'pcs',
      costPrice: '',
      sellingPrice: '',
      initialStock: '0',
      reorderLevel: '10',
      location: ''
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      unit: product.unit,
      costPrice: String(product.costPrice),
      sellingPrice: String(product.sellingPrice),
      initialStock: String(product.currentStock),
      reorderLevel: String(product.reorderLevel),
      location: product.location || ''
    });
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        sku: formData.sku,
        name: formData.name,
        barcode: formData.barcode || null,
        categoryId: formData.categoryId,
        unit: formData.unit,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        reorderLevel: Number(formData.reorderLevel),
        location: formData.location || null
      };

      if (editingProduct) {
        await apiClient.patch(`/products/${editingProduct.id}`, payload);
      } else {
        payload.initialStock = Number(formData.initialStock);
        await apiClient.post('/products', payload);
      }

      setShowAddModal(false);
      loadProducts();
    } catch (err) {
      alert(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (product) => {
    try {
      await apiClient.patch(`/products/${product.id}`, {
        isActive: !product.isActive
      });
      loadProducts();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('inventory_access_token');
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/products/export`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `products_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products Catalog</h1>
          <p className="text-sm text-slate-700 font-medium">Manage SKUs, barcodes, pricing, stock levels and thresholds</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleExport} size="sm" className="font-semibold">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
          <Button onClick={handleOpenAdd} size="sm" className="font-bold">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by SKU, product name, or barcode..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
          className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
          className="w-full md:w-44 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900"
        >
          <option value="">All Stock Levels</option>
          <option value="in_stock">In Stock</option>
          <option value="low_stock">Low Stock Alerts</option>
          <option value="out_of_stock">Out of Stock</option>
        </select>
      </Card>

      {/* Products Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <th className="py-3 px-4">Product Info</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Cost Price</th>
                <th className="py-3 px-4">Selling Price</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-600 font-medium">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-600 font-medium">
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold text-slate-900">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-0.5 font-mono font-medium">
                          <span>SKU: {p.sku}</span>
                          {p.barcode && <span>• Barcode: {p.barcode}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">
                      {p.categoryName || 'General'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      ${p.costPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-950">
                      ${p.sellingPrice.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {p.currentStock} {p.unit}
                        </span>
                        {p.currentStock <= 0 ? (
                          <Badge variant="danger">Out of Stock</Badge>
                        ) : p.isLowStock ? (
                          <Badge variant="warning">Low Stock</Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(p)}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          p.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-300'
                        }`}
                      >
                        {p.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {p.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(p)}
                        className="text-slate-700 hover:text-emerald-700 font-semibold"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
          <span>Showing {products.length} of {meta.totalItems} products</span>
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

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="SKU (Stock Keeping Unit)*"
              required
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="e.g. LOGI-M185-BLK"
            />
            <Input
              label="Barcode / UPC (Optional)"
              value={formData.barcode}
              onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
              placeholder="e.g. 8901234567890"
            />
          </div>

          <Input
            label="Product Name*"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Logitech Wireless Mouse M185"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category*"
              required
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>

            <Input
              label="Unit of Measure*"
              required
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="pcs, pack, kg, box"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cost Price ($)*"
              type="number"
              step="0.01"
              required
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
              placeholder="0.00"
            />
            <Input
              label="Selling Price ($)*"
              type="number"
              step="0.01"
              required
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {!editingProduct && (
              <Input
                label="Opening Stock"
                type="number"
                value={formData.initialStock}
                onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
                placeholder="0"
              />
            )}
            <Input
              label="Reorder Alert Threshold"
              type="number"
              value={formData.reorderLevel}
              onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
              placeholder="10"
            />
            <Input
              label="Warehouse / Shelf Location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Aisle 3, Shelf B"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

