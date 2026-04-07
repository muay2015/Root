import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Result } from '../types/persistence';
import { normalizeSupabaseErrorMessage } from './serviceUtils';

export const authService = {
  async ensureSupabaseUser(): Promise<Result<User>> {
    if (!supabase) {
      return { data: null, error: 'Supabase 설정이 없어 로컬 저장 모드로 실행 중입니다.' };
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) return { data: null, error: normalizeSupabaseErrorMessage(sessionError) };
      if (session?.user) return { data: session.user, error: null };

      const { data, error } = await supabase.auth.signInAnonymously();
      return {
        data: data.user ?? null,
        error: error ? normalizeSupabaseErrorMessage(error) : null,
      };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async getSignedInUser(): Promise<Result<User>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) return { data: null, error: normalizeSupabaseErrorMessage(error) };
      return { data: session?.user ?? null, error: null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async signUp(email: string, password: string, options?: { displayName?: string }): Promise<Result<User>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: options?.displayName ? { data: { display_name: options.displayName.trim() } } : undefined,
      });
      return { data: data.user ?? null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async signIn(email: string, password: string): Promise<Result<User>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return { data: data.user ?? null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async signOut(): Promise<Result<true>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { error } = await supabase.auth.signOut();
      return { data: error ? null : true, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async requestPasswordReset(email: string): Promise<Result<true>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      return { data: error ? null : true, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async updatePassword(password: string): Promise<Result<true>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { data: error ? null : true, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  },

  async updateDisplayName(displayName: string): Promise<Result<User>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };
    try {
      const { data, error } = await supabase.auth.updateUser({ data: { display_name: displayName.trim() } });
      return { data: data.user ?? null, error: error ? normalizeSupabaseErrorMessage(error) : null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  }
};
