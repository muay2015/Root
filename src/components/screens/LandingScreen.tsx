import { Bot, NotebookPen, PlusCircle, Settings, Upload } from 'lucide-react';
import type { Screen } from '../../lib/examTypes';
import { InfoCard } from '../ui/InfoCard';

interface LandingScreenProps {
  onNavigate: (screen: Screen) => void;
  isAnonymous: boolean;
}

export function LandingScreen({ onNavigate, isAnonymous }: LandingScreenProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-20 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center border border-slate-200 bg-white text-3xl font-bold">
          R
        </div>
        <div>
          <h1 className="text-4xl font-bold">ROOT CBT</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            과목 기반 문제 생성부터 실제 시험형 응시 화면, 결과 확인과 오답노트까지 한 흐름으로 관리합니다.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard
            icon={<Upload className="h-5 w-5 text-slate-900" />}
            title="업로드형"
            description="문제 파일과 정답 파일을 기준으로 시험 세트를 구성합니다."
          />
          <InfoCard
            icon={<Bot className="h-5 w-5 text-slate-900" />}
            title="AI 생성형"
            description="과목, 학교급, 난이도, 문항 수 기준으로 문제를 자동 생성합니다."
          />
        </div>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={() => onNavigate('create')}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 px-6 py-4 text-sm font-semibold text-white"
          >
            <PlusCircle className="h-5 w-5" />
            시험 만들기
          </button>
          <button
            onClick={() => onNavigate('wrong')}
            className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700"
          >
            <NotebookPen className="h-5 w-5" />
            오답노트
          </button>
          {isAnonymous && (
            <button
              onClick={() => onNavigate('account')}
              className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-6 py-4 text-sm font-semibold text-slate-700"
            >
              <Settings className="h-5 w-5" />
              로그인 / 계정
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
