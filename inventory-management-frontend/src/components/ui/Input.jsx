import React, { forwardRef } from 'react';
import { cn } from '../../utils/cn';

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    className = '',
    containerClassName = '',
    icon: Icon,
    ...props
  },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-xs font-bold text-slate-800 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-slate-500 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 font-medium placeholder:text-slate-500 transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
            Icon ? 'pl-9' : '',
            error ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400' : 'border-slate-300',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-600 font-medium">{helperText}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select(
  {
    label,
    error,
    children,
    className = '',
    containerClassName = '',
    ...props
  },
  ref
) {
  return (
    <div className={cn('flex flex-col gap-1', containerClassName)}>
      {label && (
        <label className="text-xs font-bold text-slate-800 tracking-wide">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 font-medium transition-all duration-150',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
          error ? 'border-rose-300 bg-rose-50/20 focus:ring-rose-400' : 'border-slate-300',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
});

