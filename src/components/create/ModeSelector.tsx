import React from 'react';
import { Settings2, BookOpen, GraduationCap } from 'lucide-react';
import { ModeButton } from '../ui/ModeButton';
import type { BuilderMode } from '../../lib/examTypes';

interface ModeSelectorProps {
  mode: BuilderMode;
  setMode: (mode: BuilderMode) => void;
}

export function ModeSelector({ mode, setMode }: ModeSelectorProps) {
  return (
    <section className="premium-card p-6 border-none shadow-lg shadow-blue-900/5">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="h-4 w-4 text-blue-500" />
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400">설계 방식 선택</h2>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ModeButton 
          active={mode === 'school'} 
          onClick={() => setMode('school')} 
          icon={<BookOpen className="h-5 w-5" />}
          label="내신 대비" 
          sub="교과서 기반 맞춤형 출제"
        />
        <ModeButton 
          active={mode === 'csat'} 
          onClick={() => setMode('csat')} 
          icon={<GraduationCap className="h-5 w-5" />}
          label="수능/모의고사" 
          sub="최신 평가원 경향성 반영"
        />
      </div>
    </section>
  );
}
