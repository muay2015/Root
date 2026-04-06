import { useState } from 'react';
import { updatePassword } from '../../lib/rootPersistence';

export function PasswordRecoveryScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setMessage(null);
    setError(null);

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage('비밀번호가 변경되었습니다. 계속 진행하세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-xl border border-slate-200 bg-white px-6 py-8 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">ROOT</p>
        <h1 className="mt-4 text-3xl font-bold">새 비밀번호 설정</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          메일의 재설정 링크로 들어온 상태입니다. 새 비밀번호를 저장한 뒤 계정 화면으로 돌아갑니다.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-semibold text-slate-700">새 비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">새 비밀번호 확인</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
            />
          </label>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
              className="flex-1 bg-slate-900 px-4 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? '저장 중...' : '비밀번호 저장'}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="border border-slate-300 bg-white px-4 py-4 text-sm font-semibold text-slate-700"
            >
              나중에
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
