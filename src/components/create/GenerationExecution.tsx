import React from 'react';
import { CheckCircle2, Sparkles, AlertCircle, X } from 'lucide-react';
import { ConfigTag } from '../ui/ConfigTag';
import { SUBJECT_CONFIG, type SubjectKey } from '../../lib/question/subjectConfig';
import { getSchoolLevelLabel, getDifficultyLabel } from '../../lib/examUtils';
import type { SchoolLevel, DifficultyLevel, BuilderMode } from '../../lib/examTypes';

interface GenerationExecutionProps {
  ready: boolean;
  isGenerating: boolean;
  generationError: string | null;
  subject: SubjectKey;
  selectionLabel: string | null;
  schoolLevel: SchoolLevel;
  difficulty: DifficultyLevel;
  count: number;
  readyHint: string;
  onGenerate: () => void;
  mode: BuilderMode;
  imageCount?: number;
}

export function GenerationExecution(props: GenerationExecutionProps) {
  const {
    ready,
    isGenerating,
    generationError,
    subject,
    selectionLabel,
    schoolLevel,
    difficulty,
    count,
    readyHint,
    onGenerate,
    mode,
    imageCount = 0
  } = props;

  const getExecutionDifficultyLabel = () => {
    if (mode === 'csat') {
      if (difficulty === 'easy') return '고1 모의고사 수준';
      if (difficulty === 'medium') return '고2 모의고사 수준';
      if (difficulty === 'hard') return '고3·수능 수준';
    }
    return getDifficultyLabel(difficulty);
  };

  const [showErrorToast, setShowErrorToast] = React.useState(false);

  const handleGenerateClick = () => {
    if (isGenerating) return;
    if (!ready) {
      setShowErrorToast(true);
      setTimeout(() => setShowErrorToast(false), 3000);
      return;
    }
    onGenerate();
  };

  return (
    <section className={`premium-card p-6 border-none transition-all duration-500 overflow-hidden ${ready ? 'ring-2 ring-accent shadow-xl shadow-blue-900/10' : 'opacity-80'}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${ready ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">최종 문제 구성 확인</p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <ConfigTag label={SUBJECT_CONFIG[subject].label} />
              {selectionLabel && <ConfigTag label={selectionLabel} />}
              {!SUBJECT_CONFIG[subject].label.includes(getSchoolLevelLabel(schoolLevel)) && (
                <ConfigTag label={getSchoolLevelLabel(schoolLevel)} />
              )}
              <ConfigTag label={getExecutionDifficultyLabel()} />
              <ConfigTag label={`${count}문항`} />
            </div>
            {ready && (
              <p className="mt-2 text-xs font-bold text-blue-500 animate-in fade-in duration-500">{readyHint}</p>
            )}
          </div>
        </div>
        
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating}
          className={`relative flex h-14 items-center justify-center gap-3 rounded-2xl px-10 text-base font-black text-white shadow-lg transition-all active:scale-95 disabled:scale-100 disabled:bg-slate-200 disabled:shadow-none disabled:cursor-not-allowed group overflow-hidden ${
            ready 
              ? 'premium-gradient shadow-blue-900/20 hover:scale-[1.02]' 
              : 'bg-slate-400 shadow-none grayscale-[0.5] opacity-90'
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span>{imageCount > 1 ? `이미지 ${imageCount}장 정밀 분석 및 생성 중...` : 'AI 알고리즘 구동 중...'}</span>
            </div>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              <span>문제 생성 시작하기</span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
            </>
          )}
        </button>
      </div>
      {generationError && (
         <div className="mt-4 rounded-xl bg-red-50 p-4 text-[13px] font-bold text-red-600 ring-1 ring-red-100">
           {generationError}
         </div>
      )}
      {/* 필수 입력 누락 알림 토스트 (전역 Overlay z-index 고려) */}
      <div className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center px-4 pb-24">
        {showErrorToast && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900/90 px-6 py-3.5 text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-sm font-bold">상세 주제를 입력하거나 지문 자료를 추가해 주세요!</span>
            <button onClick={() => setShowErrorToast(false)} className="ml-2 hover:opacity-70">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
