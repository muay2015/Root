import { hasStimulus } from '../../lib/question/hasStimulus';

type QuestionStimulusBoxProps = {
  content?: string | null;
};

export function QuestionStimulusBox({ content }: QuestionStimulusBoxProps) {
  if (!hasStimulus(content)) {
    return null;
  }

  return (
    <div className="border border-slate-300 bg-slate-50 px-4 py-4 sm:px-5">
      <div className="mb-2 text-[11px] font-semibold tracking-[0.08em] text-slate-500">
        제시문 / 자료
      </div>
      <p className="whitespace-pre-wrap break-words break-keep text-[14px] leading-6 text-slate-800 sm:text-[15px] sm:leading-7">
        {content}
      </p>
    </div>
  );
}
