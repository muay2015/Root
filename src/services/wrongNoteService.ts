import { supabase } from '../lib/supabase';
import { PersistedWrongNote, DbWrongNoteRow, Result } from '../types/persistence';
import { normalizeSupabaseErrorMessage } from './serviceUtils';

export function fromDbWrongNote(row: DbWrongNoteRow): PersistedWrongNote {
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

export const wrongNoteService = {
  async fetch(userId: string): Promise<Result<PersistedWrongNote[]>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
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
  },

  async save(userId: string, wrongNotes: PersistedWrongNote[]): Promise<Result<PersistedWrongNote[]>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    if (wrongNotes.length === 0) return { data: [], error: null };

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

      if (error) return { data: null, error: normalizeSupabaseErrorMessage(error) };
      return this.fetch(userId);
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async deleteByTitle(userId: string, examTitle: string): Promise<Result<null>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { error } = await supabase.from('wrong_notes').delete().eq('user_id', userId).eq('exam_title', examTitle);
      return { data: null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  }
};
