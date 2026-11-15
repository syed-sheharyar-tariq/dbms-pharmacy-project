import React from 'react';

export const Badge = ({ children, variant = 'default' }) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/60',
    danger: 'bg-red-50 text-red-700 border border-red-200/60',
    info: 'bg-blue-50 text-blue-700 border border-blue-200/60',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200/60',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
        variantStyles[variant] || variantStyles.default
      }`}
    >
      {children}
    </span>
  );
};
