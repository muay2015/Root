import React, { useEffect, useState, useRef, ChangeEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { updateDisplayName, updateAvatar } from '../../lib/rootPersistence';

type AccountScreenProps = {
  userId: string | null;
  email: string | null;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  syncMessage: string;
  onDisplayNameChange: (value: string) => void;
  onAvatarChange: (url: string) => void;
  onSignOut: () => void;
};

export function AccountScreen({
  userId,
  email,
  initialDisplayName,
  initialAvatarUrl,
  syncMessage,
  onDisplayNameChange,
  onAvatarChange,
  onSignOut,
}: AccountScreenProps) {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDisplayName(initialDisplayName);
  }, [initialDisplayName]);

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl);
  }, [initialAvatarUrl]);

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

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userId) return;

    // 용량 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('이미지 용량은 2MB를 초과할 수 없습니다.');
      return;
    }

    setMessage(null);
    setError(null);
    setIsUploading(true);
    
    try {
      const result = await updateAvatar(userId, file);
      if (result.error) {
        setError(result.error);
        return;
      }
      
      if (result.data) {
        setAvatarUrl(result.data);
        onAvatarChange(result.data);
        setMessage('프로필 이미지를 변경했습니다.');
      }
    } finally {
      setIsUploading(false);
      // 같은 파일을 다시 선택할 수 있도록 초기화
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-28 pt-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8 shadow-sm">
          <h1 className="text-3xl font-bold">내 계정</h1>
          <p className="mt-2 text-sm text-slate-500">{syncMessage}</p>
        </section>

        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8 shadow-sm">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-slate-700">이메일</p>
              <p className="mt-2 text-sm text-slate-600 font-medium">{email ?? '-'}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">동기화 상태</p>
              <p className="mt-2 text-sm text-slate-600 font-medium">{syncMessage}</p>
            </div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">프로필 설정</h2>
          
          <div className="mt-8 flex flex-col items-center sm:flex-row sm:items-start gap-8">
            {/* 아바타 업로드 영역 */}
            <div className="relative group">
              <div className="h-32 w-32 overflow-hidden rounded-full ring-4 ring-slate-100 bg-gradient-to-tr from-blue-500 to-indigo-500 shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-black text-white">
                    {displayName.charAt(0)}
                  </div>
                )}
                
                {isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-transform hover:scale-110 active:scale-95 disabled:bg-slate-400"
              >
                <Camera className="h-5 w-5" />
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>

            <div className="flex-1 space-y-4 w-full">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">닉네임</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="표시 이름"
                  className="mt-2 w-full border border-slate-300 px-4 py-3 text-sm outline-none transition-all focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                />
              </label>

              {message ? <p className="text-sm text-emerald-700 font-medium">{message}</p> : null}
              {error ? <p className="text-sm text-red-700 font-medium">{error}</p> : null}

              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
                className="w-full sm:w-auto bg-slate-900 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSaving ? '저장 중...' : '정보 업데이트'}
              </button>
            </div>
          </div>
        </section>

        <section className="border border-slate-200 bg-white px-5 py-6 sm:px-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">위험 구역</h2>
          <div className="mt-4">
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100"
            >
              로그아웃
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
