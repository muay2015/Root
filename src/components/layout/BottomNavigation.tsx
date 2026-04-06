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
    { id: 'create' as const, label: '시험 생성', icon: <PlusCircle className="h-5 w-5" /> },
    { id: 'saved' as const, label: '문제함', icon: <FileText className="h-5 w-5" /> },
    { id: 'wrong' as const, label: '오답노트', icon: <NotebookPen className="h-5 w-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-5 px-4 py-3">
        {items.map((item) => {
          const active = current === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs font-semibold ${
                active ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
