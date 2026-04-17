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
    <div className="px-4 py-10 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-xl border border-slate-200 bg-white px-6 py-8 sm:px-8">
...
          </div>
        </div>
      </div>
    </div>
  );
}
  );
}
