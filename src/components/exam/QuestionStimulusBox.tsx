import { FileText } from 'lucide-react';
import { hasStimulus } from '../../lib/question/hasStimulus';

type QuestionStimulusBoxProps = {
  content?: string | null;
};

function splitStimulusParagraphs(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function QuestionStimulusBox({ content }: QuestionStimulusBoxProps) {
  if (!hasStimulus(content)) {
    return null;
  }

  const paragraphs = splitStimulusParagraphs(content);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm mt-2 mb-1">
      <div className="flex items-center gap-1.5 border-b border-slate-200/60 bg-slate-100/50 px-4 py-2.5 sm:px-5">
        <FileText className="h-4 w-4 text-slate-500" strokeWidth={2.5} />
        <span className="text-[12px] font-bold tracking-[0.05em] text-slate-600">
          제시문 / 조건
        </span>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-3 text-[15px] leading-[1.7] text-slate-800 sm:text-[16px] sm:leading-[1.8]">
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`} className="whitespace-pre-wrap break-words break-keep">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
