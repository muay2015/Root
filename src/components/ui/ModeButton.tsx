import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ModeButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}

export function ModeButton({ active, onClick, icon, label, sub }: ModeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-2 rounded-2xl p-6 transition-all duration-300 ${
        active 
          ? 'bg-blue-50 ring-2 ring-accent' 
          : 'bg-white ring-1 ring-slate-100 hover:bg-slate-50'
      }`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${active ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>
        {icon}
      </div>
      <div className="text-center">
        <p className={`text-sm font-black ${active ? 'text-primary' : 'text-slate-600'}`}>{label}</p>
        <p className="text-[11px] font-bold text-slate-400 mt-0.5">{sub}</p>
      </div>
      {active && (
        <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
          <CheckCircle2 className="h-3 w-3" strokeWidth={4} />
        </div>
      )}
    </button>
  );
}
