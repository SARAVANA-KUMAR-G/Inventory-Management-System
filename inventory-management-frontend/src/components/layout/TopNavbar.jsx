import React from 'react';
import { Menu, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function TopNavbar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleToggle = () => {
    if (window.innerWidth < 1024) {
      setMobileOpen(!mobileOpen);
    } else {
      setCollapsed(!collapsed);
    }
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <button
          onClick={handleToggle}
          className="p-2 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-700 truncate">
          <span>{currentDate}</span>
          <span>•</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            System Online
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* User Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-200 border border-slate-300 text-slate-900 font-bold flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0">
            {user?.firstName?.[0] || 'U'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[90px] sm:max-w-[160px]">
              {user?.firstName} {user?.lastName || ''}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${isAdmin ? 'text-indigo-700' : 'text-emerald-800'}`}>
              {user?.role || 'STAFF'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors shrink-0 ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
