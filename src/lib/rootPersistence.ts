import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

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

type DbWrongNoteRow = {
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
};

type SaveExamDraftInput = {
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
};

type CompleteExamInput = {
  examId: string;
  responses: Record<number, string>;
  score: number;
  correctCount: number;
  wrongCount: number;
};

type Result<T> = {
  data: T | null;
  error: string | null;
};

const LOCAL_WRONG_NOTES_KEY = 'root:wrong-notes';
const LOCAL_LAST_EXAM_KEY = 'root:last-exam';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

function normalizeSupabaseErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid api key')) {
    return 'Supabase 설정 오류로 로컬 저장 모드로 전환되었습니다.';
  }

  if (normalized.includes('anonymous sign-ins are disabled')) {
    return 'Supabase 익명 로그인이 비활성화되어 로컬 저장 모드로 전환되었습니다.';
  }

  if (normalized.includes('jwt')) {
    return 'Supabase 인증 설정 오류로 로컬 저장 모드로 전환되었습니다.';
  }

  return message;
}

function fromDbWrongNote(row: DbWrongNoteRow): PersistedWrongNote {
  return {
    id: row.id,
    examTitle: row.exam_title,
    topic: row.topic,
    stem: row.stem,
    myAnswer: row.my_answer,
    answer: row.answer,
    explanation: row.explanation,
  };
}

export function loadLocalWrongNotes<T extends PersistedWrongNote>() {
  try {
    const raw = window.localStorage.getItem(LOCAL_WRONG_NOTES_KEY);
    if (!raw) {
      return [] as T[];
    }

    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as T[];
  }
}

export function storeLocalWrongNotes(notes: PersistedWrongNote[]) {
  window.localStorage.setItem(LOCAL_WRONG_NOTES_KEY, JSON.stringify(notes));
}

export function loadLocalLastExam<T extends PersistedExamRecord>() {
  try {
    const raw = window.localStorage.getItem(LOCAL_LAST_EXAM_KEY);
    if (!raw) {
      return null as T | null;
    }

    return JSON.parse(raw) as T;
  } catch {
    return null as T | null;
  }
}

export function storeLocalLastExam(exam: PersistedExamRecord) {
  window.localStorage.setItem(LOCAL_LAST_EXAM_KEY, JSON.stringify(exam));
}

export async function ensureSupabaseUser(): Promise<Result<User>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      return { data: null, error: normalizeSupabaseErrorMessage(sessionError) };
    }

    if (session?.user) {
      return { data: session.user, error: null };
    }

    const { data, error } = await supabase.auth.signInAnonymously();
    return {
      data: data.user ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function fetchLatestExamRecord(userId: string): Promise<Result<PersistedExamRecord>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  try {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      data: (data as PersistedExamRecord | null) ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function fetchWrongNotes(userId: string): Promise<Result<PersistedWrongNote[]>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  try {
    const { data, error } = await supabase
      .from('wrong_notes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return {
      data: Array.isArray(data) ? (data as DbWrongNoteRow[]).map(fromDbWrongNote) : null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function saveExamDraft(userId: string, input: SaveExamDraftInput): Promise<Result<PersistedExamRecord>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  try {
    const payload = {
      user_id: userId,
      title: input.title,
      builder_mode: input.builderMode,
      question_type: input.questionType,
      difficulty: input.difficulty,
      exam_format: input.examFormat,
      question_count: input.questionCount,
      source_text: input.sourceText || null,
      question_files: input.questionFiles,
      answer_files: input.answerFiles,
      questions: input.questions,
    };

    const { data, error } = await supabase.from('exam_attempts').insert(payload).select('*').single();

    return {
      data: (data as PersistedExamRecord | null) ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function completeExam(userId: string, input: CompleteExamInput): Promise<Result<PersistedExamRecord>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  try {
    const payload = {
      responses: Object.fromEntries(
        Object.entries(input.responses).map(([key, value]) => [String(key), value]),
      ),
      score: input.score,
      correct_count: input.correctCount,
      wrong_count: input.wrongCount,
      submitted_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('exam_attempts')
      .update(payload)
      .eq('id', input.examId)
      .eq('user_id', userId)
      .select('*')
      .single();

    return {
      data: (data as PersistedExamRecord | null) ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function saveWrongNotes(userId: string, wrongNotes: PersistedWrongNote[]): Promise<Result<PersistedWrongNote[]>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  if (wrongNotes.length === 0) {
    return { data: [], error: null };
  }

  try {
    const payload = wrongNotes.map((note) => ({
      id: note.id,
      user_id: userId,
      exam_title: note.examTitle,
      topic: note.topic,
      stem: note.stem,
      my_answer: note.myAnswer,
      answer: note.answer,
      explanation: note.explanation,
    }));

    const { error } = await supabase.from('wrong_notes').upsert(payload, {
      onConflict: 'id',
      ignoreDuplicates: false,
    });

    if (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }

    return fetchWrongNotes(userId);
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}
