import { ChoiceList } from './ChoiceList';
import type { ExamQuestion } from './types';

type QuestionViewerProps = {
  question: ExamQuestion;
  questionNumber: number;
  totalCount: number;
  response: string | undefined;
  onSelectChoice: (choice: string) => void;
  onChangeText: (value: string) => void;
};

export function QuestionViewer(props: QuestionViewerProps) {
  const { question, questionNumber, totalCount, response, onSelectChoice, onChangeText } = props;

  return (
    <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">문항 {questionNumber}</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900 sm:text-2xl">
            {questionNumber}. {question.stem}
          </h2>
        </div>
        <div className="text-sm text-slate-400">{totalCount}문항 중</div>
      </div>

      {question.type === '객관식' ? (
        <ChoiceList
          choices={question.choices ?? []}
          selectedChoice={response}
          onSelect={onSelectChoice}
        />
      ) : (
        <div className="space-y-3">
          <div className="text-sm font-medium text-slate-600">답안을 직접 입력하세요.</div>
          <textarea
            value={response ?? ''}
            onChange={(event) => onChangeText(event.target.value)}
            placeholder="답안을 입력하세요."
            className="min-h-36 w-full border border-slate-300 bg-white px-4 py-4 text-[15px] leading-7 outline-none focus:border-slate-900"
          />
        </div>
      )}
    </section>
  );
}
