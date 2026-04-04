type ExamNavigationProps = {
  answeredCount: number;
  totalCount: number;
  onSubmit: () => void;
  onScrollTop: () => void;
};

export function ExamNavigation(props: ExamNavigationProps) {
  const { answeredCount, totalCount, onSubmit, onScrollTop } = props;

  return (
    <footer className="sticky bottom-4 border border-slate-200 bg-white px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[13px] text-slate-600">
          답안 선택 현황: <span className="font-semibold text-slate-900">{answeredCount}</span> / {totalCount}
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            onClick={onScrollTop}
            className="border border-slate-300 px-4 py-2.5 text-[13px] font-semibold text-slate-700"
          >
            맨 위로
          </button>
          <button
            onClick={onSubmit}
            className="bg-slate-900 px-5 py-2.5 text-[13px] font-semibold text-white"
          >
            제출하기
          </button>
        </div>
      </div>
    </footer>
  );
}
