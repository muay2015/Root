import type { ExamQuestion } from './types';

export type ExamQuestionItemProps = {
  question: ExamQuestion;
  questionNumber: number;
  response: string | undefined;
  active: boolean;
  onSelectChoice: (questionId: number, choice: string) => void;
  onChangeText: (questionId: number, value: string) => void;
};
