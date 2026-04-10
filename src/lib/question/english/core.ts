import { SubjectKey } from '../subjectConfig';

/**
 * 영어 과목 여부 판별
 */
export function isEnglishSubject(subject: SubjectKey | string | null | undefined): boolean {
  const s = String(subject ?? '').toLowerCase();
  return s.includes('english') || s.includes('영어');
}

/**
 * 영어 평문 텍스트 정제
 */
export function normalizeEnglishPlainText(value: string | null | undefined): string {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<\/?u>/gi, '')
    .replace(/\[\/?u\]/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * 영어 단어 수 계산
 */
export function countEnglishWords(value: string): number {
  return (value.match(/[A-Za-z]+/g) ?? []).length;
}

/**
 * 정규식 이스케이프 유틸리티
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
