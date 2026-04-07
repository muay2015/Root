type ExamHeaderProps = {
  title: string;
  subjectLabel: string;
  schoolLevelLabel: string;
  difficultyLabel: string;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
  isSidebar?: boolean;
};

export function ExamHeader(props: ExamHeaderProps) {
  const { title, subjectLabel, schoolLevelLabel, difficultyLabel, currentIndex, totalCount, answeredCount, isSidebar = false } = props;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className={`flex flex-col gap-5 ${isSidebar ? '' : 'border-b border-slate-200 bg-white p-5 sm:p-7'}`}>
      <div className={`flex flex-col gap-3 ${isSidebar ? '' : 'sm:flex-row sm:items-start sm:justify-between'}`}>
        <div>
          {!isSidebar && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent/80">CBT Exam Session</p>}
          <h1 className={`font-black leading-tight text-slate-900 ${isSidebar ? 'text-[20px]' : 'mt-1 text-[28px]'}`}>{title}</h1>
        </div>
        {!isSidebar && (
          <div className="text-right">
            <div className="text-[13px] font-bold text-slate-400">STATUS</div>
            <div className="text-[18px] font-black text-slate-900">
              {currentIndex} <span className="text-slate-300">/</span> {totalCount}
            </div>
          </div>
        )}
      </div>

      <div className={`flex flex-wrap items-start gap-x-6 gap-y-3 text-slate-600 ${isSidebar ? 'flex-col gap-y-4' : ''}`}>
        <div className={isSidebar ? 'w-full' : ''}>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">과목</div>
          <div className="mt-0.5 text-[14px] font-bold text-slate-900">{subjectLabel}</div>
        </div>
        <div className={isSidebar ? 'w-full' : ''}>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">학교급</div>
          <div className="mt-0.5 text-[14px] font-bold text-slate-900">{schoolLevelLabel}</div>
        </div>
        <div className={isSidebar ? 'w-full' : ''}>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">난이도</div>
          <div className="mt-0.5 text-[14px] font-bold text-slate-900">{difficultyLabel}</div>
        </div>
        <div className={isSidebar ? 'w-full' : ''}>
          <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">진행도</div>
          <div className="mt-0.5 text-[14px] font-bold text-slate-900">{answeredCount} / {totalCount} 문항</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <span>{isSidebar ? 'Overall Progress' : '진행 현황'}</span>
          <span className="text-accent">{progress}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-100 overflow-hidden sm:rounded-full">
          <div 
            className="h-full bg-accent transition-all duration-1000 ease-out" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
}
