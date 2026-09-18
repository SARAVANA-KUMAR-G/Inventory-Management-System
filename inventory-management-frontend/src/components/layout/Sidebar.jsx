import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Receipt,
  BarChart3,
  Users,
  Boxes,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

export function Sidebar({ collapsed, mobileOpen, setMobileOpen }) {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'POS / New Sale', path: '/pos', icon: ShoppingCart, highlight: true },
    { label: 'Products', path: '/products', icon: Package },
    { label: 'Categories', path: '/categories', icon: Tags },
    { label: 'Stock In', path: '/stock-in', icon: ArrowDownToLine },
    { label: 'Stock Out / Adjust', path: '/stock-out', icon: ArrowUpFromLine },
    { label: 'Stock Ledger', path: '/transactions', icon: History },
    { label: 'Sales History', path: '/sales', icon: Receipt },
    ...(isAdmin ? [
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Users', path: '/users', icon: Users }
    ] : [])
  ];

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'bg-slate-900 text-slate-300 flex flex-col z-50 border-r border-slate-800 shrink-0 transition-all duration-300',
          // Mobile Drawer: Fixed slide-over
          'fixed inset-y-0 left-0 w-72 shadow-2xl lg:shadow-none lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop Width Behavior
          collapsed ? 'lg:w-20' : 'lg:w-64'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-950/40">
              <Boxes className="w-6 h-6" />
            </div>
            {(!collapsed || mobileOpen) && (
              <div className="flex flex-col">
                <span className="font-bold text-base text-white tracking-tight leading-tight">SmartInventory</span>
                <span className="text-xs text-emerald-400 font-medium">V1 System</span>
              </div>
            )}
          </div>

          {/* Mobile Drawer Close Button */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                    : item.highlight
                    ? 'text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                  collapsed ? 'lg:justify-center lg:px-0' : ''
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {(!collapsed || mobileOpen) && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className={cn('flex items-center gap-3', collapsed ? 'lg:justify-center' : '')}>
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
            {user?.firstName?.[0] || 'U'}
          </div>
          {(!collapsed || mobileOpen) && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-white truncate">
                {user?.firstName} {user?.lastName || ''}
              </span>
              <span className="text-xs text-emerald-300 truncate capitalize font-bold">
                {user?.role}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
    </>
  );
}
