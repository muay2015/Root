import React from 'react';

interface EnglishIrrelevantLayoutProps {
  instruction: string;
  passage: string;
}

/**
 * 관계없는 문장 유형 전용 레이아웃 (발문 + 특수 스타일 지문 박스)
 */
export const EnglishIrrelevantLayout: React.FC<EnglishIrrelevantLayoutProps> = ({
  instruction,
  passage,
}) => {
  return (
    <>
      {instruction.trim() && (
        <div className="mb-4 text-[16px] leading-[1.7] text-slate-900 sm:text-[17px]">
          {instruction}
        </div>
      )}
      
      {passage.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="whitespace-pre-wrap break-words break-keep text-[16px] leading-[1.85] text-slate-900 text-justify sm:text-[17px] sm:leading-[1.9]">
              {passage}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
