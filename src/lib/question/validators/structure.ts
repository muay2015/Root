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
  
  const numericAnswerIndex = parseAnswerChoiceIndex(answerWithoutLeadingLabel);
  const normalizedAnswer =
    numericAnswerIndex !== null
      ? normalizeText(choices[numericAnswerIndex] ?? '')
      : normalizeText(answerWithoutLeadingLabel);
  
  const answerMatches = choices.filter(
    (choice) => normalizeText(choice) === normalizedAnswer,
  ).length;

  const finalAnswerMatches =
    answerMatches === 1 ? answerMatches : countAnswerMatches(question.answer, choices);

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
