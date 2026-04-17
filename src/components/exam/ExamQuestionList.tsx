import { useEffect, useMemo } from 'react';
import { ExamQuestionItem } from './ExamQuestionItem';
import { ExamQuestionSetItem } from './ExamQuestionSetItem';
import type { ExamQuestion } from './types';

type ExamQuestionListProps = {
  questions: ExamQuestion[];
  responses: Record<number, string>;
  currentIndex: number;
  onVisibleChange: (index: number) => void;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

type QuestionGroup =
  | { kind: 'single'; question: ExamQuestion; globalIndex: number }
  | { kind: 'set'; questions: ExamQuestion[]; globalStartIndex: number };

/**
 * 연속된 문항 중 동일한 stimulus(지문)를 공유하는 문항을 세트로 그룹핑합니다.
 * 2개 이상 연속으로 같은 stimulus를 가진 경우에만 세트로 묶습니다.
 */
function groupQuestionsByStimulusSet(questions: ExamQuestion[]): QuestionGroup[] {
  const groups: QuestionGroup[] = [];
  let i = 0;

  while (i < questions.length) {
    const current = questions[i];
    const stimulus = (current.stimulus ?? '').trim();

    // stimulus가 비어있으면 그룹핑 대상이 아님
    if (!stimulus) {
      groups.push({ kind: 'single', question: current, globalIndex: i });
      i++;
      continue;
    }

    // 연속된 같은 stimulus를 가진 문항 수집
    let j = i + 1;
    while (j < questions.length) {
      const nextStimulus = (questions[j].stimulus ?? '').trim();
      // <보기> 앞의 본문(passage) 부분만 비교하여 같은 세트인지 판단
      if (extractBasePassage(nextStimulus) === extractBasePassage(stimulus)) {
        j++;
      } else {
        break;
      }
    }

    const count = j - i;
    if (count >= 2) {
      groups.push({
        kind: 'set',
        questions: questions.slice(i, j),
        globalStartIndex: i,
      });
    } else {
      groups.push({ kind: 'single', question: current, globalIndex: i });
    }
    i = j;
  }

  return groups;
}

/** stimulus에서 <보기>/[보기]/<자료>/<조건> 블록을 제외한 기본 지문(passage) 부분만 추출 */
const BASE_PASSAGE_MARKER_RE = /(?:<보기>|\[보기\]|<자료>|\[자료\]|<조건>|\[조건\])/;
function extractBasePassage(stimulus: string): string {
  const match = BASE_PASSAGE_MARKER_RE.exec(stimulus);
  return match ? stimulus.slice(0, match.index).trim() : stimulus.trim();
}

export function ExamQuestionList(props: ExamQuestionListProps) {
  const { questions, responses, currentIndex, onVisibleChange, onSelectChoice, onChangeText } = props;

  const groups = useMemo(() => groupQuestionsByStimulusSet(questions), [questions]);

  useEffect(() => {
    const elements = questions
      .map((question) => document.getElementById(`exam-question-${question.id}`))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const rawId = visible.target.getAttribute('data-exam-question');
        const questionId = Number(rawId);
        if (!Number.isInteger(questionId)) {
          return;
        }

        const nextIndex = questions.findIndex((question) => question.id === questionId);
        if (nextIndex >= 0) {
          onVisibleChange(nextIndex + 1);
        }
      },
      {
        rootMargin: '-20% 0px -55% 0px',
        threshold: [0.2, 0.45, 0.7],
      },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [questions, onVisibleChange]);

  return (
    <section className="w-full min-w-0 space-y-5 sm:space-y-8">
      {groups.map((group) => {
        if (group.kind === 'set') {
          const firstId = group.questions[0].id;
          return (
            <div key={`set-${firstId}`} className="w-full min-w-0">
              <ExamQuestionSetItem
                questions={group.questions}
                globalStartIndex={group.globalStartIndex}
                responses={responses}
                currentIndex={currentIndex}
                onSelectChoice={onSelectChoice}
                onChangeText={onChangeText}
              />
            </div>
          );
        }

        return (
          <div key={group.question.id} className="w-full min-w-0">
            <ExamQuestionItem
              question={group.question}
              questionNumber={group.globalIndex + 1}
              response={responses[group.question.id]}
              active={currentIndex === group.globalIndex + 1}
              onSelectChoice={onSelectChoice}
              onChangeText={onChangeText}
            />
          </div>
        );
      })}
    </section>
  );
}
