// 상단 바 컴포넌트 (로그인 상태 표시 포함)
import { ArrowLeft, Bot, Settings } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

export function TopBar({
  current,
  onNavigate,
  isAnonymous,
  sessionDisplayName,
  onSignOut,
}: {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  isAnonymous: boolean;
  sessionDisplayName: string;
  onSignOut: () => void;
}) {
  const currentLabel =
    current === 'landing' ? '홈' :
    current === 'create' ? 'CBT 생성' :
    current === 'taking' ? '응시' :
    current === 'result' ? '결과' :
    current === 'saved' ? '저장된 문제' :
    current === 'account' ? '내 계정' :
    '오답노트';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => (current === 'landing' ? undefined : onNavigate('landing'))}
            className={`flex h-11 w-11 items-center justify-center border ${
              current === 'landing'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bot className="h-6 w-6" />
          </button>
          {current !== 'landing' && (
            <button
              onClick={() => onNavigate('landing')}
              className="flex h-11 items-center gap-1.5 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로
            </button>
          )}
          <span className="text-lg font-bold tracking-tight text-slate-900">{currentLabel}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAnonymous ? (
            <button
              onClick={() => onNavigate('account')}
              className="flex h-11 items-center gap-2 border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
              로그인
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate('account')}
                className="flex h-11 items-center gap-1.5 border border-slate-300 bg-white px-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:gap-2 sm:px-4"
              >
                <Settings className="h-4 w-4" />
                <span className="truncate max-w-[80px] sm:max-w-none">{sessionDisplayName}님</span>
              </button>
              <button
                onClick={onSignOut}
                className="flex h-11 items-center gap-2 border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                로그아웃
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
