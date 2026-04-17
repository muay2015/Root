import { useMemo, useState, useEffect } from 'react';
import type React from 'react';
import { Mail, Lock, User, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { requestPasswordReset, signInWithEmail, signUpWithEmail } from '../../lib/rootPersistence';
import { isSupabaseConfigured } from '../../lib/supabase';

type AuthMode = 'sign_in' | 'sign_up' | 'reset_password';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getPasswordChecks(password: string) {
  return {
    hasLetter: /[A-Za-z]/.test(password),
    hasMinLength: password.length >= 8,
    hasNumber: /\d/.test(password),
  };
}

export function AuthScreen({ onSuccess = () => window.location.reload() }: { onSuccess?: () => void } = {}) {
  const [mode, setMode] = useState<AuthMode>('sign_in');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToStorage, setAgreeToStorage] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('root_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const isSignUp = mode === 'sign_up';
  const needsPassword = mode !== 'reset_password';
  const checks = useMemo(() => getPasswordChecks(password), [password]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMessage(null);
    setError(null);

    const normalizedEmail = email.trim();
    const normalizedDisplayName = displayName.trim();

    if (!normalizedEmail) {
      setError('이메일을 입력하세요.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('올바른 이메일 형식을 입력하세요.');
      return;
    }

    if (isSignUp && !normalizedDisplayName) {
      setError('닉네임을 입력하세요.');
      return;
    }

    if (needsPassword && !password) {
      setError('비밀번호를 입력하세요.');
      return;
    }

    if (needsPassword && !checks.hasMinLength) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (isSignUp && (!checks.hasLetter || !checks.hasNumber)) {
      setError('비밀번호는 영문과 숫자를 각각 1자 이상 포함해야 합니다.');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    if (isSignUp && !agreeToStorage) {
      setError('데이터 저장 안내에 동의해야 회원가입할 수 있습니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'reset_password') {
        const result = await requestPasswordReset(normalizedEmail);
        if (result.error) {
          setError(result.error);
          return;
        }

        setMessage('비밀번호 재설정 메일을 보냈습니다. 메일함에서 링크를 열어 새 비밀번호를 설정하세요.');
        return;
      }

      const result = mode === 'sign_in'
        ? await signInWithEmail(normalizedEmail, password)
        : await signUpWithEmail(normalizedEmail, password, {
            displayName: normalizedDisplayName,
          });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (mode === 'sign_in') {
        if (rememberEmail) {
          localStorage.setItem('root_saved_email', normalizedEmail);
        } else {
          localStorage.removeItem('root_saved_email');
        }
      }

      if (mode === 'sign_up') {
        setMessage('회원가입이 완료되었습니다. 이메일 인증이 켜져 있다면 메일함에서 인증을 마친 뒤 로그인하세요.');
        if (!import.meta.env.VITE_SUPABASE_REQUIRE_EMAIL_VERIFICATION) {
           setTimeout(() => onSuccess(), 1000);
        }
      } else {
        setMessage('로그인되었습니다. 대시보드로 이동합니다.');
        setTimeout(() => onSuccess(), 800);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitLabel = isSubmitting
    ? '처리 중...'
    : mode === 'sign_in'
      ? '로그인'
      : mode === 'sign_up'
        ? '회원가입 완료'
        : '재설정 메일 보내기';

  return (
    <div className="px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-lg">
        {/* Auth Card */}
        <div className="premium-card overflow-hidden transition-all duration-500 shadow-2xl shadow-slate-200/50">
          {/* Header/Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1">
            <ModeTab active={mode === 'sign_in'} label="로그인" onClick={() => switchMode('sign_in')} />
            <ModeTab active={mode === 'sign_up'} label="회원가입" onClick={() => switchMode('sign_up')} />
            <ModeTab active={mode === 'reset_password'} label="비번 재설정" onClick={() => switchMode('reset_password')} />
          </div>

          <div className="px-6 py-10 sm:px-10">
            <div className="mb-8 text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                {mode === 'sign_in' ? '반가워요!' : mode === 'sign_up' ? '시작해볼까요?' : '비밀번호 찾기'}
              </h2>
              <p className="mt-2 text-slate-500">
                {mode === 'sign_in' 
                  ? '내 계정으로 로그인하여 학습 기록을 관리하세요.' 
                  : mode === 'sign_up' 
                    ? '풀고 AI와 함께 지능형 학습을 시작하세요.'
                    : '가입하신 이메일을 입력하시면 재설정 링크를 보내드립니다.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isSignUp ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">닉네임</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="칭찬받고 싶은 이름 (예: 민지)"
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 ml-1">이메일</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"
                  />
                </div>
              </div>

              {needsPassword ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 ml-1">비밀번호</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignUp ? '영문+숫자 포함 8자 이상' : '비밀번호를 입력하세요'}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"
                    />
                  </div>
                </div>
              ) : null}

              {mode === 'sign_in' && (
                <div className="flex items-center justify-between px-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">아이디 저장</span>
                  </label>
                </div>
              )}

              {isSignUp ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700 ml-1">비밀번호 확인</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="비밀번호를 한 번 더 입력하세요"
                        autoComplete="new-password"
                        className="w-full rounded-2xl bg-slate-50 border border-slate-200 pl-11 pr-4 py-3.5 text-sm transition-all focus:bg-white focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-indigo-50/50 border border-indigo-100/50 p-4 mt-2">
                    <div className="flex items-center gap-2 mb-3 text-indigo-900 font-bold text-sm">
                      <CheckCircle2 className="h-4 w-4" />
                      보안 조건 확인
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <PasswordCheckItem fulfilled={checks.hasMinLength} label="8자 이상" />
                      <PasswordCheckItem fulfilled={checks.hasLetter} label="영문 포함" />
                      <PasswordCheckItem fulfilled={checks.hasNumber} label="숫자 포함" />
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-4 cursor-pointer group transition-colors hover:bg-white hover:border-slate-200">
                    <input
                      type="checkbox"
                      checked={agreeToStorage}
                      onChange={(e) => setAgreeToStorage(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                    />
                    <span className="text-xs sm:text-sm leading-5 text-slate-600 group-hover:text-slate-900 transition-colors">
                      시험 기록, 오답노트, 프로필이 안전하게 동기화되는 것에 동의합니다.
                    </span>
                  </label>
                </>
              ) : null}

              {/* Status Messages */}
              {message && (
                <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
                  {message}
                </div>
              )}
              {error && (
                <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  {error}
                </div>
              )}
              {!isSupabaseConfigured && (
                <div className="flex items-center gap-3 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-800">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  서버 연결 설정이 필요합니다. 관리자에게 문의하세요.
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
                className="group relative w-full overflow-hidden rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-xl shadow-slate-200 transition-all hover:bg-slate-800 hover:-translate-y-1 active:translate-y-0 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {submitLabel}
                  {!isSubmitting && <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />}
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

function ModeTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 py-3.5 text-sm font-bold transition-all rounded-xl ${
        active 
          ? 'bg-white text-slate-900 shadow-sm' 
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      {active && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary" />
      )}
    </button>
  );
}

function PasswordCheckItem({ fulfilled, label }: { fulfilled: boolean; label: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all duration-300 ${
      fulfilled 
        ? 'bg-emerald-500 text-white border-emerald-500' 
        : 'bg-white text-slate-400 border-slate-100'
    }`}>
      <CheckCircle2 className={`h-3 w-3 ${fulfilled ? 'text-white' : 'text-slate-200'}`} />
      {label}
    </div>
  );
}
