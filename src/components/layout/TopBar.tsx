import { ArrowLeft, Bot, Settings, LogOut } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

export function TopBar({
  current,
  onNavigate,
  onBack,
  isAnonymous,
  sessionDisplayName,
  onSignOut,
}: {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  isAnonymous: boolean;
  sessionDisplayName: string;
  onSignOut: () => void;
}) {
  const currentLabel =
    current === 'landing' ? '홈' :
    current === 'dashboard' ? '대시보드' :
    current === 'create' ? '문제 생성' : // 하단 메뉴와 통일
    current === 'taking' ? '응시' :
    current === 'result' ? '결과' :
    current === 'saved' ? '문제함' :
    current === 'account' ? '내 계정' :
    '오답노트';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-6 sm:py-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => (current === 'landing' ? undefined : onBack())}
            className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center border transition-all ${
              current === 'landing'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Bot className="h-5 w-5 sm:h-6 sm:h-6" />
          </button>
          
          {current !== 'landing' && (
            <button
              onClick={onBack}
              className="group flex h-9 w-9 items-center justify-center border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 sm:h-10 sm:w-auto sm:px-3 sm:gap-1.5"
              title="뒤로 가기"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline text-sm font-semibold">뒤로</span>
            </button>
          )}
          
          <span className="text-[17px] sm:text-lg font-bold tracking-tight text-slate-900 ml-1">
            {currentLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isAnonymous ? (
            <button
              onClick={() => onNavigate('account')}
              className="flex h-9 items-center gap-2 border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10 sm:px-4"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden xs:inline">로그인</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => onNavigate('account')}
                className="flex h-9 items-center gap-1.5 border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:h-10 sm:gap-2 sm:px-4"
              >
                <Settings className="h-4 w-4" />
                <span className="truncate max-w-[50px] xs:max-w-[80px] sm:max-w-none">
                  {sessionDisplayName}
                </span>
              </button>
              <button
                onClick={onSignOut}
                className="flex h-9 w-9 items-center justify-center border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 sm:h-10 sm:w-auto sm:px-3 sm:gap-2"
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline text-sm font-semibold">로그아웃</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
