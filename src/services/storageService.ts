import { supabase } from '../lib/supabase';
import { Result } from '../types/persistence';
import { normalizeSupabaseErrorMessage } from './serviceUtils';

export const storageService = {
  async updateAvatar(userId: string, file: File): Promise<Result<string>> {
    if (!supabase) return { data: null, error: 'Supabase is not configured.' };

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `public/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        if (uploadError.message.includes('bucket not found')) {
          return { data: null, error: '아바타 저장소(bucket: avatars)가 설정되지 않았습니다. 관리자에게 문의하세요.' };
        }
        return { data: null, error: normalizeSupabaseErrorMessage(uploadError) };
      }

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) return { data: null, error: normalizeSupabaseErrorMessage(updateError) };
      return { data: publicUrl, error: null };
    } catch (error) {
      return { data: null, error: normalizeSupabaseErrorMessage(error) };
    }
  }
};
