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
    const updateAuthState = (user: any) => {
      if (!user) {
        setSessionUserId(null);
        setIsAnonymous(true);
        setSessionUserEmail(null);
        setSessionDisplayName('사용자');
        setSessionUserAvatar(null);
        setSyncMessage('로컬 저장 모드');
        return;
      }

      setSessionUserId(user.id);
      setIsAnonymous(user.is_anonymous ?? true);
      setSessionUserEmail(user.email ?? null);
      setSessionDisplayName(String(user.user_metadata?.display_name ?? '사용자'));
      setSessionUserAvatar(user.user_metadata?.avatar_url ?? null);
      setSyncMessage('Supabase 세션 연결 완료');
    };

    void (async () => {
      const auth = await ensureSupabaseUser();
      if (auth.data) {
        updateAuthState(auth.data);
      } else {
        setSyncMessage(auth.error ?? '로컬 저장 모드');
      }
    })();

    // 인증 상태 실시간 감지 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        updateAuthState(session.user);
      } else {
        updateAuthState(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
