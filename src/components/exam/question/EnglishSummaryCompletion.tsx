import React from 'react';
import { Check } from 'lucide-react';
import { PromptRenderer } from './PromptRenderer';
import { normalizeChoiceText } from '../../../lib/question/normalizeChoiceText';

interface EnglishSummaryCompletionProps {
  instruction: string;
  passage: string;
  summary: string;
  choices: (string | { value: string; display: string })[];
  response: string | undefined;
  isEnglishReading: boolean;
  onSelectChoice: (choice: string) => void;
}

export const EnglishSummaryCompletion: React.FC<EnglishSummaryCompletionProps> = ({
  instruction,
  passage,
  summary,
  choices,
  response,
  isEnglishReading,
  onSelectChoice,
}) => {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. 발문 (Instruction) - 박스 외부 상단 */}
      {instruction.trim() && (
        <div className="text-[16px] leading-[1.7] text-slate-900 sm:text-[17px]">
          <PromptRenderer text={instruction} isEnglishSentenceInsertion={isEnglishReading} />
        </div>
      )}

      {/* 2. 지문 박스 (Passage Box) - 요약문과 내용이 동일하거나 너무 유사하면 생략 */}
      {(() => {
        const cleanPassage = passage.replace(/\s+/g, ' ').trim();
        const cleanSummary = summary.replace(/\s+/g, ' ').trim();
        
        // 지문이 없거나, 요약문과 매우 유사(혹은 요약문이 지문의 대부분인 경우)하면 렌더링 생략
        if (!cleanPassage || cleanPassage === cleanSummary || (cleanPassage.length < 150 && cleanSummary.includes(cleanPassage.slice(0, 30)))) {
          return null;
        }

        return (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm lg:rounded-xl lg:border-slate-200 lg:bg-slate-50/50 max-lg:rounded-2xl max-lg:border-blue-100 max-lg:bg-white max-lg:shadow-blue-900/5 max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]">
            <div className="px-5 py-5 sm:px-6 sm:py-6 max-lg:px-1.5 max-lg:py-5">
              <div className="whitespace-pre-wrap break-words text-[16px] leading-[1.85] text-slate-900 sm:text-[17px] sm:leading-[1.9] max-lg:leading-[1.85] sm:max-lg:leading-[1.95]">
                <PromptRenderer text={passage} isEnglishSentenceInsertion={isEnglishReading} />
              </div>
            </div>
          </div>
        );
      })()}

      {/* 3. 화살표 (Down Arrow) - 지문 박스가 있을 때만 표시 */}
      {(() => {
        const cleanPassage = passage.replace(/\s+/g, ' ').trim();
        const cleanSummary = summary.replace(/\s+/g, ' ').trim();
        if (!cleanPassage || cleanPassage === cleanSummary || (cleanPassage.length < 150 && cleanSummary.includes(cleanPassage.slice(0, 30)))) {
          return null;
        }
        return (
          <div className="flex justify-center py-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-slate-400"
            >
              <path
                d="M12 4V20M12 20L6 14M12 20L18 14"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      })()}

      {/* 4. 요약문 박스 (Summary Box) */}
      <SummaryStatementBox text={summary} />

      {/* 5. 선택지 리스트 (Choice Table) */}
      <SummaryChoiceTable
        choices={choices}
        selectedChoice={response}
        onSelect={onSelectChoice}
      />
    </div>
  );
};

const SummaryStatementBox: React.FC<{ text: string }> = ({ text }) => {
  const trimmedText = text.trim();
  if (!trimmedText) return null;

  const normalizedText = trimmedText
    .replace(/\r\n/g, '\n')
    .replace(/\[([AB])\]/gi, '($1)')
    .replace(/\\_/g, '_');
  const BLANK_RE = /(\(\s*[AB]\s*\)\s*_*)/gi;
  const parts = normalizedText.split(BLANK_RE);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100/50 lg:rounded-xl lg:border-slate-200 max-lg:rounded-2xl max-lg:border-blue-100 max-lg:shadow-blue-900/5 max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]">
      <div className="px-5 py-6 sm:px-7 sm:py-7 max-lg:px-2.5 max-lg:py-6">
        <div className="text-[16px] leading-[2] text-slate-900 sm:text-[17px] sm:leading-[2.1] max-lg:leading-[1.95]">
          {parts.map((part, i) => {
            const blankMatch = part.match(/^(?:\(|\[)([AB])(?:\)|\])/i);
            if (blankMatch) {
              const label = blankMatch[1].toUpperCase();
              return (
                <span key={i} className="inline-flex items-baseline mx-1">
                  <span className="font-medium text-slate-700 mr-2">({label})</span>
                  <span className="inline-block w-20 border-b border-slate-900 translate-y-[-2px]" />
                </span>
              );
            }
            return (
              <span key={i} className="whitespace-pre-wrap break-words">
                {part}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SummaryChoiceTable: React.FC<{
  choices: (string | { value: string; display: string })[];
  selectedChoice: string | undefined;
  onSelect: (choice: string) => void;
}> = ({ choices, selectedChoice, onSelect }) => {
  const numberLabels = ['①', '②', '③', '④', '⑤'];
  const normalizedSelected = normalizeChoiceText(selectedChoice ?? '');

  const pairs = choices.map((choice) => {
    const value = typeof choice === 'object' && choice !== null ? choice.value : String(choice);
    let display = typeof choice === 'object' && choice !== null ? choice.display : String(choice);
    
    // [v12] 선택지 내 불필요한 번호 노이즈 제거 (예: "1 behavior environmental" -> "behavior environmental")
    display = display.replace(/^\s*(?:[1-5]|[①-⑤])[\s.)-]*/, '').trim();

    // (A) / (B) 형식 분리 로직 강화
    const parts = display.split(/\s*\/\s*|\n/).map((p) => p.trim()).filter(Boolean);
    
    return { value, a: parts[0] ?? display, b: parts[1] ?? '' };
  });

  return (
    <div className="mt-4 flex flex-col gap-3 max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]">
      {/* 헤더 - ChoiceItem 내부 그리드와 정확히 정렬을 맞춤 */}
      <div className="grid grid-cols-[3.5rem_1fr_1.5rem_1fr] items-center px-[3px] mb-1">
        <div />
        <div className="text-center text-[12px] font-bold tracking-widest text-slate-400 uppercase opacity-80">(A)</div>
        <div />
        <div className="text-center text-[12px] font-bold tracking-widest text-slate-400 uppercase opacity-80">(B)</div>
      </div>

      <div className="flex flex-col gap-2.5 sm:gap-3">
        {pairs.map((pair, index) => {
          const isSelected = normalizeChoiceText(pair.value) === normalizedSelected;
          return (
            <button
              key={`${index}-${pair.value}`}
              type="button"
              onClick={() => onSelect(pair.value)}
              className={`group relative flex w-full items-start gap-2.5 rounded-xl border px-3 py-3 text-left transition-all duration-200 sm:gap-3 sm:px-3.5 sm:py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shadow-sm max-lg:rounded-2xl max-lg:px-2.5 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/80 ring-1 ring-blue-600 z-10'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50/80 max-lg:border-blue-100'
              }`}
            >
              {/* 번호 및 아이콘 - 표준 ChoiceItem과 동일 */}
              <div
                className={`flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-colors duration-200 sm:h-7 sm:w-7 sm:text-[14px] ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                }`}
              >
                {isSelected ? <Check className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={3} /> : (numberLabels[index] ?? index + 1)}
              </div>

              {/* (A)/(B) 그리드 영역 - 헤더와 컬럼 위치 동기화 */}
              <div className="flex-1 grid grid-cols-[1fr_1.5rem_1fr] items-center pt-[2px] sm:pt-[4px]">
                <div className={`text-center text-[15px] sm:text-[16px] ${
                  isSelected ? 'text-blue-900 font-semibold' : 'text-slate-700 font-medium'
                }`}>
                  {pair.a}
                </div>
                
                <div className="text-center text-slate-300 font-light select-none">/</div>
                
                <div className={`text-center text-[15px] sm:text-[16px] ${
                  isSelected ? 'text-blue-900 font-semibold' : 'text-slate-700 font-medium'
                }`}>
                  {pair.b}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
