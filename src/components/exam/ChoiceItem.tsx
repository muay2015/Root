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
      className={`block w-full max-w-full rounded-sm px-2 py-3 text-left transition sm:px-3 ${
        selected
          ? 'bg-blue-50 text-slate-900'
          : 'bg-transparent text-slate-700 hover:bg-slate-50'
      }`}
      style={{ display: 'block', width: '100%', maxWidth: '100%' }}
    >
      <span
        className="grid w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[2.25rem_minmax(0,1fr)] sm:gap-3"
        style={{ display: 'grid', width: '100%', maxWidth: '100%', minWidth: 0 }}
      >
        <span
          className={`shrink-0 flex h-8 w-8 items-center justify-center rounded-full border text-[14px] font-bold leading-none sm:h-9 sm:w-9 sm:text-[15px] ${
            selected
              ? 'border-blue-700 bg-blue-700 text-white'
              : 'border-slate-300 bg-white text-slate-700'
          }`}
        >
          {number}
        </span>
        <span
          className="block w-full min-w-0 pt-[3px] text-[14px] leading-6 sm:pt-[4px] sm:text-[15px] sm:leading-7"
          style={{
            display: 'block',
            width: '100%',
            maxWidth: '100%',
            minWidth: 0,
            whiteSpace: 'normal',
            wordBreak: 'normal',
            overflowWrap: 'normal',
            writingMode: 'horizontal-tb',
            textOrientation: 'mixed',
            lineBreak: 'auto',
          }}
        >
          {text}
        </span>
      </span>
    </button>
  );
}
