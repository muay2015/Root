import { difficultyRules, schoolLevelRules, type DifficultyLevel, type SchoolLevel } from './generationRules.ts';
import { usesNoSelector, type SubjectKey } from './subjectConfig.ts';

export type GeneratedQuestionDraft = {
  topic: string;
  type: string;
  stem: string;
  choices?: string[] | null;
  answer: string;
  explanation: string;
};

export type ValidationResult = {
  isValid: boolean;
  reasons: string[];
  warnings: string[];
  issueCounts: Record<string, number>;
};

export type ValidationInput = {
  questions: GeneratedQuestionDraft[];
  count: number;
  subject: SubjectKey;
  questionType?: string;
  format?: string;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  title?: string;
  topic?: string;
};

function pushReason(
  reasons: string[],
  issueCounts: Record<string, number>,
  key: string,
  message: string,
) {
  reasons.push(message);
  issueCounts[key] = (issueCounts[key] ?? 0) + 1;
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9가-힣]+/)
    .filter((token) => token.length >= 2);
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase();
}

function validateStructure(
  question: GeneratedQuestionDraft,
  index: number,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const choices = Array.isArray(question.choices) ? question.choices : [];
  if (choices.length !== 5) {
    pushReason(reasons, issueCounts, 'choice_count', `Question ${index}: choices must contain exactly 5 options.`);
  }

  if (choices.some((choice) => choice.trim().length === 0)) {
    pushReason(reasons, issueCounts, 'empty_choice', `Question ${index}: every choice must be non-empty.`);
  }

  if (choices.length > 0 && choices.every((choice) => /^choice\s+\d+$/i.test(choice.trim()))) {
    pushReason(reasons, issueCounts, 'placeholder_choice', `Question ${index}: choices are still placeholder text.`);
  }

  const answerMatches = choices.filter((choice) => choice.trim() === question.answer.trim()).length;
  if (answerMatches !== 1) {
    pushReason(reasons, issueCounts, 'answer_match', `Question ${index}: answer must match exactly one choice.`);
  }

  if (question.stem.trim().length < 8) {
    pushReason(reasons, issueCounts, 'empty_stem', `Question ${index}: stem is too short or missing.`);
  }

  if (question.explanation.trim().length < 12) {
    pushReason(reasons, issueCounts, 'explanation', `Question ${index}: explanation is too weak or missing.`);
  }
}

function validateGenericDifficulty(
  question: GeneratedQuestionDraft,
  index: number,
  difficulty: DifficultyLevel,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  const stemWords = countWords(question.stem);
  const explanationWords = countWords(question.explanation);
  const directCuePattern = /\bwhat is stated|which is true|directly\b|다음 중 옳은 것은|맞는 것은/i;

  if (difficulty === 'easy' && stemWords > 24) {
    warnings.push(`Question ${index}: easy difficulty stem is longer than expected.`);
  }

  if (difficulty === 'hard') {
    if (stemWords < 12) {
      pushReason(reasons, issueCounts, 'hard_too_short', `Question ${index}: hard difficulty stem is too short for deep reasoning.`);
    }
    if (directCuePattern.test(question.stem)) {
      pushReason(reasons, issueCounts, 'hard_too_direct', `Question ${index}: hard difficulty question is too direct.`);
    }
    if (explanationWords < 10) {
      pushReason(reasons, issueCounts, 'hard_explanation', `Question ${index}: hard difficulty explanation is too thin.`);
    }
  }
}

function validateHistoryDifficulty(
  question: GeneratedQuestionDraft,
  index: number,
  difficulty: DifficultyLevel,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  if (difficulty !== 'hard') {
    if (difficulty === 'medium' && countWords(question.stem) < 8) {
      warnings.push(`Question ${index}: medium history item may be too short.`);
    }
    return;
  }

  const normalizedStem = normalizeText(question.stem);
  const normalizedAnswer = normalizeText(question.answer);
  const directHistoryPatterns = [
    /관련 있는 인물/,
    /8조법에 해당하는 것은/,
    /벽화가 남아 있는 고분/,
    /골품제에 대한 설명/,
  ];

  if (directHistoryPatterns.some((pattern) => pattern.test(question.stem))) {
    pushReason(reasons, issueCounts, 'history_hard_direct', `Question ${index}: hard history item is too direct.`);
  }

  if (normalizedAnswer.length >= 8 && normalizedStem.includes(normalizedAnswer)) {
    pushReason(reasons, issueCounts, 'history_hard_overlap', `Question ${index}: hard history answer is too directly exposed in the stem.`);
  }

  const choices = question.choices ?? [];
  const averageLength = choices.length > 0
    ? choices.reduce((sum, choice) => sum + choice.length, 0) / choices.length
    : 0;
  if (averageLength > 0 && question.answer.length > averageLength * 1.9) {
    pushReason(reasons, issueCounts, 'history_hard_distractor', `Question ${index}: hard history distractors are too weak compared with the answer.`);
  }

  const reasoningMarkers = ['사료', '자료', '비교', '원인', '결과', '추론', '시기', '시대', '정책'];
  if (!reasoningMarkers.some((marker) => question.stem.includes(marker))) {
    warnings.push(`Question ${index}: hard history item may still lean too much toward recall.`);
  }
}

function validateTopicReflection(
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
    warnings.push(`Question ${index}: title reflection is too weak.`);
  }

  if (topicTokens.length > 0 && !topicTokens.some((token) => text.includes(token))) {
    warnings.push(`Question ${index}: topic reflection is too weak.`);
  }
}

function validateSelectionReflection(
  question: GeneratedQuestionDraft,
  index: number,
  input: ValidationInput,
  warnings: string[],
) {
  if (usesNoSelector(input.subject)) {
    return;
  }

  const selectionValue = input.subject === 'social' ? input.format : input.questionType;
  if (!selectionValue || selectionValue === '전체') {
    return;
  }

  const text = `${question.topic} ${question.stem}`.toLowerCase();
  const tokens = tokenize(selectionValue);
  if (tokens.length > 0 && !tokens.some((token) => text.includes(token))) {
    warnings.push(`Question ${index}: selected ${input.subject === 'social' ? 'format' : 'question type'} is weakly reflected.`);
  }
}

function validateHistorySubjectFit(
  question: GeneratedQuestionDraft,
  index: number,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  const text = `${question.topic} ${question.stem} ${question.choices?.join(' ') ?? ''} ${question.explanation}`.toLowerCase();
  const historyMarkers = ['조선', '고려', '신라', '백제', '고구려', '대한제국', '경국대전', '인조', '세종', '성종', '사료', '정책', '개혁', '통일 신라', '고조선'];
  const offTopicMarkers = ['exercise', 'fitness', 'health', 'walking', 'stairs', 'athlete', 'main idea', 'best title', 'author'];
  const koreanCount = (text.match(/[가-힣]{2,}/g) ?? []).length;
  const englishCount = (text.match(/[a-z]{4,}/g) ?? []).length;

  if (englishCount > koreanCount * 2) {
    pushReason(reasons, issueCounts, 'history_language', `Question ${index}: history output is in the wrong language.`);
  }

  if (!historyMarkers.some((marker) => text.includes(marker.toLowerCase()))) {
    warnings.push(`Question ${index}: history scope is weakly reflected.`);
  }

  if (offTopicMarkers.some((marker) => text.includes(marker))) {
    pushReason(reasons, issueCounts, 'history_scope', `Question ${index}: history item drifted into unrelated topic content.`);
  }
}

export function validateGeneratedQuestions(input: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const issueCounts: Record<string, number> = {};

  if (input.questions.length !== input.count) {
    pushReason(reasons, issueCounts, 'question_count', `Expected ${input.count} questions but received ${input.questions.length}.`);
  }

  input.questions.forEach((question, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1;
    validateStructure(question, index, reasons, issueCounts);
    validateTopicReflection(question, index, input.title, input.topic, warnings);
    validateSelectionReflection(question, index, input, warnings);

    if (input.subject === 'korean_history') {
      validateHistoryDifficulty(question, index, input.difficulty, reasons, warnings, issueCounts);
      validateHistorySubjectFit(question, index, reasons, warnings, issueCounts);
    } else {
      validateGenericDifficulty(question, index, input.difficulty, reasons, warnings, issueCounts);
    }
  });

  const _metadata = {
    difficultyLabel: difficultyRules[input.difficulty].label,
    schoolLevelLabel: schoolLevelRules[input.schoolLevel].label,
  };
  void _metadata;

  return {
    isValid: reasons.length === 0,
    reasons,
    warnings,
    issueCounts,
  };
}
