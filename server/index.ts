import dotenv from 'dotenv';
import express from 'express';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateValidatedQuestions,
  QuestionGenerationError,
  type GeneratedQuestion,
} from '../src/lib/question/generator.ts';
import type {
  DifficultyLevel,
  SchoolLevel,
} from '../src/lib/question/generationRules.ts';
import {
  SUBJECT_CONFIG,
  getSubjectSelectionDefaults,
  usesFormat,
  usesQuestionType,
  type SubjectKey,
} from '../src/lib/question/subjectConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath, override: true });

const app = express();
const port = Number(process.env.PORT || 8787);
const openAiApiKey = process.env.OPENAI_API_KEY?.trim() || '';
const openAiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini';
const hasOpenAiKey = openAiApiKey.length > 0;
const openai = hasOpenAiKey ? new OpenAI({ apiKey: openAiApiKey }) : null;

app.use(express.json({ limit: '2mb' }));

type LegacyDifficulty = '\uae30\ubcf8' | '\ub3c4\uc804' | '\uc2e4\uc804';
type LegacySchoolLevel =
  | '\uc911\ud559\uad50 \ub0b4\uc2e0\ud615'
  | '\uace0\ub4f1\ud559\uad50 \ub0b4\uc2e0\ud615'
  | '\uc218\ub2a5\ud615';

type GenerateExamRequest = {
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

type GeneratedExamResponse = {
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

function normalizeDifficulty(value?: GenerateExamRequest['difficulty']): DifficultyLevel {
  if (value === 'easy' || value === 'medium' || value === 'hard') {
    return value;
  }

  if (value === '\uae30\ubcf8') return 'easy';
  if (value === '\ub3c4\uc804') return 'medium';
  return 'hard';
}

function normalizeSchoolLevel(value?: GenerateExamRequest['schoolLevel']): SchoolLevel {
  if (value === 'middle' || value === 'high' || value === 'csat') {
    return value;
  }

  if (value === '\uc911\ud559\uad50 \ub0b4\uc2e0\ud615') return 'middle';
  if (value === '\uace0\ub4f1\ud559\uad50 \ub0b4\uc2e0\ud615') return 'high';
  return 'csat';
}

function normalizeSubject(value?: string): SubjectKey {
  if (value && value in SUBJECT_CONFIG) {
    return value as SubjectKey;
  }

  return 'english';
}

function buildResponseTitle(
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

function getOpenAiErrorMessage(error: unknown) {
  if (error instanceof OpenAI.APIError) return error.message;
  if (error instanceof Error) return error.message;
  return 'Unknown OpenAI error';
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    provider: hasOpenAiKey ? 'openai' : 'mock',
    model: openAiModel,
    keyLoaded: hasOpenAiKey,
  });
});

app.post('/api/ai/generate-exam', async (req, res) => {
  const payload = req.body as GenerateExamRequest;

  if (!payload.materialText || payload.materialText.trim().length < 20) {
    res.status(400).json({ error: 'Study material must be at least 20 characters.' });
    return;
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

    res.json({
      title: generated.title,
      questions: generated.questions,
      source: generated.source,
      attempts: generated.attempts,
      validation: generated.validation,
    } satisfies GeneratedExamResponse);
  } catch (error) {
    if (error instanceof QuestionGenerationError) {
      console.error('Question validation failed:', error.message, error.reasons);
      res.status(422).json({
        error: error.message,
        reasons: error.reasons,
        source: 'openai',
        model: openAiModel,
      });
      return;
    }

    const errorMessage = getOpenAiErrorMessage(error);
    console.error('OpenAI generate exam error:', errorMessage, error);
    res.status(502).json({
      error: errorMessage,
      source: 'openai',
      model: openAiModel,
    });
  }
});

app.listen(port, () => {
  console.log(`ROOT API server listening on http://localhost:${port}`);
});
