import React from 'react';

interface MetricCardProps {
  label: string;
  value: number;
  suffix: string;
  icon: React.ReactNode;
}

export function MetricCard({ label, value, suffix, icon }: MetricCardProps) {
  return (
    <div className="premium-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-500">{label}</span>
      </div>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-black tracking-tight text-slate-900">{value}</span>
        <span className="text-sm font-bold text-slate-400">{suffix}</span>
      </div>
    </div>
  );
}

interface BadgeProps {
  label: string;
  theme: 'slate' | 'blue' | 'amber';
}

export function Badge({ label, theme }: BadgeProps) {
  const styles = {
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100'
  };
  return (
    <span className={`rounded-xl border px-3 py-1.5 text-[11px] font-black uppercase tracking-wider ${styles[theme]}`}>
      {label}
    </span>
  );
}
