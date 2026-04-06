import { useEffect, useState } from 'react';
import { updateDisplayName } from '../../lib/rootPersistence';

type AccountScreenProps = {
  email: string | null;
  initialDisplayName: string;
  syncMessage: string;
  onDisplayNameChange: (value: string) => void;
};

export function AccountScreen({
  email,
  initialDisplayName,
  syncMessage,
  onDisplayNameChange,
}: AccountScreenProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  const handleSave = async () => {
    setMessage(null);
    setError(null);

    if (!displayName.trim()) {
      setError('닉네임을 입력하세요.');
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateDisplayName(displayName);
      if (result.error) {
        setError(result.error);
        return;
      }

      const nextDisplayName = String(result.data?.user_metadata?.display_name ?? displayName.trim());
      setDisplayName(nextDisplayName);
      onDisplayNameChange(nextDisplayName);
      setMessage('닉네임을 저장했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h1 className="text-3xl font-bold">내 계정</h1>
          <p className="mt-2 text-sm text-slate-500">{syncMessage}</p>
        </section>

        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">이메일</p>
              <p className="mt-2 text-sm text-slate-600">{email ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">동기화 상태</p>
              <p className="mt-2 text-sm text-slate-600">{syncMessage}</p>
            </div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8">
          <h2 className="text-lg font-semibold text-slate-900">프로필</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">닉네임</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="표시 이름"
                className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-900"
              />
            </label>

            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}

            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="bg-slate-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSaving ? '저장 중...' : '닉네임 저장'}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
