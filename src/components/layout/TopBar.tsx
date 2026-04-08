import React from 'react';
import { ArrowLeft, Bot, Settings } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';

export function TopBar({
  current,
  onNavigate,
  onBack,
  isAnonymous,
  sessionDisplayName,
  sessionUserAvatar,
  onSignOut,
}: {
  current: Screen;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  isAnonymous: boolean;
  sessionDisplayName: string;
  sessionUserAvatar?: string | null;
  onSignOut: () => void;
}) {
  return (
    <header className="glass-header sticky top-0 z-50 shadow-sm transition-all duration-300">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-2.5 sm:px-6 sm:py-3.5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {current !== 'landing' && (
              <button
                onClick={onBack}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-600 ring-1 ring-slate-200/60 transition-all hover:bg-slate-50 active:scale-95"
                aria-label="뒤로 가기"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={() => onNavigate('landing')}
              className="group relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl transition-all active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-700 to-primary opacity-90 transition-all group-hover:scale-110 group-hover:opacity-100" />
              <div className="absolute inset-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.4)]" />
              <Bot className="relative h-6 w-6 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)] transition-transform group-hover:rotate-6" />
            </button>
          </div>

          {/* 데스크탑 전용 네비게이션 */}
          <nav className="hidden items-center gap-1 rounded-2xl bg-slate-50/50 p-1 lg:flex ring-1 ring-slate-200/60">
            {[
              { id: 'landing', label: '홈' },
              { id: 'dashboard', label: '대시보드' },
              { id: 'create', label: '문제 생성' },
              { id: 'saved', label: '나의 보관함' },
              { id: 'wrong', label: '오답 집중' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as Screen)}
                className={`px-4 py-2 text-[13px] font-black transition-all rounded-[14px] ${
                  current === item.id 
                    ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/60' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {isAnonymous ? (
            <button
              onClick={() => onNavigate('account')}
              className="flex h-11 items-center gap-2 rounded-2xl bg-primary px-5 text-sm font-black text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary-container hover:shadow-primary/30 active:scale-95"
            >
              <Settings className="h-4 w-4" />
              로그인
            </button>
          ) : (
            <button
              onClick={() => onNavigate('account')}
              className="group flex h-11 items-center gap-3 rounded-2xl bg-slate-50/50 pl-1.5 pr-4 text-sm font-black text-slate-700 ring-1 ring-slate-200/60 transition-all hover:bg-white hover:ring-slate-300 active:scale-95"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-[12px] font-black text-white shadow-sm transition-transform group-hover:scale-110">
                {sessionUserAvatar ? (
                  <img src={sessionUserAvatar} alt={sessionDisplayName} className="h-full w-full object-cover" />
                ) : (
                  sessionDisplayName.charAt(0)
                )}
              </div>
              <span className="max-w-[80px] truncate sm:max-w-none">
                {sessionDisplayName}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
