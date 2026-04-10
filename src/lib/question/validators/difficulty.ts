import type { DifficultyLevel } from '../generationRules.ts';
import { usesNoSelector } from '../subjectConfig.ts';
import type { GeneratedQuestionDraft, ValidationInput } from './types.ts';
import { 
  pushReason, 
  tokenize, 
  countWords, 
  countKoreanCharacters 
} from './utils.ts';

/**
 * 일반적인 난이도 규칙을 검증합니다.
 */
export function validateGenericDifficulty(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  const difficulty = input.difficulty;
  const stemWords = countWords(question.stem);
  const stemKoreanChars = countKoreanCharacters(question.stem);
  const explanationWords = countWords(question.explanation);
  const directCuePattern = /\bwhat is stated|which is true|directly\b|다음 중 옳은 것|맞는 것/i;
  
  // 과목 분류 확인 (영어 여부)
  const isEnglish = String(input.subject).toLowerCase().includes('english');

  if (difficulty === 'easy' && stemWords > 24) {
    warnings.push(
      `Question ${index}: easy difficulty stem is longer than expected.`,
    );
  }

  if (difficulty === 'hard') {
    // [FIX] 영어 과목의 경우 표준 발문이 짧으므로 길이 검증을 완화하거나 건너뜁니다.
    if (!isEnglish) {
      if (stemWords < 8 && stemKoreanChars < 18) {
        pushReason(
          reasons,
          issueCounts,
          'hard_too_short',
          `Question ${index}: hard difficulty stem is too short for deep reasoning.`,
        );
      }
    }

    if (directCuePattern.test(question.stem)) {
      pushReason(
        reasons,
        issueCounts,
        'hard_too_direct',
        `Question ${index}: hard difficulty question is too direct.`,
      );
    }
    if (explanationWords < 5) {
      pushReason(
        reasons,
        issueCounts,
        'hard_explanation',
        `Question ${index}: hard difficulty explanation is too thin.`,
      );
    }
  }
}

/**
 * 문항이 요청된 제목과 주제를 반영하는지 검증합니다.
 */
export function validateTopicReflection(
  question: GeneratedQuestionDraft,
  index: number,
  title: string | undefined,
  topic: string | undefined,
  warnings: string[],
) {
  const text = `${question.topic} ${question.stem} ${question.explanation}`.toLowerCase();
  const titleTokens = tokenize(title ?? '');
  const topicTokens = tokenize(topic ?? '');

  if (titleTokens.length > 0 && !titleTokens.some((token) => text.includes(token))) {
    warnings.push(
      `Question ${index}: title reflection is weak (expected keywords from "${title}").`,
    );
  }

  if (topicTokens.length > 0 && !topicTokens.some((token) => text.includes(token))) {
    warnings.push(
      `Question ${index}: topic reflection is weak (expected keywords from "${topic}").`,
    );
  }
}

/**
 * 선택된 문항 유형이나 형식이 반영되었는지 검증합니다.
 */
export function validateSelectionReflection(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  warnings: string[],
) {
  if (usesNoSelector(input.subject)) {
    return;
  }

  const selectionValue =
    String(input.subject) === 'social' ? input.format : input.questionType;
  if (!selectionValue || selectionValue === '전체') {
    return;
  }

  const text = `${question.topic} ${question.stem} ${question.explanation}`.toLowerCase();
  const tokens = tokenize(selectionValue);
  const subject = String(input.subject);

  // 사회나 과학 과목은 유연하게 처리
  if (
    subject === 'social' ||
    subject.includes('social_') ||
    subject === 'science'
  ) {
    return;
  }

  if (tokens.length > 0 && !tokens.some((token) => text.includes(token))) {
    warnings.push(
      `Question ${index}: selected ${
        subject === 'social' ? 'format' : 'question type'
      } is weakly reflected.`,
    );
  }
}
