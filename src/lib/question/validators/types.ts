import type { DifficultyLevel, SchoolLevel } from '../generationRules.ts';
import type { SubjectKey } from '../subjectConfig.ts';

export type GeneratedQuestionDraft = {
  topic: string;
  type: string;
  stem: string;
  choices?: string[] | null;
  options?: string[] | null;
  items?: string[] | null;
  answer: string;
  explanation: string;
};

export type ValidationResult = {
  isValid: boolean;
  reasons: string[];
  warnings: string[];
  issueCounts: Record<string, number>;
};

export type ValidationInput = {
  questions: GeneratedQuestionDraft[];
  count: number;
  subject: SubjectKey;
  questionType?: string;
  format?: string;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  title?: string;
  topic?: string;
};
