import { type SchoolLevel, type BuilderMode, type DetailedGrade } from '../../lib/examTypes';

interface GradeSelectorProps {
  mode: BuilderMode;
  value: SchoolLevel;
  onChange: (val: SchoolLevel) => void;
  detailedGrade: DetailedGrade;
  onDetailedGradeChange: (val: DetailedGrade) => void;
}

export function GradeSelector({ mode, value, onChange, detailedGrade, onDetailedGradeChange }: GradeSelectorProps) {
  const levels: SchoolLevel[] = ['middle', 'high'];
  const labels: Record<SchoolLevel, string> = {
    middle: '중등 과정',
    high: '고등 과정'
  };

  const detailedGrades: DetailedGrade[] = ['1학년', '2학년', '3학년'];

  return (
    <section className="premium-card p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-4">대상 학년/과정</h2>
        <div className="flex flex-wrap gap-2.5">
          {levels.map((level) => {
            const isDisabled = mode === 'csat' && level === 'middle';
            return (
              <button
                key={level}
                onClick={() => !isDisabled && onChange(level)}
                disabled={isDisabled}
                className={`rounded-2xl px-6 py-3.5 text-[13px] sm:text-sm font-bold transition-all duration-300 ${
                  value === level 
                    ? 'premium-gradient text-white shadow-md' 
                    : isDisabled
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : 'bg-slate-50 text-slate-600 ring-1 ring-outline hover:bg-white hover:shadow-sm'
                }`}
              >
                {labels[level]}
              </button>
            );
          })}
        </div>
      </div>

      {mode !== 'csat' && (
        <div className="animate-in slide-in-from-top-2 duration-300 pt-2">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500 mb-3 ml-1">상세 학년 선택</h2>
          <div className="flex gap-2 items-stretch">
            {detailedGrades.map((g) => (
              <button
                key={g}
                onClick={() => onDetailedGradeChange(g)}
                className={`flex-1 min-w-0 py-3.5 rounded-2xl text-[13px] sm:text-sm font-black transition-all whitespace-nowrap ${
                  detailedGrade === g 
                    ? 'bg-slate-900 text-white shadow-lg scale-105 z-10' 
                    : 'bg-white text-slate-400 ring-1 ring-slate-200 hover:ring-slate-300'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
