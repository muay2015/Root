import { FileText } from 'lucide-react';
import { hasStimulus } from '../../lib/question/hasStimulus';
import { MathRenderer } from '../ui/MathRenderer';

type QuestionStimulusBoxProps = {
  content?: string | null;
  variant?: 'default' | 'csat';
  renderMode?: 'math' | 'plain';
};

function splitStimulusParagraphs(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizePlainStimulusText(text: string) {
  return text
    .replace(/<\/?u>/gi, '')
    .replace(/\[\/?u\]/gi, '')
    .trim();
}

export function QuestionStimulusBox({ content, renderMode = 'math' }: QuestionStimulusBoxProps) {
  if (!hasStimulus(content)) {
    return null;
  }

  const paragraphs = splitStimulusParagraphs(content);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm mt-2 mb-1">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <div className="space-y-4 text-[16px] leading-[1.8] text-slate-800 sm:text-[17px] sm:leading-[1.9] text-justify break-keep">
          {paragraphs.map((paragraph, index) => (
            <div key={`${index}-${paragraph}`} className="whitespace-pre-wrap break-words break-keep text-justify">
              {renderMode === 'plain'
                ? normalizePlainStimulusText(paragraph)
                : <MathRenderer text={paragraph} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
