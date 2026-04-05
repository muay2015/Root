import OpenAI from 'openai';
import {
  generateValidatedQuestions,
  QuestionGenerationError,
  type GeneratedQuestion,
} from '../question/generator.ts';
import type {
  DifficultyLevel,
  SchoolLevel,
} from '../question/generationRules.ts';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  usesFormat,
  usesQuestionType,
  type SubjectKey,
} from '../question/subjectConfig.ts';

type LegacyDifficulty = '기본' | '도전' | '실전';
type LegacySchoolLevel = '중학교 내신형' | '고등학교 내신형' | '수능형';

export type GenerateExamRequest = {
  materialText: string;
  count: number;
  subject?: SubjectKey;
  questionType?: string;
  format?: string;
  difficulty?: DifficultyLevel | LegacyDifficulty;
  schoolLevel?: SchoolLevel | LegacySchoolLevel;
  title?: string;
  topic?: string;
};

export type GeneratedExamResponse = {
  title: string;
  questions: GeneratedQuestion[];
  source: 'ai' | 'mock';
  attempts: number;
  validation: {
    isValid: boolean;
    reasons: string[];
    warnings: string[];
    issueCounts: Record<string, number>;
  };
};

export type GenerateExamApiResult = {
  status: number;
  body: Record<string, unknown>;
};

export function normalizeDifficulty(value?: GenerateExamRequest['difficulty']): DifficultyLevel {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  if (value === '기본') return 'easy';
  if (value === '도전') return 'medium';
  return 'hard';
}

export function normalizeSchoolLevel(value?: GenerateExamRequest['schoolLevel']): SchoolLevel {
  if (value === 'middle' || value === 'high' || value === 'csat') {
    return value;
  }

  if (value === '중학교 내신형') return 'middle';
  if (value === '고등학교 내신형') return 'high';
  return 'csat';
}

export function normalizeSubject(value?: string): SubjectKey {
  if (value && value in SUBJECT_CONFIG) {
    return value as SubjectKey;
  }

  return 'english';
}

export function buildResponseTitle(
  payload: GenerateExamRequest,
  subject: SubjectKey,
  selectionValue: string | null,
  schoolLevel: SchoolLevel,
  difficulty: DifficultyLevel,
) {
  if (payload.title?.trim()) {
    return payload.title.trim();
  }

  return [subject, selectionValue, schoolLevel, difficulty, 'cbt'].filter(Boolean).join('-');
}

export function getOpenAiErrorMessage(error: unknown) {
  if (error instanceof OpenAI.APIError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unknown OpenAI error';
}

export async function generateExamApiResponse(input: {
  payload: GenerateExamRequest;
  openAiApiKey?: string;
  openAiModel?: string;
}): Promise<GenerateExamApiResult> {
  const payload = input.payload;
  const openAiApiKey = input.openAiApiKey?.trim() || '';
  const openAiModel = input.openAiModel?.trim() || 'gpt-5.4-mini';
  const openai = openAiApiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

  if (!payload.materialText || payload.materialText.trim().length < 20) {
    return {
      status: 400,
      body: { error: 'Study material must be at least 20 characters.' },
    };
  }

  try {
    const subject = normalizeSubject(payload.subject);
    const selectionDefaults = getSubjectSelectionDefaults(subject);
    const difficulty = normalizeDifficulty(payload.difficulty);
    const schoolLevel = normalizeSchoolLevel(payload.schoolLevel);
    const questionType = usesQuestionType(subject)
      ? (payload.questionType?.trim() || selectionDefaults.questionType)
      : undefined;
    const format = usesFormat(subject)
      ? (payload.format?.trim() || selectionDefaults.format)
      : undefined;
    const selectionValue = questionType ?? format ?? null;

    const generated = await generateValidatedQuestions({
      openai,
      model: openAiModel,
      materialText: payload.materialText,
      count: payload.count,
      subject,
      questionType,
      format,
      difficulty,
      schoolLevel,
      title: buildResponseTitle(payload, subject, selectionValue, schoolLevel, difficulty),
      topic: payload.topic,
    });

    return {
      status: 200,
      body: {
        title: generated.title,
        questions: generated.questions,
        source: generated.source,
        attempts: generated.attempts,
        validation: generated.validation,
      } satisfies GeneratedExamResponse,
    };
  } catch (error) {
    if (error instanceof QuestionGenerationError) {
      console.error('Question validation failed:', error.message, error.reasons);
      return {
        status: 422,
        body: {
          error: error.message,
          reasons: error.reasons,
          source: 'openai',
          model: openAiModel,
        },
      };
    }

    const errorMessage = getOpenAiErrorMessage(error);
    console.error('OpenAI generate exam error:', errorMessage, error);
    return {
      status: 502,
      body: {
        error: errorMessage,
        source: 'openai',
        model: openAiModel,
      },
    };
  }
}
