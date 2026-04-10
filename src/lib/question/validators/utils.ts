import { normalizeAnswerComparison } from '../answerMatching.ts';

/**
 * 에러 사유를 기록하고 이슈 카운트를 증가시킵니다.
 */
export function pushReason(
  reasons: string[],
  issueCounts: Record<string, number>,
  key: string,
  message: string,
) {
  reasons.push(message);
  issueCounts[key] = (issueCounts[key] ?? 0) + 1;
}

/**
 * 텍스트를 토큰화합니다 (2글자 이상의 한글/영어/숫자).
 */
export function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9\u3131-\u314e\uac00-\ud7a3]+/u)
    .filter((token) => token.length >= 2);
}

/**
 * 단어 수를 계산합니다.
 */
export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * 한글 문자 수를 계산합니다.
 */
export function countKoreanCharacters(value: string) {
  return (value.match(/[\u3131-\u314e\uac00-\ud7a3]/gu) ?? []).length;
}

/**
 * 텍스트를 일관되게 정규화합니다.
 */
export function normalizeText(value: string) {
  return normalizeAnswerComparison(value);
}

/**
 * 알파벳 형식의 정답 인덱스를 파싱합니다 (A-E -> 0-4).
 */
export function parseLetterChoiceIndex(value: string): number | null {
  const compact = value.trim().toUpperCase();
  const match = compact.match(/^(?:ANSWER[:\s]*)?([A-E])(?:[.)])?$/);
  if (!match) return null;
  return match[1].charCodeAt(0) - 65;
}

/**
 * 다양한 형식의 정답(번호, 원문자, 알파벳)을 인덱스로 파싱합니다.
 */
export function parseAnswerChoiceIndex(value: string): number | null {
  const compact = value.trim().replace(/\s+/g, '');
  const circledDigitMap: Record<string, number> = {
    '①': 0, '②': 1, '③': 2, '④': 3, '⑤': 4,
  };

  if (compact in circledDigitMap) {
    return circledDigitMap[compact];
  }

  if (/^[1-5][.)]?$/.test(compact)) {
    return Number.parseInt(compact[0], 10) - 1;
  }

  const labeledDigit = compact.match(/^(?:[^0-9]*:)?[^0-9]*([1-5])(?:번|번이다|번임|번정답|번이정답)?$/u);
  if (labeledDigit) {
    return Number.parseInt(labeledDigit[1], 10) - 1;
  }

  return parseLetterChoiceIndex(compact);
}
