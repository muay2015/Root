import { useEffect } from 'react';
import { ExamQuestionItem } from './ExamQuestionItem';
import type { ExamQuestion } from './types';

type ExamQuestionListProps = {
  questions: ExamQuestion[];
  responses: Record<number, string>;
  currentIndex: number;
  onVisibleChange: (index: number) => void;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};

export function ExamQuestionList(props: ExamQuestionListProps) {
  const { questions, responses, currentIndex, onVisibleChange, onSelectChoice, onChangeText } = props;

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
    <section className="border border-slate-200 bg-white">
      {questions.map((question, index) => (
        <div key={question.id}>
          <ExamQuestionItem
            question={question}
            questionNumber={index + 1}
            response={responses[question.id]}
            active={currentIndex === index + 1}
            onSelectChoice={onSelectChoice}
            onChangeText={onChangeText}
          />
        </div>
      ))}
    </section>
  );
}
