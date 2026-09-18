import React, { useState, useEffect } from 'react';
import { Users, Plus, Search } from 'lucide-react';
import apiClient from '../services/api/client';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Modal } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STAFF'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/users', { params: { search } });
      if (res.success && res.data) setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/users', formData);
      setShowModal(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        role: 'STAFF'
      });
      loadUsers();
    } catch (err) {
      alert(err.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAccess = async (targetUser) => {
    const action = targetUser.isActive ? 'deactivate' : 'activate';
    if (
      !window.confirm(
        `Are you sure you want to ${action} ${targetUser.firstName} ${targetUser.lastName || ''}? ${
          targetUser.isActive
            ? 'This will immediately revoke their access and restrict login.'
            : 'This will restore their system login access.'
        }`
      )
    ) {
      return;
    }

    try {
      await apiClient.patch(`/users/${targetUser.id}`, {
        isActive: !targetUser.isActive
      });
      loadUsers();
    } catch (err) {
      alert(err.message || `Failed to ${action} user`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 sm:w-7 h-6 sm:h-7 text-indigo-600" />
            User & Team Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-700 font-medium mt-1">
            Manage system administrators and store operational staff accounts.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 font-bold py-2">
          <Plus className="w-4 h-4" />
          Add Team Member
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5 sm:top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Mobile User Cards (< md) */}
        <div className="md:hidden divide-y divide-slate-100">
          {loading ? (
            <div className="py-12 text-center text-slate-600 font-medium text-xs">
              Loading team members...
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-600 font-medium text-xs px-4">
              No users found.
            </div>
          ) : (
            users.map((u) => (
              <div key={u.id} className="p-3.5 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-900 leading-tight">
                        {u.firstName} {u.lastName || ''}
                      </p>
                      {!u.isActive && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-300">
                          Restricted
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 font-mono font-medium block truncate mt-0.5">
                      {u.email}
                    </span>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center text-xs font-bold rounded-lg px-2.5 py-0.5 border ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-600 font-medium">Status:</span>
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Disabled
                      </span>
                    )}
                  </div>

                  <span className="text-slate-600 text-[11px] font-mono">
                    Joined: {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-end pt-1">
                  {currentUser?.id === u.id ? (
                    <span className="text-xs text-slate-500 font-semibold italic">Current User</span>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleAccess(u)}
                      className={`w-full font-bold text-xs py-1.5 ${
                        u.isActive
                          ? 'text-rose-700 hover:bg-rose-50 border-rose-200'
                          : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {u.isActive ? 'Deactivate User' : 'Activate User'}
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Users Table (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-100 text-slate-800 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">User</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Date Joined</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-600 font-medium text-xs">
                    Loading team members...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-600 font-medium text-xs">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900 leading-tight">
                          {u.firstName} {u.lastName || ''}
                        </p>
                        {!u.isActive && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300">
                            Access Restricted
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 font-mono font-medium">{u.email}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center text-xs font-bold rounded-lg px-2.5 py-1 border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border bg-rose-50 text-rose-800 border-rose-300">
                          <span className="w-2 h-2 rounded-full bg-rose-400" />
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono font-medium text-slate-700">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {currentUser?.id === u.id ? (
                        <span className="text-xs text-slate-500 font-semibold italic">Current User</span>
                      ) : (
                        <button
                          onClick={() => handleToggleAccess(u)}
                          className={`text-xs font-bold transition-colors hover:underline ${
                            u.isActive
                              ? 'text-rose-700 hover:text-rose-900'
                              : 'text-emerald-700 hover:text-emerald-900'
                          }`}
                        >
                          {u.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Team Member"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="First Name"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="e.g. Sarah"
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="e.g. Jenkins"
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="sarah@inventory.com"
          />

          <Input
            label="Temporary Password"
            type="password"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="••••••••"
          />

          <div>
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
              Assigned Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="STAFF">Staff (Cashier / Store Operations)</option>
              <option value="ADMIN">Admin (Full System Access)</option>
            </select>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModal(false)}
              className="w-full sm:flex-1 font-semibold"
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting} className="w-full sm:flex-1 font-bold">
              Create Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
