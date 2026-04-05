import { hasStimulus } from '../../lib/question/hasStimulus';

type QuestionStimulusBoxProps = {
  content?: string | null;
};

export function QuestionStimulusBox({ content }: QuestionStimulusBoxProps) {
  if (!hasStimulus(content)) {
    return null;
  }

  const paragraphs = content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="max-w-[44rem] border-l border-slate-300 bg-slate-50/70 pl-4 sm:pl-5">
      <div className="mb-3 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
        제시문 / 조건
      </div>
      <div className="space-y-2.5 text-[14px] leading-7 text-slate-700 sm:text-[15px] sm:leading-8">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="whitespace-pre-wrap break-words break-keep">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
