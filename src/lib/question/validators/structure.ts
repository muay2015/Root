import { 
  countAnswerMatches, 
  resolveAnswerFromChoices, 
  normalizeAnswerComparison 
} from '../answerMatching.ts';
import type { GeneratedQuestionDraft } from './types.ts';
import { pushReason, normalizeText, parseAnswerChoiceIndex } from './utils.ts';

/**
 * 문항의 기본적인 구조(선지 수, 비어있는 필드, 정답 부합 여부 등)를 검증합니다.
 */
export function validateStructure(
  question: GeneratedQuestionDraft,
  index: number,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const choices = Array.isArray(question.choices)
    ? question.choices.map((choice) => String(choice ?? ''))
    : [];

  // 1. 선지 개수 검증 (5지선다 기준)
  if (choices.length !== 5) {
    pushReason(
      reasons,
      issueCounts,
      'choice_count',
      `Question ${index}: choices must contain exactly 5 options.`,
    );
  }

  // 2. 빈 선지 검증
  if (choices.some((choice) => choice.trim().length === 0)) {
    pushReason(
      reasons,
      issueCounts,
      'empty_choice',
      `Question ${index}: every choice must be non-empty.`,
    );
  }

  // 3. 임시 텍스트/플레이스홀더 검증
  const placeholderRegex = /^(?:choice|option|\ubcf4\uae30|\uc120\ud0dd\uc9c0)\s*\d+$/iu;
  const commonPlaceholders = ['placeholder', '...', '-', 'tbd'];

  if (
    choices.length > 0 &&
    choices.some((choice) => {
      const c = choice.trim().toLowerCase();
      return placeholderRegex.test(c) || commonPlaceholders.includes(c);
    })
  ) {
    pushReason(
      reasons,
      issueCounts,
      'placeholder_choice',
      `Question ${index}: choices contain placeholder or empty text.`,
    );
  }

  // 4. 정답 매칭 검증
  const answerWithoutLeadingLabel = question.answer
    .replace(/^(?:answer|correct answer)\s*[:\-]?\s*/i, '')
    .replace(/^(?:정답|답)\s*[:：\-]?\s*/u, '')
    .trim();

  // 중복 선지 감지: 정규화 후 동일한 값이 2개 이상인 경우
  const normalizedChoiceValues = choices.map((c) => normalizeText(c));
  const seenNormalized = new Set<string>();
  const hasDuplicateChoices = normalizedChoiceValues.some((v) => {
    if (!v) return false;
    if (seenNormalized.has(v)) return true;
    seenNormalized.add(v);
    return false;
  });

  if (hasDuplicateChoices) {
    pushReason(
      reasons,
      issueCounts,
      'duplicate_choice',
      `Question ${index}: choices contain duplicate values after normalization (e.g. "1" and "\\(1\\)" are equivalent).`,
    );
  }

  // 직접 텍스트 매칭 우선: 정답 텍스트가 선지와 1:1 일치하면 인덱스 해석을 건너뜀
  // (수학 문항에서 answer "1"이 "choice #1"이 아닌 값 "1"인 경우 오판 방지)
  const directNormalized = normalizeText(answerWithoutLeadingLabel);
  const directMatches = directNormalized
    ? choices.filter((choice) => normalizeText(choice) === directNormalized).length
    : 0;

  let finalAnswerMatches: number;
  if (directMatches === 1) {
    finalAnswerMatches = 1;
  } else if (directMatches > 1 && hasDuplicateChoices) {
    // 중복 선지 때문에 매칭이 2개 이상인 경우: 정답 자체는 유효하므로 통과
    // (duplicate_choice 에러가 이미 위에서 등록되어 재시도를 유도함)
    finalAnswerMatches = 1;
  } else {
    const numericAnswerIndex = parseAnswerChoiceIndex(answerWithoutLeadingLabel);
    const normalizedAnswer =
      numericAnswerIndex !== null
        ? normalizeText(choices[numericAnswerIndex] ?? '')
        : directNormalized;

    const answerMatches = choices.filter(
      (choice) => normalizeText(choice) === normalizedAnswer,
    ).length;

    finalAnswerMatches =
      answerMatches === 1 ? answerMatches : countAnswerMatches(question.answer, choices);
  }

  if (finalAnswerMatches !== 1) {
    pushReason(
      reasons,
      issueCounts,
      'answer_match',
      `Question ${index}: answer must match exactly one choice. (Matches: ${finalAnswerMatches}; Answer: "${question.answer}")`,
    );
  }

  // 5. 발문 길이 기초 검증 (최소 8자)
  if (String(question.stem ?? '').trim().length < 8) {
    pushReason(
      reasons,
      issueCounts,
      'empty_stem',
      `Question ${index}: stem is too short or missing.`,
    );
  }

  // 6. 해설 길이 기초 검증 (최소 12자)
  if (String(question.explanation ?? '').trim().length < 12) {
    pushReason(
      reasons,
      issueCounts,
      'explanation',
      `Question ${index}: explanation is too weak or missing.`,
    );
  }
}
