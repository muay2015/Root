// 하단 네비게이션 바 컴포넌트
import { ReactNode } from 'react';
import { BarChart, FileText, Home, NotebookPen, PlusCircle } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

export function BottomNavigation({
  current,
  onNavigate,
  isAnonymous,
}: {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  isAnonymous: boolean;
}) {
  if (current === 'taking') {
    return null;
  }

  const items: { id: Screen; label: string; icon: ReactNode }[] = [
    { id: 'landing' as const, label: '홈', icon: <Home className="h-5 w-5" /> },
    { id: 'dashboard' as const, label: '대시보드', icon: <BarChart className="h-5 w-5" /> },
    { id: 'create' as const, label: '문제 생성', icon: <PlusCircle className="h-5 w-5" /> },
    { id: 'saved' as const, label: '문제함', icon: <FileText className="h-5 w-5" /> },
    { id: 'wrong' as const, label: '오답노트', icon: <NotebookPen className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-md z-50">
      <div className="mx-auto grid max-w-3xl grid-cols-5 px-1 py-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
        {items.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-[10.5px] font-bold transition-all duration-200 ${
                active ? 'text-slate-900 scale-105' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`transition-transform duration-200 ${active ? '-translate-y-0.5' : ''}`}>
                {item.icon}
              </div>
              <span className="leading-none tracking-tight">{item.label}</span>
              {active && (
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-slate-900 rounded-full animate-in fade-in zoom-in duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
