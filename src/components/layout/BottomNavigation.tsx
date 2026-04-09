// 하단 네비게이션 바 컴포넌트
import React, { ReactNode } from 'react';
import { BarChart, FileText, Home, NotebookPen, PlusCircle } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

export function BottomNavigation({
  current,
  onNavigate,
  isAnonymous,
  className = '',
}: {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  isAnonymous: boolean;
  className?: string;
}) {
  if (current === 'taking') {
    return null;
  }

  const items: { id: Screen; label: string; icon: ReactNode }[] = [
    { id: 'landing' as const, label: '홈', icon: <Home className="h-5 w-5" strokeWidth={2.5} /> },
    { id: 'dashboard' as const, label: '대시보드', icon: <BarChart className="h-5 w-5" strokeWidth={2.5} /> },
    { id: 'create-selection' as const, label: '문제 생성', icon: <PlusCircle className="h-5 w-5" strokeWidth={2.5} /> },
    { id: 'saved' as const, label: '나의 보관함', icon: <FileText className="h-5 w-5" strokeWidth={2.5} /> },
    { id: 'wrong' as const, label: '오답 집중', icon: <NotebookPen className="h-5 w-5" strokeWidth={2.5} /> },
  ];

  return (
    <nav className={`glass-nav shadow-[0_-4px_20px_rgba(0,0,0,0.03)] ${className}`}>
      <div className="mx-auto flex max-w-xl justify-around px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {items.map((item) => {
          const active = current === item.id || 
            (item.id === 'create-selection' && (current === 'create' || current === 'pdf-import'));
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1.5 px-3 py-1 transition-all duration-300 ${
                active ? 'text-accent' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`transition-all duration-300 ${active ? '-translate-y-1 scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] font-black tracking-tighter ${active ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
