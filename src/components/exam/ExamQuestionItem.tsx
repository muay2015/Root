import type { ReactNode } from 'react';
import { ChoiceList } from './ChoiceList';
import { QuestionStimulusBox } from './QuestionStimulusBox';
import { parseExamQuestionParts, type ExamQuestion } from './types';

const QUESTION_CONTENT_WIDTH = 'max-w-[44rem]';

type ExamQuestionItemProps = {
  question: ExamQuestion;
  questionNumber: number;
  response: string | undefined;
  active: boolean;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

function PromptText({ text }: { text: string }) {
  const parts = text.split(/(<[^>]+>)/g).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (/^<[^>]+>$/.test(part)) {
          return (
            <span key={`${part}-${index}`} className="font-medium tracking-[0.01em] text-slate-950">
              {part}
            </span>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function QuestionRow({
  leading,
  content,
}: {
  leading?: ReactNode;
  content: ReactNode;
}) {
  return (
    <>
      <div>{leading ?? null}</div>
      <div className="w-full min-w-0">{content}</div>
    </>
  );
}

function QuestionContent({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  const classes = [QUESTION_CONTENT_WIDTH, className].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}

export function ExamQuestionItem(props: ExamQuestionItemProps) {
  const { question, questionNumber, response, active, onSelectChoice, onChangeText } = props;
  const { prompt, stimulus } = parseExamQuestionParts(question.stem);
  const topicText = question.topic.trim();

  return (
    <section
      id={`exam-question-${question.id}`}
      data-exam-question={question.id}
      data-exam-layout="paper-template"
      className={`scroll-mt-28 border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6 ${
        active ? 'bg-slate-50/70' : 'bg-white'
      }`}
    >
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-2 gap-y-3 sm:gap-x-3 sm:gap-y-4">
        <QuestionRow
          content={
            topicText.length > 0 ? (
              <QuestionContent>
                <p className="text-[11px] font-medium tracking-[0.02em] text-slate-500 sm:text-[12px]">{topicText}</p>
              </QuestionContent>
            ) : null
          }
        />

        <QuestionRow
          leading={
            <div className="text-center text-[15px] font-bold leading-6 text-slate-900 sm:text-[16px] sm:leading-7">
              {questionNumber}.
            </div>
          }
          content={
            <QuestionContent>
              <p className="min-w-0 whitespace-pre-wrap break-words break-keep text-[15px] leading-7 text-slate-900 sm:text-[16px] sm:leading-8">
                <PromptText text={prompt} />
              </p>
            </QuestionContent>
          }
        />

        {stimulus ? (
          <QuestionRow
            content={
              <QuestionContent>
                <QuestionStimulusBox content={stimulus} />
              </QuestionContent>
            }
          />
        ) : null}

        <QuestionRow
          content={
            <QuestionContent className="pt-2 sm:pt-3">
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
                    placeholder="답안을 입력하세요."
                    className="min-h-28 w-full border border-slate-300 bg-white px-4 py-3 text-[14px] leading-6 outline-none focus:border-slate-800 sm:text-[15px] sm:leading-7"
                  />
                </div>
              )}
            </QuestionContent>
          }
        />
      </div>
    </section>
  );
}
