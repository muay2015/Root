import { hasStimulus } from '../../lib/question/hasStimulus';

type QuestionStimulusBoxProps = {
  content?: string | null;
};

const HANGUL_ITEM_MARKERS = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];

function splitStimulusParagraphs(content: string) {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripLeadingMarker(value: string) {
  return value
    .replace(
      /^(?:[-*•·▪■]|(?:\(?\d+\)?[.)]?)|(?:[①-⑳])|(?:\(?[가-힣ㄱ-ㅎA-Za-z]\)?[.)]?)|(?:[ㄱ-ㅎ][.)]))\s*/u,
      '',
    )
    .trim();
}

function formatStimulusParagraphs(paragraphs: string[]) {
  if (paragraphs.length <= 1) {
    return paragraphs;
  }

  return paragraphs.map((paragraph, index) => {
    const marker = HANGUL_ITEM_MARKERS[index] ?? `${index + 1}`;
    return `${marker}. ${stripLeadingMarker(paragraph)}`;
  });
}

export function QuestionStimulusBox({ content }: QuestionStimulusBoxProps) {
  if (!hasStimulus(content)) {
    return null;
  }

  const paragraphs = formatStimulusParagraphs(splitStimulusParagraphs(content));

  return (
    <div className="border-l border-slate-300 bg-slate-50/60 pl-4 sm:pl-5">
      <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
        제시문 / 조건
      </div>
      <div className="space-y-2.5 text-[14px] leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
        {paragraphs.map((paragraph, index) => (
          <p key={`${index}-${paragraph}`} className="whitespace-pre-wrap break-words break-keep">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
