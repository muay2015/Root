import OpenAI from 'openai';
import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from './generationRules.ts';
import { normalizeChoiceText } from './normalizeChoiceText.ts';
import { buildQuestionPrompt } from './promptBuilder.ts';
import { validateGeneratedQuestions, type GeneratedQuestionDraft, type ValidationResult } from './validator.ts';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  getSubjectSelectionLabel,
  usesNoSelector,
  type SelectionFormat,
  type SubjectKey,
} from './subjectConfig.ts';

export type GeneratedQuestion = {
  id: number;
  topic: string;
  type: 'multiple';
  stem: string;
  choices: string[];
  answer: string;
  explanation: string;
};

export type GenerateValidatedQuestionsInput = {
  openai: OpenAI | null;
  model: string;
  materialText: string;
  count: number;
  subject: SubjectKey;
  questionType?: string;
  format?: string;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  title?: string;
  topic?: string;
};

export type GenerateValidatedQuestionsOutput = {
  title: string;
  questions: GeneratedQuestion[];
  source: 'ai' | 'mock';
  attempts: number;
  validation: ValidationResult;
};

export class QuestionGenerationError extends Error {
  reasons: string[];

  constructor(message: string, reasons: string[] = []) {
    super(message);
    this.name = 'QuestionGenerationError';
    this.reasons = reasons;
  }
}

const MAX_BATCH_SIZE = 5;

type ModelQuestion =
  | {
      topic?: string;
      type?: string;
      stem?: string;
      question?: string;
      choices?: string[] | null;
      options?: string[] | null;
      items?: string[] | null;
      answer: string | number;
      explanation: string;
      number?: number;
    }
  | GeneratedQuestionDraft;

function normalizeInlineText(value: string) {
  return normalizeChoiceText(value);
}

function normalizeChoices(choices?: string[] | null) {
  const normalized = Array.isArray(choices)
    ? choices.map(normalizeInlineText).filter((choice) => choice.length > 0).slice(0, 5)
    : [];

  while (normalized.length < 5) {
    normalized.push(`Choice ${normalized.length + 1}`);
  }

  return normalized;
}

function resolveSelectionValue(input: GenerateValidatedQuestionsInput) {
  const defaults = getSubjectSelectionDefaults(input.subject);
  const config = SUBJECT_CONFIG[input.subject];
  if (config.selectorMode === 'questionType') {
    return input.questionType ?? defaults.questionType;
  }

  if (config.selectorMode === 'format') {
    return input.format ?? defaults.format;
  }

  return null;
}

function resolveQuestionTopic(
  raw: ModelQuestion,
  index: number,
  input: GenerateValidatedQuestionsInput,
) {
  const trimmedTopic = typeof raw.topic === 'string' ? raw.topic.trim() : '';
  if (trimmedTopic.length > 0) {
    return trimmedTopic;
  }

  if (input.subject === 'korean_history') {
    return input.topic?.trim() || input.title?.trim() || `국사 문항 ${index + 1}`;
  }

  const selectionValue = resolveSelectionValue(input);
  return selectionValue || input.topic?.trim() || `${SUBJECT_CONFIG[input.subject].label} 문항 ${index + 1}`;
}

function normalizeQuestion(
  raw: ModelQuestion,
  index: number,
  input: GenerateValidatedQuestionsInput,
): GeneratedQuestion {
  const rawChoices = raw.choices ?? raw.options ?? ('items' in raw ? raw.items : undefined);
  const choices = normalizeChoices(Array.isArray(rawChoices) ? rawChoices : undefined);
  const rawAnswer = normalizeInlineText(String(raw.answer));
  const exactChoice = choices.find((choice) => choice.trim() === rawAnswer);
  const numericAnswer = Number(rawAnswer);
  const answer =
    exactChoice ??
    (Number.isInteger(numericAnswer) && numericAnswer >= 1 && numericAnswer <= choices.length
      ? choices[numericAnswer - 1]
      : choices[0]);

  return {
    id: index + 1,
    topic: resolveQuestionTopic(raw, index, input),
    type: 'multiple',
    stem: (raw.stem ?? ('question' in raw ? raw.question : '') ?? '').trim(),
    choices,
    answer,
    explanation: raw.explanation.trim(),
  };
}

function buildFallbackQuestions(input: GenerateValidatedQuestionsInput): GeneratedQuestion[] {
  const selectionLabel = getSubjectSelectionLabel(
    input.subject,
    input.questionType ?? '',
    (input.format ?? '객관식') as SelectionFormat,
  );
  const selectionValue = resolveSelectionValue(input);
  const rules = getGenerationRules({
    subject: input.subject,
    selectionLabel: selectionLabel ?? undefined,
    selectionValue: selectionValue ?? undefined,
    difficulty: input.difficulty,
    schoolLevel: input.schoolLevel,
  });

  return Array.from({ length: input.count }, (_, index) => ({
    id: index + 1,
    topic: input.topic || input.title || `${rules.subjectLabel} 문항`,
    type: 'multiple',
    stem: `${rules.subjectLabel} ${selectionValue ?? ''} 문항 ${index + 1}`.trim(),
    choices: ['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4', 'Choice 5'],
    answer: 'Choice 1',
    explanation: `Fallback item aligned to ${rules.subjectLabel}, ${rules.schoolLevel.label}, and ${rules.difficulty.label}.`,
  }));
}

function getDefaultTitle(input: GenerateValidatedQuestionsInput) {
  const selectionValue = resolveSelectionValue(input);
  return input.title || [input.subject, selectionValue, input.schoolLevel, input.difficulty].filter(Boolean).join('-');
}

function extractJson(text: string) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    const match = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match) clean = match[1].trim();
  }

  // Self-healing: JSON에서 허용되지 않는 \ 기호(수식용 \sqrt 등)를 자동으로 이중 역슬래시로 변환
  // 이를 방지하기 위해 이스케이프되지 않은 단일 \ 를 \\ 로 교체
  return clean.replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
}

async function requestQuestionsFromModel(
  input: GenerateValidatedQuestionsInput,
  validationFeedback: string[],
) {
  if (!input.openai) {
    return null;
  }

  const prompt = buildQuestionPrompt({
    materialText: input.materialText,
    title: input.title,
    topic: input.topic,
    count: input.count,
    subject: input.subject,
    questionType: input.questionType,
    format: input.format,
    difficulty: input.difficulty,
    schoolLevel: input.schoolLevel,
    validationFeedback,
  });

  const response = await input.openai.responses.create({
    model: input.model,
    input: [
      {
        role: 'system',
        content: usesNoSelector(input.subject)
          ? 'Generate Korean-history-only exam questions and return valid JSON only.'
          : 'Generate subject-specific exam questions and return valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    text: { verbosity: 'low' },
  });

  const rawJson = extractJson(response.output_text);
  let parsed: ModelQuestion[];
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    console.warn('First JSON parse failed, attempting auto-repair...', e);
    // 가장 흔한 문제인 이스케이프되지 않은 단일 역슬래시(\)들을 모두 이중(\\)으로 강제 치환
    const repairedJson = rawJson.replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
    try {
      parsed = JSON.parse(repairedJson);
    } catch (e2) {
      // 2차 시도도 실패했다면 더 공격적으로 모든 \를 \\로 치환 (리터럴 \n, \t 등까지 모두 문자화)
      const aggressiveRepairedJson = rawJson.replace(/\\/g, '\\\\');
      try {
        parsed = JSON.parse(aggressiveRepairedJson);
      } catch (e3) {
        throw new Error(`JSON 파싱 최종 실패: ${e instanceof Error ? e.message : '알 수 없는 형식'}`);
      }
    }
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('AI가 유효한 문항 배열을 반환하지 않았습니다. (JSON 형식은 유효하나 배열이 비어있음)');
  }

  return parsed.map((item, itemIndex) => normalizeQuestion(item, itemIndex, input));
}

async function generateValidatedQuestionBatch(
  input: GenerateValidatedQuestionsInput,
): Promise<GenerateValidatedQuestionsOutput> {
  let latestQuestions: GeneratedQuestion[] = [];
  let latestValidation: ValidationResult = {
    isValid: false,
    reasons: ['Generation did not run yet.'],
    warnings: [],
    issueCounts: {},
  };
  let validationFeedback: string[] = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      latestQuestions = await requestQuestionsFromModel(input, validationFeedback);
      latestValidation = validateGeneratedQuestions({
        questions: latestQuestions,
        count: input.count,
        subject: input.subject,
        questionType: input.questionType,
        format: input.format,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
        title: input.title,
        topic: input.topic,
      });

      if (latestValidation.isValid) {
        return {
          title: getDefaultTitle(input),
          questions: latestQuestions,
          source: 'ai',
          attempts: attempt,
          validation: latestValidation,
        };
      }

      validationFeedback = latestValidation.reasons;
    } catch (e) {
      console.warn(`Attempt ${attempt} failed with error:`, e);
      const errorMessage = `네트워크 또는 파싱 오류: ${e instanceof Error ? e.message : String(e)}`;
      latestValidation = {
        isValid: false,
        reasons: [errorMessage],
        warnings: [],
        issueCounts: { error: 1 }
      };
      validationFeedback = [errorMessage];
    }
  }

  const reasons = latestValidation.reasons || [];
  const detailedReason = reasons.length > 0
    ? `${reasons[0]}${reasons.length > 1 ? ' 외 ' + (reasons.length - 1) + '건' : ''}`
    : '빈 문항 또는 placeholder가 감지되었습니다.';

  throw new QuestionGenerationError(
    `문제 생성 결과가 유효하지 않아 중단했습니다. (상세 사유: ${detailedReason})`,
    reasons,
  );
}

export async function generateValidatedQuestions(
  input: GenerateValidatedQuestionsInput,
): Promise<GenerateValidatedQuestionsOutput> {
  if (!input.openai) {
    throw new QuestionGenerationError('AI 문제 생성을 위한 OpenAI 설정이 없습니다.');
  }

  if (input.count <= MAX_BATCH_SIZE) {
    return generateValidatedQuestionBatch(input);
  }

  const mergedQuestions: GeneratedQuestion[] = [];
  const mergedWarnings: string[] = [];
  let totalAttempts = 0;

  for (let startIndex = 0; startIndex < input.count; startIndex += MAX_BATCH_SIZE) {
    const batchCount = Math.min(MAX_BATCH_SIZE, input.count - startIndex);
    const batch = await generateValidatedQuestionBatch({
      ...input,
      count: batchCount,
    });

    totalAttempts += batch.attempts;
    mergedWarnings.push(...batch.validation.warnings);
    mergedQuestions.push(
      ...batch.questions.map((question, offset) => ({
        ...question,
        id: startIndex + offset + 1,
      })),
    );
  }

  const mergedValidation = validateGeneratedQuestions({
    questions: mergedQuestions,
    count: input.count,
    subject: input.subject,
    questionType: input.questionType,
    format: input.format,
    difficulty: input.difficulty,
    schoolLevel: input.schoolLevel,
    title: input.title,
    topic: input.topic,
  });

  if (!mergedValidation.isValid) {
    throw new QuestionGenerationError(
      '배치 생성 후 최종 검증에 실패했습니다.',
      mergedValidation.reasons,
    );
  }

  return {
    title: getDefaultTitle(input),
    questions: mergedQuestions,
    source: 'ai',
    attempts: totalAttempts,
    validation: {
      ...mergedValidation,
      warnings: Array.from(new Set([...mergedValidation.warnings, ...mergedWarnings])),
    },
  };
}
