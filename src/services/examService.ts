import { supabase } from '../lib/supabase';
import { PersistedExamRecord, SaveExamDraftInput, CompleteExamInput, Result } from '../types/persistence';
import { normalizeSupabaseErrorMessage } from './serviceUtils';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (id: string) => UUID_REGEX.test(id);
const API_BASE_URL = 'http://127.0.0.1:8787';

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
        subject: input.subject,
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
      subject: r.subject,
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
  },

  async extractFromPdf(payload: {
    questionText: string;
    answerText: string;
    subject: string;
    examTitle?: string;
  }): Promise<Result<any>> {
    // OpenAI Vision 연동
    if (payload.questionText.startsWith('IMAGE_DATA:')) {
      const imageData = payload.questionText.replace('IMAGE_DATA:', '');
      const mimeMatch = imageData.match(/^data:(image\/[\w+]+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      try {
        const response = await fetch(`${API_BASE_URL}/api/ai/segment-exam`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: {
              mimeType,
              data: imageData
            },
            subject: payload.subject
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || errorData.error || 'AI 세그멘테이션 실패');
        }

        const result = await response.json();

        console.log('[examService] segment-exam 응답:', JSON.stringify(result).slice(0, 300));

        if (!result.questions || result.questions.length === 0) {
          const details = result.details || result.error || '빈 응답';
          return { data: null, error: `GPT-4o 응답에 문항 없음: ${details}` };
        }

        // 각 문항에 원본 이미지 URL 주입
        result.questions = result.questions.map((q: any) => ({
          ...q,
          image_url: imageData
        }));

        return {
          data: result,
          error: null
        };
      } catch (err: any) {
        console.error('[examService] segment-exam 오류:', err);
        return { data: null, error: err.message || 'AI 서비스 연결 실패' };
      }
    }

    return { data: null, error: '지원하지 않는 문항 추출 방식입니다.' };
  }
};
