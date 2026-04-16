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
    <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm mt-2 mb-1 lg:rounded-xl lg:border-slate-200 lg:bg-slate-50/50 max-lg:rounded-2xl max-lg:border-blue-100 max-lg:bg-white max-lg:shadow-blue-900/5">
      <div className="px-3 py-3.5 sm:px-5 sm:py-5 max-lg:px-4 max-lg:py-5">
        <div className="space-y-3 text-[15px] leading-[1.75] text-slate-800 sm:text-[16px] sm:leading-[1.85] max-lg:text-justify max-lg:leading-[1.85] sm:max-lg:leading-[1.95]">
          {paragraphs.map((paragraph, index) => (
            <div key={`${index}-${paragraph}`} className="w-full min-w-0 whitespace-pre-wrap break-words overflow-wrap-anywhere max-lg:break-all">
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
