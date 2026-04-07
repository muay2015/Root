export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

export function normalizeSupabaseErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();

  if (normalized.includes('invalid api key')) {
    return 'Supabase 설정 오류로 로컬 저장 모드로 전환되었습니다.';
  }

  if (normalized.includes('anonymous sign-ins are disabled')) {
    return 'Supabase 익명 로그인이 비활성화되어 로컬 저장 모드로 전환되었습니다.';
  }

  if (normalized.includes('jwt')) {
    return 'Supabase 인증 설정 오류로 로컬 저장 모드로 전환되었습니다.';
  }

  return message;
}
