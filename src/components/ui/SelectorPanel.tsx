import React from 'react';

// 선택 패널 컴포넌트
export function SelectorPanel({
  title,
  options,
  value,
  onSelect,
  labelMap,
  children,
}: {
  title: string;
  options: readonly string[];
  value: string;
  onSelect: (value: string) => void;
  labelMap?: Record<string, string>;
  children?: React.ReactNode;
}) {
  return (
    <section className="premium-card p-5 sm:p-6 ring-1 ring-slate-100/50 bg-white">
      <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">{title}</h2>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-xl px-5 py-3 text-[14px] font-bold transition-all duration-300 ${
              value === option 
                ? 'premium-gradient text-white shadow-md' 
                : 'bg-slate-50 text-slate-600 ring-1 ring-outline hover:bg-white hover:shadow-sm'
            }`}
          >
            {labelMap?.[option] ?? option}
          </button>
        ))}
      </div>
      {children && (
        <div className="mt-6 pt-6 border-t border-slate-50">
          {children}
        </div>
      )}
    </section>
  );
}
