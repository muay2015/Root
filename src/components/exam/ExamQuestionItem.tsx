import { ChoiceList } from './ChoiceList';
import { QuestionStimulusBox } from './QuestionStimulusBox';
import { parseExamQuestionParts, type ExamQuestion } from './types';

type ExamQuestionItemProps = {
  question: ExamQuestion;
  questionNumber: number;
  response: string | undefined;
  active: boolean;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

export function ExamQuestionItem(props: ExamQuestionItemProps) {
  const { question, questionNumber, response, active, onSelectChoice, onChangeText } = props;
  const { prompt, stimulus } = parseExamQuestionParts(question.stem);

  return (
    <section
      id={`exam-question-${question.id}`}
      data-exam-question={question.id}
      className={`scroll-mt-28 border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6 ${
        active ? 'bg-slate-50/70' : 'bg-white'
      }`}
    >
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4">
        <div />
        <div className="w-full min-w-0">
          {question.topic.trim().length > 0 ? (
            <p className="text-[11px] font-medium text-slate-500 sm:text-[12px]">{question.topic}</p>
          ) : null}
        </div>

        <div className="text-center font-bold text-[15px] leading-6 text-slate-900 sm:text-[16px] sm:leading-7">
          {questionNumber}.
        </div>
        <p className="min-w-0 whitespace-pre-wrap break-words break-keep text-[15px] leading-6 text-slate-900 sm:text-[16px] sm:leading-7">
          {prompt}
        </p>

        <div />
        <QuestionStimulusBox content={stimulus} />

        <div />
        <div className="w-full min-w-0">
          {question.type === '객관식' ? (
            <ChoiceList
              choices={question.choices ?? []}
              selectedChoice={response}
              onSelect={(choice) => onSelectChoice(question.id, choice)}
            />
          ) : (
            <div className="space-y-2">
              <div className="text-[12px] font-medium text-slate-600 sm:text-[13px]">답안을 직접 입력하세요.</div>
              <textarea
                value={response ?? ''}
                onChange={(event) => onChangeText(question.id, event.target.value)}
                placeholder="답안을 입력하세요"
                className="min-h-28 w-full border border-slate-300 bg-white px-4 py-3 text-[14px] leading-6 outline-none focus:border-slate-800 sm:text-[15px] sm:leading-7"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
