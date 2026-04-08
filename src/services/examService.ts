import { supabase } from '../lib/supabase';
import { PersistedExamRecord, SaveExamDraftInput, CompleteExamInput, Result } from '../types/persistence';
import { normalizeSupabaseErrorMessage } from './serviceUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (id: string) => UUID_REGEX.test(id);

export const examService = {
  async fetchRecords(userId: string): Promise<Result<PersistedExamRecord[]>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
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
  },

  async fetchLatest(userId: string): Promise<Result<PersistedExamRecord>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
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
  },

  async saveDraft(userId: string, input: SaveExamDraftInput): Promise<Result<PersistedExamRecord>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
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
        question_files: input.questionFiles || [],
        answer_files: input.answerFiles || [],
        questions: input.questions,
        responses: {},
        score: null,
        correct_count: null,
        wrong_count: null,
        submitted_at: null,
      };
      const { data, error } = await supabase.from('exam_attempts').insert(payload).select('*').single();
      return { data: (data as PersistedExamRecord | null) ?? null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async complete(userId: string, input: CompleteExamInput): Promise<Result<PersistedExamRecord>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const payload = {
        responses: Object.fromEntries(Object.entries(input.responses).map(([k, v]) => [String(k), v])),
        score: input.score,
        correct_count: input.correctCount,
        wrong_count: input.wrongCount,
        submitted_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('exam_attempts').update(payload).eq('id', input.examId).eq('user_id', userId).select('*').single();
      return { data: (data as PersistedExamRecord | null) ?? null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async syncRecords(userId: string, records: PersistedExamRecord[]): Promise<Result<PersistedExamRecord[]>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    if (records.length === 0) return { data: [], error: null };

    const toInsert = records.filter(r => !isValidUuid(r.id)).map(r => ({
      user_id: userId,
      title: r.title,
      builder_mode: r.builder_mode,
      question_type: r.question_type,
      difficulty: r.difficulty,
      exam_format: r.exam_format,
      question_count: r.question_count,
      source_text: r.source_text,
      question_files: r.question_files || [],
      answer_files: r.answer_files || [],
      questions: r.questions,
      responses: r.responses || {},
      score: r.score,
      correct_count: r.correct_count,
      wrong_count: r.wrong_count,
      submitted_at: r.submitted_at,
      created_at: r.created_at,
    }));

    const toUpsert = records.filter(r => isValidUuid(r.id)).map(r => ({
      id: r.id,
      user_id: userId,
      title: r.title,
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

    try {
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase.from('exam_attempts').insert(toInsert);
        if (insertError) return { data: null, error: normalizeSupabaseErrorMessage(insertError) };
      }
      if (toUpsert.length > 0) {
        const { error: upsertError } = await supabase.from('exam_attempts').upsert(toUpsert, { onConflict: 'id' });
        if (upsertError) return { data: null, error: normalizeSupabaseErrorMessage(upsertError) };
      }
      return this.fetchRecords(userId);
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async delete(userId: string, examId: string): Promise<Result<null>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { error } = await supabase.from('exam_attempts').delete().eq('id', examId).eq('user_id', userId);
      return { data: null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async generateAIExam(payload: any): Promise<Result<any>> {
    try {
      const response = await fetch('/api/ai/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { data: null, error: errorData.error || `HTTP error! status: ${response.status}` };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : '네트워크 오류가 발생했습니다.' };
    }
  }
};
