import { Check } from 'lucide-react';

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
      className={`group relative flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-200 sm:gap-4 sm:p-4 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
        selected
          ? 'border-blue-600 bg-blue-50/80 shadow-[0_0_0_1px_rgba(37,99,235,1)] z-10'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 hover:shadow-sm'
      }`}
    >
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px] font-bold transition-colors duration-200 sm:h-8 sm:w-8 sm:text-[15px] ${
          selected
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
        }`}
      >
        {selected ? <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} /> : number}
      </div>
      
      <div
        className={`flex-1 overflow-hidden whitespace-normal break-keep pt-[2px] text-[15px] leading-[1.6] sm:pt-[4px] sm:text-[16px] sm:leading-[1.6] transition-colors duration-200 ${
          selected ? 'text-blue-950 font-medium' : 'text-slate-700 group-hover:text-slate-900'
        }`}
        style={{
          wordBreak: 'keep-all',
          overflowWrap: 'break-word',
        }}
      >
        {text}
      </div>
    </button>
  );
}
