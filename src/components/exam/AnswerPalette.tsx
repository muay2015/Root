type AnswerPaletteProps = {
  totalCount: number;
  currentIndex: number;
  answeredIds: Set<number>;
  onJump: (index: number) => void;
};

export function AnswerPalette({ totalCount, currentIndex, answeredIds, onJump }: AnswerPaletteProps) {
  return (
    <section className="border border-slate-200 bg-white px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">문항 이동</h3>
        <span className="text-xs text-slate-500">{answeredIds.size}개 답안 선택</span>
      </div>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {Array.from({ length: totalCount }, (_, index) => {
          const number = index + 1;
          const active = number === currentIndex;
          const answered = answeredIds.has(number);
          return (
            <button
              key={number}
              onClick={() => onJump(number)}
              className={`h-10 border text-sm font-semibold transition ${
                active
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : answered
                    ? 'border-slate-500 bg-slate-100 text-slate-900'
                    : 'border-slate-300 bg-white text-slate-500'
              }`}
            >
              {number}
            </button>
          );
        })}
      </div>
    </section>
  );
}
