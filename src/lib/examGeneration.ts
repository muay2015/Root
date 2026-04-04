export type GeneratedQuestionMode = 'multiple' | 'subjective' | 'mixed';

type NormalizableQuestion = {
  id: number;
  type: string;
  choices?: string[];
  answer: string;
};

export function normalizeMultipleChoiceChoices(choices?: string[]) {
  const normalized = Array.isArray(choices)
    ? choices.map((choice) => choice.trim()).filter((choice) => choice.length > 0).slice(0, 5)
    : [];

  while (normalized.length < 5) {
    normalized.push(`보기 ${normalized.length + 1}`);
  }

  return normalized;
}

export function toGeneratedQuestionMode(questionType: string): GeneratedQuestionMode {
  if (questionType === '객관식') {
    return 'multiple';
  }

  if (questionType === '주관식') {
    return 'subjective';
  }

  return 'mixed';
}

export function normalizeGeneratedQuestions<T extends NormalizableQuestion>(
  questionType: GeneratedQuestionMode,
  incomingQuestions: T[],
) {
  return incomingQuestions.map((question, index) => {
    if (questionType === 'subjective') {
      return {
        ...question,
        id: index + 1,
        type: '주관식',
        choices: undefined,
      };
    }

    if (questionType === 'multiple') {
      const choices = normalizeMultipleChoiceChoices(question.choices);
      const numericAnswer = Number(question.answer.trim());
      const resolvedAnswer =
        Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= choices.length
          ? choices[numericAnswer - 1]
          : question.answer;

      return {
        ...question,
        id: index + 1,
        type: '객관식',
        choices,
        answer: resolvedAnswer,
      };
    }

    const shouldBeMultiple = index % 2 === 0;

    if (shouldBeMultiple) {
      const choices = normalizeMultipleChoiceChoices(question.choices);
      const numericAnswer = Number(question.answer.trim());
      const resolvedAnswer =
        Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= choices.length
          ? choices[numericAnswer - 1]
          : question.answer;

      return {
        ...question,
        id: index + 1,
        type: '객관식',
        choices,
        answer: resolvedAnswer,
      };
    }

    return {
      ...question,
      id: index + 1,
      type: '주관식',
      choices: undefined,
    };
  });
}
