import React from 'react';

interface ConfigTagProps {
  label: string;
}

export function ConfigTag({ label }: ConfigTagProps) {
  return (
    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
      {label}
    </span>
  );
}
