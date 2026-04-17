import React from 'react';
import { PromptRenderer } from '../PromptRenderer';

interface EnglishReadingLayoutProps {
  instruction: string;
  passage: string;
  isEnglishReading: boolean;
  isEnglishGrammar?: boolean;
}

/**
 * 일반 영어 독해 문항 레이아웃 (발문 + 지문 박스)
 */
export const EnglishReadingLayout: React.FC<EnglishReadingLayoutProps> = ({
  instruction,
  passage,
  isEnglishReading,
  isEnglishGrammar,
}) => {
  const hasPassage = passage && instruction.trim() !== passage.trim();

  return (
    <>
      {/* 1. 발문 (Instruction) - 항상 박스 외부 상단에 표시 */}
      {instruction.trim() && (
        <div className="mb-4 text-[16px] leading-[1.7] text-slate-800 sm:text-[17px]">
          <PromptRenderer text={instruction} isEnglishSentenceInsertion={isEnglishReading} isEnglishGrammar={isEnglishGrammar} />
        </div>
      )}

      {/* 2. 지문 (Passage) - 지문이 있을 때만 박스 내부에 표시 */}
      {hasPassage && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm lg:rounded-xl lg:border-slate-200 lg:bg-slate-50/50 max-lg:rounded-2xl max-lg:border-blue-100 max-lg:bg-white max-lg:shadow-blue-900/5 max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]">
          <div className="px-5 py-5 sm:px-6 sm:py-6 max-lg:px-1.5 max-lg:py-5">
            <div className="whitespace-pre-wrap break-words text-justify text-[16px] leading-[1.85] text-slate-900 sm:text-[17px] sm:leading-[1.9] max-lg:leading-[1.85] sm:max-lg:leading-[1.95]">
              <PromptRenderer text={passage} isEnglishSentenceInsertion={isEnglishReading} isEnglishGrammar={isEnglishGrammar} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

