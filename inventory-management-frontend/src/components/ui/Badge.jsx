import React from 'react';
import { cn } from '../../utils/cn';

export function Badge({ children, variant = 'default', size = 'sm', className = '' }) {
  const variants = {
    default: 'bg-slate-100 text-slate-800 border border-slate-300 font-bold',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
    danger: 'bg-rose-50 text-rose-800 border border-rose-300 font-bold',
    info: 'bg-blue-50 text-blue-800 border border-blue-300 font-bold',
    purple: 'bg-purple-50 text-purple-800 border border-purple-300 font-bold'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs font-bold rounded-md',
    md: 'px-2.5 py-1 text-sm font-bold rounded-md'
  };

  return (
    <span className={cn('inline-flex items-center gap-1 font-bold', variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={cn('bg-white rounded-xl border border-slate-200/80 shadow-sm p-5 transition-all', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-xl' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className={cn('bg-white rounded-2xl shadow-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]', maxWidth)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

