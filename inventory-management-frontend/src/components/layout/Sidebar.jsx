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
  Boxes
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

export function Sidebar({ collapsed }) {
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
    <aside
      className={cn(
        'bg-slate-900 text-slate-300 flex flex-col transition-all duration-300 z-30 border-r border-slate-800 shrink-0',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white shrink-0 shadow-md shadow-emerald-950/40">
            <Boxes className="w-6 h-6" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base text-white tracking-tight leading-tight">SmartInventory</span>
              <span className="text-xs text-emerald-400 font-medium">V1 System</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-150',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/50'
                    : item.highlight
                    ? 'text-emerald-300 hover:bg-emerald-950/40 hover:text-emerald-200'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                  collapsed ? 'justify-center px-0' : ''
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </div>

      {/* Footer User Info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40">
        <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : '')}>
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
            {user?.firstName?.[0] || 'U'}
          </div>
          {!collapsed && (
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
  );
}
