type QuestionPaletteProps = {
  totalCount: number;
  currentIndex: number;
  answeredIds: Set<number>;
  onJump: (index: number) => void;
};

export function QuestionPalette(props: QuestionPaletteProps) {
  const { totalCount, currentIndex, answeredIds, onJump } = props;

  return (
    <section className="border border-slate-200 bg-white px-3 py-3 sm:px-4 sm:py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-slate-700 sm:text-[13px]">문항 번호</h3>
        <span className="text-[11px] text-slate-500 sm:text-[12px]">{answeredIds.size}개 선택</span>
      </div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-5 sm:gap-2">
        {Array.from({ length: totalCount }, (_, index) => {
          const number = index + 1;
          const active = number === currentIndex;
          const answered = answeredIds.has(number);
          return (
            <button
              key={number}
              onClick={() => onJump(number)}
              className={`h-9 border text-[12px] font-semibold transition sm:h-10 sm:text-[13px] ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : answered
                    ? 'border-blue-200 bg-blue-50 text-blue-800'
                    : 'border-slate-300 bg-white text-slate-500 hover:border-slate-500'
              }`}
            >
              {number}
            </button>
          );
        })}
      </div>
      <div className="mt-3 hidden space-y-1.5 text-[11px] text-slate-500 sm:block sm:text-[12px]">
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-slate-900 bg-slate-900" />
          <span>현재 문항</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-3 w-3 border border-blue-200 bg-blue-50" />
          <span>답안 선택 완료</span>
        </div>
      </div>
    </section>
  );
}
