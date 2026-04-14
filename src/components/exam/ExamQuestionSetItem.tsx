import { useMemo } from 'react';
import { useQuestionRepair } from '../../hooks/useQuestionRepair';
import { QuestionStimulusBox } from './QuestionStimulusBox';
import { PromptRenderer } from './question/PromptRenderer';
import { QuestionRow, QuestionContent } from './question/QuestionLayout';
import { QuestionChoiceSection } from './ExamQuestionItem.shared';
import type { ExamQuestion } from './types';

type ExamQuestionSetItemProps = {
  questions: ExamQuestion[];
  globalStartIndex: number;
  responses: Record<number, string>;
  currentIndex: number;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

/** stimulus에서 <보기> 블록을 제외한 기본 지문(passage) 부분만 추출 */
function extractBasePassage(stimulus: string): string {
  const bogiIndex = stimulus.indexOf('<보기>');
  return bogiIndex >= 0 ? stimulus.slice(0, bogiIndex).trim() : stimulus.trim();
}

/** stimulus에서 <보기> 블록만 추출 (있는 경우) */
function extractBogi(stimulus: string): string | null {
  const bogiIndex = stimulus.indexOf('<보기>');
  if (bogiIndex < 0) return null;
  return stimulus.slice(bogiIndex).trim();
}

type SetQuestionRowProps = {
  question: ExamQuestion;
  questionNumber: number;
  active: boolean;
  response: string | undefined;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

function SetQuestionRow(props: SetQuestionRowProps) {
  const { question, questionNumber, active, response, onSelectChoice, onChangeText } = props;
  const { prompt, stimulus, finalChoices, isOXQuestion } = useQuestionRepair(question);

  // 세트 내 개별 문항에서 <보기>가 있으면 이 문항에만 표시
  const bogi = useMemo(() => {
    if (!stimulus) return null;
    return extractBogi(stimulus);
  }, [stimulus]);

  return (
    <div
      id={`exam-question-${question.id}`}
      data-exam-question={question.id}
      className={`rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
        active
          ? 'border-blue-300 bg-blue-50/30 ring-1 ring-blue-100'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <QuestionRow
        leading={
          <div className="min-w-[1.75rem] pt-0.5 text-[16px] font-black leading-none text-slate-800 sm:text-[18px]">
            {questionNumber}.
          </div>
        }
        content={
          <QuestionContent>
            <div className="mb-2">
              <PromptRenderer text={prompt} />
            </div>

            {bogi && (
              <div className="mb-2">
                <PromptRenderer text={bogi} />
              </div>
            )}

            <QuestionChoiceSection
              question={question}
              response={response}
              finalChoices={finalChoices}
              isOXQuestion={isOXQuestion}
              onSelectChoice={onSelectChoice}
              onChangeText={onChangeText}
            />
          </QuestionContent>
        }
      />
    </div>
  );
}

export function ExamQuestionSetItem({
  questions,
  globalStartIndex,
  responses,
  currentIndex,
  onSelectChoice,
  onChangeText,
}: ExamQuestionSetItemProps) {
  // 세트의 공유 지문 = 첫 번째 문항의 stimulus에서 base passage 추출
  const sharedPassage = useMemo(() => {
    const firstStimulus = (questions[0]?.stimulus ?? '').trim();
    return extractBasePassage(firstStimulus);
  }, [questions]);

  const isAnyActive = questions.some(
    (_, i) => currentIndex === globalStartIndex + i + 1,
  );

  return (
    <section
      data-exam-layout="paper-template"
      className={`w-full rounded-2xl border p-5 shadow-sm transition-all duration-300 sm:p-7 ${
        isAnyActive
          ? 'translate-y-[-0.125rem] border-blue-300 bg-white shadow-md ring-2 ring-blue-50/50'
          : 'border-slate-200/80 bg-white hover:border-blue-200'
      }`}
    >
      <div className="flex w-full flex-col gap-5 sm:gap-6">
        {/* 세트 헤더 */}
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-[12px] font-bold tracking-wider text-white">
            {globalStartIndex + 1}–{globalStartIndex + questions.length}
          </span>
          <span className="text-[13px] font-medium text-slate-500">
            다음 글을 읽고 물음에 답하시오.
          </span>
        </div>

        {/* 공유 지문 */}
        <QuestionStimulusBox content={sharedPassage} />

        {/* 개별 문항들 */}
        <div className="flex flex-col gap-4">
          {questions.map((question, i) => (
            <SetQuestionRow
              key={question.id}
              question={question}
              questionNumber={globalStartIndex + i + 1}
              active={currentIndex === globalStartIndex + i + 1}
              response={responses[question.id]}
              onSelectChoice={onSelectChoice}
              onChangeText={onChangeText}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
