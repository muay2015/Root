import express from 'express';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

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

console.log('[env] .env path:', envPath);
console.log('[env] .env.local path:', envLocalPath);
console.log('[env] OPENAI_API_KEY:', hasOpenAiKey ? '있음' : '없음');
console.log('[env] OPENAI_MODEL:', openAiModel);

app.use(express.json({ limit: '2mb' }));

type GenerateExamRequest = {
  materialText: string;
  questionType: string;
  difficulty: string;
  format: string;
  count: number;
};

type QuestionKind = '객관식' | '주관식';

type GeneratedQuestion = {
  id: number;
  topic: string;
  type: QuestionKind;
  stem: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

type GeneratedExamResponse = {
  title: string;
  questions: GeneratedQuestion[];
  source: 'ai' | 'mock';
};

type ExamGenerationSchema = {
  title: string;
  questions: Array<{
    topic: string;
    type: QuestionKind;
    stem: string;
    choices: string[] | null;
    answer: string;
    explanation: string;
  }>;
};

function inferQuestionTypeLabel(value: string) {
  if (value.includes('multiple')) return '객관식';
  if (value.includes('subjective')) return '주관식';
  if (value.includes('mixed')) return '혼합형';
  if (value.includes('객')) return '객관식';
  if (value.includes('주')) return '주관식';
  return '혼합형';
}

function isMultipleChoice(questionType: string, index: number) {
  const normalized = inferQuestionTypeLabel(questionType);
  if (normalized === '객관식') return true;
  if (normalized === '주관식') return false;
  return index % 2 === 0;
}

function resolveQuestionKind(questionType: string, requestedQuestionType: string, index: number): QuestionKind {
  const requested = inferQuestionTypeLabel(requestedQuestionType);

  if (requested === '객관식') {
    return '객관식';
  }

  if (requested === '주관식') {
    return '주관식';
  }

  return questionType === '주관식' && index % 2 === 1 ? '주관식' : '객관식';
}

function normalizeMultipleChoiceChoices(choices?: string[] | null) {
  const normalized = Array.isArray(choices)
    ? choices.map((choice) => choice.trim()).filter((choice) => choice.length > 0).slice(0, 5)
    : [];

  while (normalized.length < 5) {
    normalized.push(`보기 ${normalized.length + 1}`);
  }

  return normalized;
}

function fallbackResponse(payload: GenerateExamRequest): GeneratedExamResponse {
  const questions = Array.from({ length: payload.count }, (_, index) => {
    const id = index + 1;
    const multipleChoice = isMultipleChoice(payload.questionType, index);

    return {
      id,
      topic: `${payload.format} 단원 개념 ${Math.floor(index / 3) + 1}`,
      type: multipleChoice ? '객관식' : '주관식',
      stem: `${payload.difficulty} 난이도의 ${payload.format} 대비문제 ${id}`,
      choices: multipleChoice ? ['보기 1', '보기 2', '보기 3', '보기 4', '보기 5'] : undefined,
      answer: multipleChoice ? '보기 2' : '단원 개념을 정확히 설명한 답안',
      explanation: 'OpenAI 호출에 실패해 기본 문제 세트를 반환했습니다.',
    } satisfies GeneratedQuestion;
  });

  return {
    title: `AI 생성 ${payload.format} ${payload.difficulty} ${payload.count}문항`,
    questions,
    source: 'mock',
  };
}

const examJsonSchema = {
  name: 'exam_generation',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'questions'],
    properties: {
      title: { type: 'string' },
      questions: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['topic', 'type', 'stem', 'choices', 'answer', 'explanation'],
          properties: {
            topic: { type: 'string' },
            type: { type: 'string', enum: ['객관식', '주관식'] },
            stem: { type: 'string' },
            choices: {
              anyOf: [
                {
                  type: 'array',
                  items: { type: 'string' },
                },
                {
                  type: 'null',
                },
              ],
            },
            answer: { type: 'string' },
            explanation: { type: 'string' },
          },
        },
      },
    },
  },
} as const;

function buildPrompt(payload: GenerateExamRequest) {
  return [
    'You generate CBT-ready Korean exam sets.',
    'Return only JSON that matches the schema.',
    `Question type: ${payload.questionType}`,
    `Difficulty: ${payload.difficulty}`,
    `Exam format: ${payload.format}`,
    `Question count: ${payload.count}`,
    'Rules:',
    '- If the question type is mixed, include both 객관식 and 주관식.',
    '- 객관식 questions must contain exactly 5 choices.',
    '- 객관식 choices should be concise and plausible distractors.',
    '- 주관식 questions must set choices to null.',
    '- Keep answers concise and explanations clear.',
    '- Base the questions on the supplied material text.',
    '',
    'Material text:',
    payload.materialText,
  ].join('\n');
}

function getOpenAiErrorMessage(error: unknown) {
  if (error instanceof OpenAI.APIError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Unknown OpenAI error';
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    provider: hasOpenAiKey ? 'openai' : 'mock',
    model: openAiModel,
    keyLoaded: hasOpenAiKey,
    envFiles: {
      env: envPath,
      envLocal: envLocalPath,
    },
  });
});

app.post('/api/ai/generate-exam', async (req, res) => {
  const payload = req.body as GenerateExamRequest;

  if (!payload.materialText || payload.materialText.trim().length < 20) {
    res.status(400).json({ error: '학습 자료 텍스트가 너무 짧습니다.' });
    return;
  }

  if (!openai) {
    res.json(fallbackResponse(payload));
    return;
  }

  try {
    const response = await openai.responses.create({
      model: openAiModel,
      input: [
        {
          role: 'system',
          content: 'Generate an exam set from study materials and respond with valid JSON matching the provided schema.',
        },
        {
          role: 'user',
          content: buildPrompt(payload),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...examJsonSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as ExamGenerationSchema;
    const questions: GeneratedQuestion[] = Array.isArray(parsed.questions)
      ? parsed.questions.slice(0, payload.count).map((question, index) => {
          const type = resolveQuestionKind(question.type, payload.questionType, index);

          return {
            id: index + 1,
            topic: question.topic,
            type,
            stem: question.stem,
            choices: type === '객관식' ? normalizeMultipleChoiceChoices(question.choices) : undefined,
            answer: question.answer,
            explanation: question.explanation,
          };
        })
      : [];

    res.json({
      title: parsed.title || `AI 생성 ${payload.format} ${payload.difficulty} ${payload.count}문항`,
      questions,
      source: 'ai',
    } satisfies GeneratedExamResponse);
  } catch (error) {
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
