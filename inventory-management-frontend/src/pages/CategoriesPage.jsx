import React, { useState, useEffect } from 'react';
import { Tags, Plus, Edit2, FolderTree } from 'lucide-react';
import apiClient from '../services/api/client';
import { Card, Badge, Modal } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/categories?includeInactive=true');
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setShowModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCategory(c);
    setName(c.name);
    setDescription(c.description || '');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        name,
        description: description || null
      };

      if (editingCategory) {
        await apiClient.patch(`/categories/${editingCategory.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }

      setShowModal(false);
      loadCategories();
    } catch (err) {
      alert(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Product Categories</h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium">Group catalog products into organized hierarchical categories</p>
        </div>
        <Button onClick={handleOpenAdd} size="sm" className="font-bold w-full sm:w-auto py-2">
          <Plus className="w-4 h-4" />
          Add Category
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Mobile Category Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-600 font-medium">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="py-12 text-center text-slate-600 font-medium px-4">No categories defined yet</div>
          ) : (
            categories.map((c) => (
              <div key={c.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderTree className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h4 className="font-bold text-sm text-slate-900 truncate">{c.name}</h4>
                  </div>
                  <Badge variant="info" className="shrink-0">{c.productCount} items</Badge>
                </div>
                {c.description && (
                  <p className="text-xs text-slate-600 line-clamp-2">{c.description}</p>
                )}
                <div className="flex justify-end pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenEdit(c)}
                    className="w-full font-semibold text-xs py-1.5"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit Category
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Categories Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Products</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-600 font-medium">Loading categories...</td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-slate-600 font-medium">No categories defined yet</td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <FolderTree className="w-4 h-4 text-emerald-600 shrink-0" />
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium text-xs max-w-xs truncate">
                      {c.description || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="info">{c.productCount} items</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(c)}
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
      </Card>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Create Category'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Category Name*"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Consumer Electronics"
          />

          <Input
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief details about products in this category"
          />

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="w-full sm:w-auto font-semibold">
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto font-bold">
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

