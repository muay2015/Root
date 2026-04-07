import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ensureSupabaseUser } from '../lib/rootPersistence';

export function useAuth() {
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [sessionUserEmail, setSessionUserEmail] = useState<string | null>(null);
  const [sessionDisplayName, setSessionDisplayName] = useState('사용자');
  const [sessionUserAvatar, setSessionUserAvatar] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState('Supabase 연결 상태 확인 중...');

  useEffect(() => {
    void (async () => {
      const auth = await ensureSupabaseUser();
      if (!auth.data) {
        setSyncMessage(auth.error ?? '로컬 저장 모드');
        return;
      }

      setSessionUserId(auth.data.id);
      setIsAnonymous(auth.data.is_anonymous ?? true);
      setSessionUserEmail(auth.data.email ?? null);
      setSessionDisplayName(String(auth.data.user_metadata?.display_name ?? '사용자'));
      setSessionUserAvatar(auth.data.user_metadata?.avatar_url ?? null);
      setSyncMessage('Supabase 세션 연결 완료');
    })();
  }, []);

  const handleSignOut = async () => {
    try {
      setSyncMessage('로그아웃 중...');
      await supabase.auth.signOut();
      
      setSessionUserId(null);
      setSessionUserEmail('');
      setSessionDisplayName('사용자');
      setSessionUserAvatar(null);
      setIsAnonymous(true);
      
      setSyncMessage('로그아웃 완료');
      setTimeout(() => window.location.reload(), 500);
    } catch (err) {
      console.error('로그아웃 실패:', err);
      window.location.reload();
    }
  };

  return {
    sessionUserId,
    isAnonymous,
    sessionUserEmail,
    sessionDisplayName,
    sessionUserAvatar,
    syncMessage,
    setSyncMessage,
    setSessionDisplayName,
    setSessionUserAvatar,
    handleSignOut,
  };
}
