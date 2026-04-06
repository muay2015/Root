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
  subject: string;
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
const LOCAL_EXAM_LIST_KEY = 'root:exam-list';

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

export function loadLocalExamList<T extends PersistedExamRecord>() {
  try {
    const raw = window.localStorage.getItem(LOCAL_EXAM_LIST_KEY);
    if (!raw) {
      return [] as T[];
    }

    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [] as T[];
  }
}

export function storeLocalExamList(exams: PersistedExamRecord[]) {
  window.localStorage.setItem(LOCAL_EXAM_LIST_KEY, JSON.stringify(exams));
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

export async function getSignedInUser(): Promise<Result<User>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }

    return { data: session?.user ?? null, error: null };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  options?: { displayName?: string },
): Promise<Result<User>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: options?.displayName
        ? {
            data: {
              display_name: options.displayName.trim(),
            },
          }
        : undefined,
    });

    return {
      data: data.user ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<Result<User>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    return {
      data: data.user ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function signOutUser(): Promise<Result<true>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { error } = await supabase.auth.signOut();

    return {
      data: error ? null : true,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function requestPasswordReset(email: string): Promise<Result<true>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const redirectTo = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

    return {
      data: error ? null : true,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function updatePassword(password: string): Promise<Result<true>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { error } = await supabase.auth.updateUser({ password });
    return {
      data: error ? null : true,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function updateDisplayName(displayName: string): Promise<Result<User>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase.auth.updateUser({
      data: {
        display_name: displayName.trim(),
      },
    });

    return {
      data: data.user ?? null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}

export async function fetchExamRecords(userId: string): Promise<Result<PersistedExamRecord[]>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  try {
    const { data, error } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return {
      data: Array.isArray(data) ? (data as PersistedExamRecord[]) : null,
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
      subject: input.subject,
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
export async function deleteWrongNotesByTitle(userId: string, examTitle: string): Promise<Result<null>> {
  if (!supabase) {
    return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
  }

  try {
    const { error } = await supabase
      .from('wrong_notes')
      .delete()
      .eq('user_id', userId)
      .eq('exam_title', examTitle);

    return {
      data: null,
      error: error ? normalizeSupabaseErrorMessage(error) : null,
    };
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}
export async function saveExamRecords(userId: string, records: PersistedExamRecord[]): Promise<Result<PersistedExamRecord[]>> {
  if (!supabase) {
    return { data: null, error: 'Supabase is not configured.' };
  }

  if (records.length === 0) return { data: [], error: null };

  try {
    const payload = records.map(r => ({
      id: r.id,
      user_id: userId,
      title: r.title,
      subject: r.subject,
      builder_mode: r.builder_mode,
      question_type: r.question_type,
      difficulty: r.difficulty,
      exam_format: r.exam_format,
      question_count: r.question_count,
      source_text: r.source_text,
      question_files: r.question_files,
      answer_files: r.answer_files,
      questions: r.questions,
      responses: r.responses,
      score: r.score,
      correct_count: r.correct_count,
      wrong_count: r.wrong_count,
      submitted_at: r.submitted_at,
      created_at: r.created_at
    }));

    const { error } = await supabase.from('exam_attempts').upsert(payload, {
      onConflict: 'id',
    });

    if (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }

    return fetchExamRecords(userId);
  } catch (error) {
    return { data: null, error: normalizeSupabaseErrorMessage(error) };
  }
}
