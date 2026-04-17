import { Check } from 'lucide-react';
import { MathRenderer } from '../ui/MathRenderer';

type ChoiceItemProps = {
  number: number | string;
  text: string;
  selected: boolean;
  onSelect: () => void;
  hideText?: boolean;
};

export function ChoiceItem({ number, text, selected, onSelect, hideText }: ChoiceItemProps & { number: number | string }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex w-full items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition-all duration-200 sm:gap-3 sm:px-3.5 sm:py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 max-lg:rounded-2xl ${
        selected
          ? 'border-blue-600 bg-blue-50/80 shadow-[0_0_0_1px_rgba(37,99,235,1)] z-10'
          : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 hover:shadow-sm max-lg:border-blue-100'
      } ${hideText ? 'items-center justify-center py-2.5 px-0' : 'items-start max-lg:px-2.5'}`}
    >
      <div
        className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors duration-200 sm:h-7 sm:w-7 sm:text-[14px] ${
          selected
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
        }`}
      >
        {selected ? <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} /> : number}
      </div>
      
      {!hideText && (
        <div
          className={`flex-1 overflow-hidden whitespace-pre-wrap break-keep pt-[2px] text-[15px] leading-[1.6] sm:pt-[4px] sm:text-[16px] sm:leading-[1.6] transition-colors duration-200 ${
            selected ? 'text-blue-950 font-medium' : 'text-slate-700 group-hover:text-slate-900'
          }`}
          style={{
            wordBreak: 'keep-all',
            overflowWrap: 'break-word',
          }}
        >
          {text.includes(' / ') && text.split(' / ').length === 2 ? (
            <div className="flex w-full flex-wrap gap-y-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:flex-nowrap">
              <div className="flex w-full items-baseline gap-1.5 sm:w-auto">
                <span className="font-semibold text-blue-600">(A)</span>
                <span className="flex-1 break-words">
                  <MathRenderer text={text.split(' / ')[0].replace(/(?:\([^A-Za-z0-9]*\s*[A-Ca-c]\s*\)|\b[A-Ca-c]\))\s*/, '').trim()} />
                </span>
              </div>
              <div className="flex w-full items-baseline gap-1.5 sm:w-auto">
                <span className="font-semibold text-blue-600">(B)</span>
                <span className="flex-1 break-words">
                  <MathRenderer text={text.split(' / ')[1].replace(/(?:\([^A-Za-z0-9]*\s*[A-Ca-c]\s*\)|\b[A-Ca-c]\))\s*/, '').trim()} />
                </span>
              </div>
            </div>
          ) : text.includes(' / ') && text.split(' / ').length === 3 ? (
            <div className="flex w-full flex-wrap gap-y-1 sm:grid sm:grid-cols-3 sm:gap-3 sm:flex-nowrap">
              <div className="flex w-full items-baseline gap-1.5 sm:w-auto">
                <span className="font-semibold text-blue-600">(A)</span>
                <span className="flex-1 break-words">
                  <MathRenderer text={text.split(' / ')[0].replace(/(?:\([^A-Za-z0-9]*\s*[A-Ca-c]\s*\)|\b[A-Ca-c]\))\s*/, '').trim()} />
                </span>
              </div>
              <div className="flex w-full items-baseline gap-1.5 sm:w-auto">
                <span className="font-semibold text-blue-600">(B)</span>
                <span className="flex-1 break-words">
                  <MathRenderer text={text.split(' / ')[1].replace(/(?:\([^A-Za-z0-9]*\s*[A-Ca-c]\s*\)|\b[A-Ca-c]\))\s*/, '').trim()} />
                </span>
              </div>
              <div className="flex w-full items-baseline gap-1.5 sm:w-auto">
                <span className="font-semibold text-blue-600">(C)</span>
                <span className="flex-1 break-words">
                  <MathRenderer text={text.split(' / ')[2].replace(/(?:\([^A-Za-z0-9]*\s*[A-Ca-c]\s*\)|\b[A-Ca-c]\))\s*/, '').trim()} />
                </span>
              </div>
            </div>
          ) : (
            <MathRenderer text={text} />
          )}
        </div>
      )}
    </button>
  );
}
