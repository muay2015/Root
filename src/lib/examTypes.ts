// 앱 전역에서 사용되는 타입 정의
import type { SubjectKey } from './question/subjectConfig';

export type Screen = 'landing' | 'create' | 'taking' | 'result' | 'wrong' | 'saved' | 'account' | 'dashboard';
export type BuilderMode = 'school' | 'csat';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type SchoolLevel = 'middle' | 'high';
export type DetailedGrade = '1학년' | '2학년' | '3학년';

export type WrongNote = {
  id: string;
  examTitle: string;
  subject?: string;
  topic: string;
  stem: string;
  myAnswer: string;
  answer: string;
  explanation: string;
};

export type ExamMeta = {
  subject: SubjectKey;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  count: number;
};
