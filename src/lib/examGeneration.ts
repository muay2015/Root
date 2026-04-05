export type GeneratedQuestionMode = 'multiple' | 'subjective' | 'mixed';

type NormalizableQuestion = {
  id: number;
  type: string;
  choices?: string[];
  answer: string;
};

const MULTIPLE_LABEL = '\uac1d\uad00\uc2dd';
const SUBJECTIVE_LABEL = '\uc8fc\uad00\uc2dd';

function normalizeChoiceText(choice: string) {
  return choice.replace(/\s+/g, ' ').trim();
}

export function normalizeMultipleChoiceChoices(choices?: string[]) {
  const normalized = Array.isArray(choices)
    ? choices.map(normalizeChoiceText).filter((choice) => choice.length > 0).slice(0, 5)
    : [];

  while (normalized.length < 5) {
    normalized.push(`\ubcf4\uae30 ${normalized.length + 1}`);
  }

  return normalized;
}

export function hasPlaceholderChoices(choices?: string[]) {
  if (!Array.isArray(choices) || choices.length === 0) {
    return true;
  }

  return choices.every((choice, index) => {
    const normalized = choice.trim().toLowerCase();
    return normalized === `choice ${index + 1}` || normalized === `보기 ${index + 1}`;
  });
}

export function toGeneratedQuestionMode(questionType: string): GeneratedQuestionMode {
  if (questionType === MULTIPLE_LABEL || questionType.includes('multiple')) {
    return 'multiple';
  }

  if (questionType === SUBJECTIVE_LABEL || questionType.includes('subjective')) {
    return 'subjective';
  }

  return 'mixed';
}

export function normalizeQuestionKindLabel(value: string) {
  if (value.includes('multiple') || value.includes(MULTIPLE_LABEL)) {
    return MULTIPLE_LABEL as typeof MULTIPLE_LABEL;
  }

  if (value.includes('subjective') || value.includes(SUBJECTIVE_LABEL)) {
    return SUBJECTIVE_LABEL as typeof SUBJECTIVE_LABEL;
  }

  return null;
}

function inferQuestionKind(
  question: Pick<NormalizableQuestion, 'type' | 'choices' | 'answer'>,
  fallbackMode: GeneratedQuestionMode,
) {
  const normalizedType = normalizeQuestionKindLabel(question.type);
  if (normalizedType) {
    return normalizedType;
  }

  if (Array.isArray(question.choices) && question.choices.filter(Boolean).length > 0) {
    return MULTIPLE_LABEL;
  }

  if (/^\d+$/.test(question.answer.trim())) {
    return MULTIPLE_LABEL;
  }

  if (fallbackMode === 'multiple') {
    return MULTIPLE_LABEL;
  }

  return SUBJECTIVE_LABEL;
}

function normalizeQuestion<T extends NormalizableQuestion>(
  question: T,
  index: number,
  fallbackMode: GeneratedQuestionMode,
) {
  const resolvedKind = inferQuestionKind(question, fallbackMode);

  if (resolvedKind === MULTIPLE_LABEL) {
    const choices = normalizeMultipleChoiceChoices(question.choices);
    const numericAnswer = Number(question.answer.trim());
    const resolvedAnswer =
      Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= choices.length
        ? choices[numericAnswer - 1]
        : question.answer;

    return {
      ...question,
      id: index + 1,
      type: MULTIPLE_LABEL,
      choices,
      answer: resolvedAnswer,
    };
  }

  return {
    ...question,
    id: index + 1,
    type: SUBJECTIVE_LABEL,
    choices: undefined,
  };
}

export function normalizeGeneratedQuestions<T extends NormalizableQuestion>(
  questionType: GeneratedQuestionMode,
  incomingQuestions: T[],
) {
  return incomingQuestions.map((question, index) => normalizeQuestion(question, index, questionType));
}

export function normalizeStoredQuestions<T extends NormalizableQuestion>(
  incomingQuestions: T[],
  fallbackMode: GeneratedQuestionMode = 'mixed',
) {
  return incomingQuestions.map((question, index) => normalizeQuestion(question, index, fallbackMode));
}
