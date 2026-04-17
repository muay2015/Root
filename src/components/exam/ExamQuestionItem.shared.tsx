import React from 'react';
import { PenLine } from 'lucide-react';
import { ChoiceList } from './ChoiceList';
import { OXChoiceList } from './OXChoiceList';
import { QuestionStimulusBox } from './QuestionStimulusBox';
import { PromptRenderer } from './question/PromptRenderer';
import { QuestionRow, QuestionContent } from './question/QuestionLayout';
import type { ExamQuestion } from './types';

const SHARED_BOX_MARKER_RE = /(?:<보기>|\[보기\]|<자료>|\[자료\]|<조건>|\[조건\])/u;
function extractBasePassage(s: string) {
  const m = SHARED_BOX_MARKER_RE.exec(s);
  return m ? s.slice(0, m.index).trim() : s.trim();
}
function extractStimulusBogi(s: string): string | null {
  const m = SHARED_BOX_MARKER_RE.exec(s);
  return m ? s.slice(m.index).trim() : null;
}

export function ExamQuestionSectionFrame({
  question,
  questionNumber,
  active,
  children,
}: {
  question: ExamQuestion;
  questionNumber: number;
  active: boolean;
  children: React.ReactNode;
}) {


  return (
    <section
      id={`exam-question-${question.id}`}
      data-exam-question={question.id}
      data-exam-layout="paper-template"
      className={`scroll-mt-28 w-full rounded-2xl border px-2 py-5 shadow-sm transition-all duration-300 sm:scroll-mt-32 sm:p-7 ${
        active
          ? 'translate-y-[-0.125rem] border-blue-300 bg-white shadow-md ring-2 ring-blue-50/50'
          : 'border-slate-200/80 bg-white hover:border-blue-200'
      }`}
    >
      <div className="flex w-full flex-col gap-5 sm:gap-6">


        <QuestionRow
          leading={
            <div className="min-w-[1.5rem] pt-0.5 text-[16px] font-black leading-none text-slate-800 sm:text-[18px] max-lg:text-slate-900 max-lg:pt-1">
              {questionNumber}.
            </div>
          }
          content={
            <QuestionContent className="max-lg:font-bold">
              {children}
            </QuestionContent>
          }
        />
      </div>
    </section>
  );
}

export function QuestionImageCard({ question }: { question: ExamQuestion }) {
  return (
    <div className="mb-6 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/50 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Original Material
          </span>
          {question.image_focus_area && (
            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-600">
              Focusing
            </span>
          )}
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-500">
          Hybrid Mode
        </span>
      </div>

      {question.image_focus_area ? (
        <div
          className="relative w-full overflow-hidden rounded-lg bg-slate-50 shadow-inner ring-1 ring-slate-200"
          style={{
            aspectRatio:
              question.image_focus_area.width > 95 && question.image_focus_area.height > 95
                ? 'auto'
                : `${question.image_focus_area.width} / ${question.image_focus_area.height}`,
            maxHeight: '1200px',
          }}
        >
          <img
            src={question.image_url}
            alt="문제 이미지 세그먼트"
            className={`absolute left-0 top-0 max-w-none ${
              question.image_focus_area.width > 95 && question.image_focus_area.height > 95
                ? 'relative h-auto w-full'
                : ''
            }`}
            style={{
              width:
                question.image_focus_area.width > 95 && question.image_focus_area.height > 95
                  ? '100%'
                  : `${10000 / question.image_focus_area.width}%`,
              transform:
                question.image_focus_area.width > 95 && question.image_focus_area.height > 95
                  ? 'none'
                  : `translateX(-${question.image_focus_area.left}%) translateY(-${question.image_focus_area.top}%)`,
              transformOrigin: '0 0',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).parentElement!.style.display = 'none';
            }}
          />
        </div>
      ) : (
        <img
          src={question.image_url}
          alt="문제 이미지"
          className="h-auto max-h-[650px] w-full object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).parentElement!.style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

export function QuestionChoiceSection({
  question,
  response,
  finalChoices,
  isOXQuestion,
  hideText,
  numberStyle = 'numeric',
  onSelectChoice,
  onChangeText,
}: {
  question: ExamQuestion;
  response: string | undefined;
  finalChoices: any[];
  isOXQuestion: boolean;
  hideText?: boolean;
  numberStyle?: 'numeric' | 'circle';
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
}) {
  return (
    <div className="pt-2 sm:pt-4">
      {question.type === '객관식' ? (
        isOXQuestion ? (
          <OXChoiceList
            selectedChoice={response}
            onSelect={(choice) => onSelectChoice(question.id, choice)}
          />
        ) : (
          <ChoiceList
            choices={finalChoices}
            selectedChoice={response}
            onSelect={(choice) => onSelectChoice(question.id, choice)}
            hideText={hideText}
            numberStyle={numberStyle}
          />
        )
      ) : (
        <div className="mt-2 space-y-3">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 sm:text-[14px]">
            <PenLine className="h-4 w-4" />
            <span>답안을 직접 입력하세요.</span>
          </div>
          <textarea
            value={response ?? ''}
            onChange={(event) => onChangeText(question.id, event.target.value)}
            placeholder="여기에 답안을 작성해주세요..."
            className="min-h-[140px] w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-4 text-[15px] leading-7 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 sm:text-[16px] sm:leading-8 shadow-inner"
          />
        </div>
      )}
    </div>
  );
}

export function CommonPromptBlock({
  prompt,
  stimulus,
  shouldInterleaveStimulus,
  isEnglishReading,
  questionHasImage,
}: {
  prompt: string;
  stimulus: string | null;
  shouldInterleaveStimulus: boolean;
  isEnglishReading: boolean;
  questionHasImage: boolean;
}) {
  if (questionHasImage) {
    return null;
  }

  const lines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
  const instruction = lines[0];
  const passage = lines.slice(1).join('\n').trim();

  if (shouldInterleaveStimulus) {
    const basePassage = extractBasePassage(stimulus ?? '');
    const stimulusBogi = extractStimulusBogi(stimulus ?? '');
    return (
      <div className="mb-4">
        <PromptRenderer text={instruction} isEnglishSentenceInsertion={isEnglishReading} />
        <div className="my-5">
          <QuestionStimulusBox content={basePassage} />
        </div>
        {stimulusBogi && (
          <div className="mb-3">
            <PromptRenderer text={stimulusBogi} />
          </div>
        )}
        {passage.length > 0 && (
          <PromptRenderer text={passage} isEnglishSentenceInsertion={isEnglishReading} />
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      <PromptRenderer text={prompt} isEnglishSentenceInsertion={isEnglishReading} />
    </div>
  );
}

export function CommonStimulusRow({
  stimulus,
  questionHasImage,
}: {
  stimulus: string | null;
  questionHasImage: boolean;
}) {
  if (!stimulus || questionHasImage) {
    return null;
  }
  return <QuestionStimulusBox content={stimulus} />;
}
