export type PersistedQuestion = {
  id: number;
  topic: string;
  type: string;
  stem: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

export type PersistedWrongNote = {
  id: string;
  examTitle: string;
  topic: string;
  stem: string;
  myAnswer: string;
  answer: string;
  explanation: string;
};

export type DbWrongNoteRow = {
  id: string;
  exam_title: string;
  topic: string;
  stem: string;
  my_answer: string;
  answer: string;
  explanation: string;
  created_at?: string;
};

export type PersistedExamRecord = {
  id: string;
  title: string;
  subject?: string | null;
  builder_mode: string;
  question_type: string;
  difficulty: string;
  exam_format: string;
  question_count: number;
  source_text: string | null;
  question_files: string[] | null;
  answer_files: string[] | null;
  questions: PersistedQuestion[];
  responses: Record<string, string> | null;
  score: number | null;
  correct_count: number | null;
  wrong_count: number | null;
  submitted_at: string | null;
  created_at: string;
  isSynced?: boolean;
};

export type SaveExamDraftInput = {
  title: string;
  builderMode: string;
  questionType: string;
  difficulty: string;
  examFormat: string;
  questionCount: number;
  sourceText: string;
  questionFiles: string[];
  answerFiles: string[];
  questions: PersistedQuestion[];
  subject: string;
};

export type CompleteExamInput = {
  examId: string;
  responses: Record<number, string>;
  score: number;
  correctCount: number;
  wrongCount: number;
};

export type Result<T> = {
  data: T | null;
  error: string | null;
};
