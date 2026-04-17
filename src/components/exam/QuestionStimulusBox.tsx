import { FileText } from 'lucide-react';
import { hasStimulus } from '../../lib/question/hasStimulus';
import { MathRenderer } from '../ui/MathRenderer';

type QuestionStimulusBoxProps = {
  content?: string | null;
  variant?: 'default' | 'csat';
  renderMode?: 'math' | 'plain';
  /** true이면 모바일에서 네거티브 마진 확장 없이 w-full로만 렌더링 (세트 지문 등 독립 렌더링 시 사용) */
  standalone?: boolean;
};

/**
 * 이중 줄바꿈(\n\n) 기준으로 단락 분리합니다.
 * 단락 내 단일 줄바꿈은 whitespace-pre-wrap으로 보존됩니다.
 * (기존 단일 \n 분리는 줄마다 space-y-3 간격이 생겨 문장이 파편화됨)
 */
function splitStimulusParagraphs(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean);
}

function normalizePlainStimulusText(text: string) {
  return text
    .replace(/<\/?u>/gi, '')
    .replace(/\[\/?u\]/gi, '')
    .trim();
}

export function QuestionStimulusBox({ content, renderMode = 'math', standalone = false }: QuestionStimulusBoxProps) {
  if (!hasStimulus(content)) {
    return null;
  }

  const paragraphs = splitStimulusParagraphs(content);

  return (
    <div className={`w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm mt-2 mb-1 lg:rounded-xl lg:border-slate-200 lg:bg-slate-50/50 max-lg:rounded-2xl max-lg:border-blue-100 max-lg:bg-white max-lg:shadow-blue-900/5 ${standalone ? '' : 'max-lg:-ml-[1.875rem] max-lg:w-[calc(100%+1.875rem)]'}`}>
      <div className="px-3 py-3.5 sm:px-5 sm:py-5 max-lg:px-1.5 max-lg:py-5">
        <div className="space-y-4 text-[16px] leading-[1.85] text-slate-800 sm:text-[17px] sm:leading-[1.9] max-lg:text-[15px] max-lg:leading-[1.85]">
          {paragraphs.map((paragraph, index) => (
            <div key={`${index}-${paragraph}`} className="w-full min-w-0 whitespace-pre-wrap break-words overflow-wrap-anywhere text-justify">
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
