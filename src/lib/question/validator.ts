import {
  difficultyRules,
  schoolLevelRules,
  type DifficultyLevel,
  type SchoolLevel,
} from './generationRules.ts';
import { usesNoSelector, type SubjectKey } from './subjectConfig.ts';
import {
  countAnswerMatches,
  normalizeAnswerComparison,
  resolveAnswerFromChoices,
} from './answerMatching.ts';

export type GeneratedQuestionDraft = {
  topic: string;
  type: string;
  stem: string;
  choices?: string[] | null;
  options?: string[] | null;
  items?: string[] | null;
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
    .split(/[^a-z0-9\u3131-\u314e\uac00-\ud7a3]+/u)
    .filter((token) => token.length >= 2);
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function countKoreanCharacters(value: string) {
  return (value.match(/[\u3131-\u314e\uac00-\ud7a3]/gu) ?? []).length;
}

function normalizeText(value: string) {
  return normalizeAnswerComparison(value);
}

function parseLetterChoiceIndex(value: string): number | null {
  const compact = value.trim().toUpperCase();
  const match = compact.match(/^(?:ANSWER[:\s]*)?([A-E])(?:[.)])?$/);
  if (!match) return null;
  return match[1].charCodeAt(0) - 65;
}

function parseAnswerChoiceIndex(value: string): number | null {
  const compact = value.trim().replace(/\s+/g, '');
  const circledDigitMap: Record<string, number> = {
    '①': 0,
    '②': 1,
    '③': 2,
    '④': 3,
    '⑤': 4,
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

function validateStructure(
  question: GeneratedQuestionDraft,
  index: number,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  const choices = Array.isArray(question.choices) ? question.choices : [];

  if (choices.length !== 5) {
    pushReason(
      reasons,
      issueCounts,
      'choice_count',
      `Question ${index}: choices must contain exactly 5 options.`,
    );
  }

  if (choices.some((choice) => choice.trim().length === 0)) {
    pushReason(
      reasons,
      issueCounts,
      'empty_choice',
      `Question ${index}: every choice must be non-empty.`,
    );
  }

  const placeholderRegex =
    /^(?:choice|option|\ubcf4\uae30|\uc120\ud0dd\uc9c0)\s*\d+$/iu;
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
  const relaxedNormalizedAnswer =
    answerMatches === 1
      ? normalizedAnswer
      : normalizeAnswerComparison(resolveAnswerFromChoices(question.answer, choices));
  const finalAnswerMatches =
    answerMatches === 1 ? answerMatches : countAnswerMatches(question.answer, choices);

  if (finalAnswerMatches !== 1) {
    console.warn(
      `[Validation Failure] Q${index} - Answer: "${question.answer}" matched ${finalAnswerMatches} choices.`,
    );
    console.warn(`Normalized Answer: "${relaxedNormalizedAnswer}"`);
    choices.forEach((choice, choiceIndex) =>
      console.warn(
        `Choice ${choiceIndex + 1}: "${choice}" (Normalized: "${normalizeText(choice)}")`,
      ),
    );
    pushReason(
      reasons,
      issueCounts,
      'answer_match',
      `Question ${index}: answer must match exactly one choice. (Matches: ${finalAnswerMatches}; Answer: "${question.answer}"; Choices: ${JSON.stringify(choices.slice(0, 5))})`,
    );
  }

  if (question.stem.trim().length < 8) {
    pushReason(
      reasons,
      issueCounts,
      'empty_stem',
      `Question ${index}: stem is too short or missing.`,
    );
  }

  if (question.explanation.trim().length < 12) {
    pushReason(
      reasons,
      issueCounts,
      'explanation',
      `Question ${index}: explanation is too weak or missing.`,
    );
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
  const stemKoreanChars = countKoreanCharacters(question.stem);
  const explanationWords = countWords(question.explanation);
  const directCuePattern =
    /\bwhat is stated|which is true|directly\b|다음 중 옳은 것|맞는 것/i;

  if (difficulty === 'easy' && stemWords > 24) {
    warnings.push(
      `Question ${index}: easy difficulty stem is longer than expected.`,
    );
  }

  if (difficulty === 'hard') {
    if (stemWords < 8 && stemKoreanChars < 18) {
      pushReason(
        reasons,
        issueCounts,
        'hard_too_short',
        `Question ${index}: hard difficulty stem is too short for deep reasoning.`,
      );
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
    /관련된 인물/,
    /해당하는 것/,
    /옳은 것을 고른/,
    /설명한 것/,
  ];

  if (directHistoryPatterns.some((pattern) => pattern.test(question.stem))) {
    pushReason(
      reasons,
      issueCounts,
      'history_hard_direct',
      `Question ${index}: hard history item is too direct.`,
    );
  }

  if (normalizedAnswer.length >= 8 && normalizedStem.includes(normalizedAnswer)) {
    pushReason(
      reasons,
      issueCounts,
      'history_hard_overlap',
      `Question ${index}: hard history answer is too directly exposed in the stem.`,
    );
  }

  const choices = question.choices ?? [];
  const averageLength =
    choices.length > 0
      ? choices.reduce((sum, choice) => sum + choice.length, 0) / choices.length
      : 0;
  if (averageLength > 0 && question.answer.length > averageLength * 1.9) {
    pushReason(
      reasons,
      issueCounts,
      'history_hard_distractor',
      `Question ${index}: hard history distractors are too weak compared with the answer.`,
    );
  }

  const reasoningMarkers = [
    '자료',
    '비교',
    '원인',
    '결과',
    '추론',
    '시기',
    '변화',
    '해석',
  ];
  if (!reasoningMarkers.some((marker) => question.stem.includes(marker))) {
    warnings.push(
      `Question ${index}: hard history item may still lean too much toward recall.`,
    );
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

function validateSelectionReflection(
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

function validateHistorySubjectFit(
  question: GeneratedQuestionDraft,
  index: number,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  const text =
    `${question.topic} ${question.stem} ${question.choices?.join(' ') ?? ''} ${question.explanation}`.toLowerCase();

  const historyMarkers = [
    '조선',
    '고려',
    '신라',
    '백제',
    '고구려',
    '대한제국',
    '일제',
    '개항',
    '왕',
    '제도',
    '사건',
    '문화',
    '경제',
    '사회',
    '정치',
    '역사',
    '인물',
  ];
  const offTopicMarkers = [
    'exercise',
    'fitness',
    'health',
    'athlete',
    'main idea',
    'best title',
    'author',
  ];

  const koreanCount = (text.match(/[\u3131-\u314e\uac00-\ud7a3]{2,}/gu) ?? []).length;
  const englishCount = (text.match(/[a-z]{4,}/g) ?? []).length;

  if (englishCount > 20 && englishCount > koreanCount * 1.5) {
    pushReason(
      reasons,
      issueCounts,
      'history_language',
      `Question ${index}: history output contains too much English.`,
    );
  }

  if (!historyMarkers.some((marker) => text.includes(marker))) {
    warnings.push(`Question ${index}: history context markers not clearly detected.`);
  }

  if (offTopicMarkers.some((marker) => text.includes(marker))) {
    pushReason(
      reasons,
      issueCounts,
      'history_scope',
      `Question ${index}: history item drifted into unrelated generic content.`,
    );
  }
}

export function validateGeneratedQuestions(input: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const issueCounts: Record<string, number> = {};

  if (input.questions.length !== input.count) {
    pushReason(
      reasons,
      issueCounts,
      'question_count',
      `Expected ${input.count} questions but received ${input.questions.length}.`,
    );
  }

  const subject = String(input.subject);
  input.questions.forEach((question, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1;
    validateStructure(question, index, reasons, issueCounts);
    validateTopicReflection(question, index, input.title, input.topic, warnings);
    validateSelectionReflection(question, index, input, warnings);

    if (subject === 'korean_history') {
      validateHistoryDifficulty(
        question,
        index,
        input.difficulty,
        reasons,
        warnings,
        issueCounts,
      );
      validateHistorySubjectFit(question, index, reasons, warnings, issueCounts);
    } else {
      validateGenericDifficulty(
        question,
        index,
        input.difficulty,
        reasons,
        warnings,
        issueCounts,
      );
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
