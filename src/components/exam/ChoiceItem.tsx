type ChoiceItemProps = {
  number: number;
  text: string;
  selected: boolean;
  onSelect: () => void;
};

export function ChoiceItem({ number, text, selected, onSelect }: ChoiceItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`block w-full rounded-sm px-2 py-3 text-left transition sm:px-3 ${
        selected
          ? 'bg-blue-50 text-slate-900'
          : 'bg-transparent text-slate-700 hover:bg-slate-50'
      }`}
    >
      <div className="flex w-full min-w-0 items-start gap-2 sm:gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[14px] font-bold leading-none sm:h-9 sm:w-9 sm:text-[15px] ${
            selected
              ? 'border-blue-700 bg-blue-700 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          {number}
        </div>
        <div
          className="min-w-0 flex-1 overflow-hidden pt-[3px] whitespace-normal break-keep text-[14px] leading-6 sm:pt-[4px] sm:text-[15px] sm:leading-7"
          style={{
            width: '100%',
            minWidth: 0,
            maxWidth: '100%',
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
            writingMode: 'horizontal-tb',
            textOrientation: 'mixed',
          }}
        >
          {text}
        </div>
      </div>
    </button>
  );
}
