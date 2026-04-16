import React from 'react';
import { PromptRenderer } from '../PromptRenderer';
import { QuestionStimulusBox } from '../../QuestionStimulusBox';

interface EnglishOrderLayoutProps {
  instruction: string;
  intro?: string | null;
  sections: { label: string; content: string }[];
  isEnglishReading: boolean;
}

/**
 * 순서 배열 문항 전용 레이아웃 (발문 + 도입부 박스 + (A)(B)(C) 본문 박스)
 */
export const EnglishOrderLayout: React.FC<EnglishOrderLayoutProps> = ({
  instruction,
  intro,
  sections,
  isEnglishReading,
}) => {
  return (
    <>
      {instruction.trim() && (
        <div className="mb-4">
          <PromptRenderer text={instruction} isEnglishSentenceInsertion={isEnglishReading} />
        </div>
      )}
      
      {intro && (
        <div className="my-5">
          <QuestionStimulusBox content={intro} renderMode="plain" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm">
        <div className="border-b border-slate-200 bg-white px-5 py-2.5 text-[13px] font-bold tracking-[0.05em] text-slate-700 sm:px-6">
          본문
        </div>
        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {sections.map((section) => (
            <div key={`${section.label}-${section.content}`} className="space-y-2">
              <div className="text-[13px] font-bold tracking-[0.05em] text-slate-700">
                ({section.label})
              </div>
              <div className="whitespace-pre-wrap break-words text-[16px] leading-[1.8] text-slate-800 sm:text-[17px] sm:leading-[1.9]">
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
