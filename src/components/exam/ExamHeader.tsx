type ExamHeaderProps = {
  title: string;
  subjectLabel: string;
  schoolLevelLabel: string;
  difficultyLabel: string;
  currentIndex: number;
  totalCount: number;
  answeredCount: number;
};

export function ExamHeader(props: ExamHeaderProps) {
  const { title, subjectLabel, schoolLevelLabel, difficultyLabel, currentIndex, totalCount, answeredCount } = props;
  const progress = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <header className="border border-slate-200 bg-white px-5 py-5 sm:px-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">CBT Exam</p>
            <h1 className="mt-1 text-[27px] font-bold leading-tight text-slate-900">{title}</h1>
          </div>
          <div className="text-right text-[13px] text-slate-500">
            <div>
              {currentIndex} / {totalCount}
            </div>
            <div>{answeredCount}문항 답안 선택</div>
          </div>
        </div>

        <div className="grid gap-3 text-[14px] text-slate-600 sm:grid-cols-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">과목</div>
            <div className="mt-1 font-medium text-slate-900">{subjectLabel}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">학교급</div>
            <div className="mt-1 font-medium text-slate-900">{schoolLevelLabel}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">난이도</div>
            <div className="mt-1 font-medium text-slate-900">{difficultyLabel}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">총 문항 수</div>
            <div className="mt-1 font-medium text-slate-900">{totalCount}문항</div>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-[12px] font-medium text-slate-500">
            <span>진행 현황</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-200">
            <div className="h-2 bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    </header>
  );
}
