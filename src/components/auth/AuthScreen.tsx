import { useMemo, useState } from 'react';
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'sign_up';
  const needsPassword = mode !== 'reset_password';
  const checks = useMemo(() => getPasswordChecks(password), [password]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage(null);
    setError(null);
  };

  const handleSubmit = async () => {
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

      if (mode === 'sign_up') {
        setMessage('회원가입이 완료되었습니다. 이메일 인증이 켜져 있다면 메일함에서 인증을 마친 뒤 로그인하세요.');
        if (!import.meta.env.VITE_SUPABASE_REQUIRE_EMAIL_VERIFICATION) {
           setTimeout(() => onSuccess(), 1000);
        }
      } else {
        setMessage('로그인되었습니다.');
        setTimeout(() => onSuccess(), 500);
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
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-8 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">ROOT ACCOUNT</p>
            <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight">
              시험 기록, 오답노트, 생성 이력을 계정 기준으로 이어서 사용합니다.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-300">
              로그인 후 생성한 시험과 제출 결과를 저장하고, 다른 기기에서도 같은 계정으로 바로 이어서 사용할 수 있습니다.
            </p>
          </div>

          <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
            <FeatureCard
              title="시험 보관"
              description="생성한 시험 목록과 최근 풀이 상태를 계정과 연결합니다."
            />
            <FeatureCard
              title="오답노트 동기화"
              description="로그인한 사용자 기준으로 오답노트가 누적되고 다시 열람됩니다."
            />
            <FeatureCard
              title="이어서 사용"
              description="다른 브라우저나 기기에서도 같은 계정으로 작업을 이어갈 수 있습니다."
            />
          </div>
        </section>

        <section className="border border-slate-200 bg-white px-6 py-8 sm:px-8">
          <div className="grid grid-cols-3 gap-2">
            <ModeButton active={mode === 'sign_in'} label="로그인" onClick={() => switchMode('sign_in')} />
            <ModeButton active={mode === 'sign_up'} label="회원가입" onClick={() => switchMode('sign_up')} />
            <ModeButton active={mode === 'reset_password'} label="비밀번호 재설정" onClick={() => switchMode('reset_password')} />
          </div>

          <div className="mt-6 space-y-4">
            {isSignUp ? (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">닉네임</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="예: 민지"
                  className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
            ) : null}

            <label className="block">
              <span className="text-sm font-semibold text-slate-700">이메일</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </label>

            {needsPassword ? (
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">비밀번호</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignUp ? '영문+숫자 포함 8자 이상' : '비밀번호 입력'}
                  className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                />
              </label>
            ) : null}

            {isSignUp ? (
              <>
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">비밀번호 확인</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="비밀번호를 다시 입력"
                    className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
                  />
                </label>

                <div className="border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-800">비밀번호 조건</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    <li className={checks.hasMinLength ? 'text-emerald-700' : ''}>8자 이상</li>
                    <li className={checks.hasLetter ? 'text-emerald-700' : ''}>영문 포함</li>
                    <li className={checks.hasNumber ? 'text-emerald-700' : ''}>숫자 포함</li>
                  </ul>
                </div>

                <label className="flex items-start gap-3 border border-slate-200 bg-slate-50 px-4 py-4">
                  <input
                    type="checkbox"
                    checked={agreeToStorage}
                    onChange={(event) => setAgreeToStorage(event.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-sm leading-6 text-slate-600">
                    시험 기록, 오답노트, 계정 프로필이 로그인 계정 기준으로 저장되는 것에 동의합니다.
                  </span>
                </label>
              </>
            ) : null}

            {mode === 'reset_password' ? (
              <p className="text-sm leading-6 text-slate-500">
                입력한 이메일로 비밀번호 재설정 링크를 보냅니다. 메일을 열면 새 비밀번호 설정 화면으로 이동합니다.
              </p>
            ) : null}

            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {!isSupabaseConfigured ? (
              <p className="text-sm text-red-700">
                Supabase 환경변수가 없어 인증을 사용할 수 없습니다. `VITE_SUPABASE_URL`과 `VITE_SUPABASE_PUBLISHABLE_KEY`를 먼저 설정하세요.
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting || !isSupabaseConfigured}
              className="w-full bg-slate-900 px-4 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitLabel}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-3 text-sm font-semibold ${
        active ? 'bg-slate-900 text-white' : 'border border-slate-300 bg-white text-slate-700'
      }`}
    >
      {label}
    </button>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white px-5 py-5">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
