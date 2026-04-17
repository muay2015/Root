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
    <div className="px-4 pb-28 pt-4 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
...
        </section>
      </div>
    </div>
  );
}
  );
}
