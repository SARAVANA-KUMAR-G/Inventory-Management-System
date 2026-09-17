import React from 'react';
import { Menu, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function TopNavbar({ collapsed, setCollapsed }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-700">
          <span>{currentDate}</span>
          <span>•</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            System Online
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* User Pill */}
        <div className="flex items-center gap-3 pl-3">
          <div className="w-9 h-9 rounded-xl bg-slate-200 border border-slate-300 text-slate-900 font-bold flex items-center justify-center text-sm shadow-xs">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 leading-tight">
              {user?.firstName} {user?.lastName || ''}
            </span>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isAdmin ? 'text-indigo-700' : 'text-emerald-800'}`}>
              {user?.role || 'STAFF'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="ml-2 p-2 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
