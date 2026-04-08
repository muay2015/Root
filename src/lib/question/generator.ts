import { type DifficultyLevel, type SchoolLevel } from './generationRules.ts';
import { buildQuestionPrompt } from './promptBuilder.ts';
import { validateGeneratedQuestions, type ValidationResult } from './validator.ts';
import { type SubjectKey } from './subjectConfig.ts';
import { normalizeChoiceText } from './normalizeChoiceText.ts';

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
  openai: any;
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
  builderMode?: string;
  images?: { mimeType: string; data: string }[];
};

export type GenerateValidatedQuestionsOutput = {
  title: string;
  questions: GeneratedQuestion[];
  source: 'ai' | 'mock';
  attempts: number;
  validation: ValidationResult;
  summary?: string;
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

function extractJson(text: string) {
  let clean = text.trim();
  if (clean.startsWith('```')) {
    const match = clean.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (match) clean = match[1].trim();
  }
  return clean.replace(/(?<!\\)\\(?![\\"/bfnrtu])/g, '\\\\');
}

function splitChoiceString(value: string) {
  return value
    .split(/\r?\n|(?=\s*[①-⑤])|(?=\s*[1-5][\.\)])|(?=\s*[A-E][\.\)])|(?:\s*\/\s*)|(?:\s*\|\s*)/)
    .map((part) => normalizeChoiceText(part))
    .filter((part) => part.length > 0);
}

function extractRawChoices(raw: any): string[] {
  const candidate = raw.choices ?? raw.options ?? raw.items;

  if (Array.isArray(candidate)) {
    return candidate.flatMap((item) => {
      if (typeof item === 'string') {
        return splitChoiceString(item);
      }
      if (item && typeof item === 'object') {
        const text = item.text ?? item.label ?? item.value ?? item.content;
        return typeof text === 'string' ? splitChoiceString(text) : [];
      }
      return [];
    });
  }

  if (typeof candidate === 'string') {
    return splitChoiceString(candidate);
  }

  return [];
}

function normalizeQuestion(raw: any, index: number): GeneratedQuestion {
  // Keep only real options from the model; validation should fail on missing choices,
  // not on placeholders we injected ourselves.
  const choices = extractRawChoices(raw)
    .filter((choice: string) => choice.length > 0)
    .slice(0, 5);

  let answerStr = '';
  const rawAnswer = raw.answer;
  if (typeof rawAnswer === 'number') {
    const idx = Math.floor(rawAnswer) - 1;
    answerStr = choices[idx] || '';
  } else if (typeof rawAnswer === 'string') {
    const trimmed = rawAnswer.trim();
    if (/^[1-5]$/.test(trimmed)) {
      answerStr = choices[parseInt(trimmed, 10) - 1] || '';
    } else {
      answerStr = normalizeChoiceText(trimmed);
    }
  }

  return {
    id: index + 1,
    topic: raw.topic || '문항',
    type: 'multiple',
    stem: raw.stem || raw.question || '',
    choices,
    answer: answerStr,
    explanation: raw.explanation || '',
  };
}

async function requestQuestionsFromModel(input: GenerateValidatedQuestionsInput, feedback: string[]) {
  const prompt = buildQuestionPrompt({ ...input, validationFeedback: feedback }, input.builderMode);

  let rawJson = '';
  try {
    if (typeof input.openai?.responses?.create === 'function') {
      const resp = await input.openai.responses.create({
        model: input.model,
        input: [
          { role: 'system', content: 'JSON 리스트만 반환하세요.' },
          { role: 'user', content: prompt },
        ],
        text: { verbosity: 'low' },
      });
      rawJson = resp.output_text || '';
    } else {
      // Build messages for Chat Completion
      const messages: any[] = [
        { role: 'system', content: 'JSON 리스트만 반환하세요.' },
      ];

      const userContent: any[] = [{ type: 'text', text: prompt }];
      
      // 이미지 데이터가 있으면 멀티모달 형식으로 추가
      if (input.images && input.images.length > 0) {
        input.images.forEach((img) => {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: `data:${img.mimeType};base64,${img.data}`
            }
          });
        });
      }

      messages.push({ role: 'user', content: userContent });

      const resp = await input.openai.chat.completions.create({
        model: input.model,
        messages: messages,
      });
      rawJson = resp.choices[0].message.content || '';
    }
  } catch (err: any) {
    throw new Error(`AI 호출 실패: ${err.message}`);
  }

  const parsed = JSON.parse(extractJson(rawJson));
  let rawQuestions = [];

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (parsed && typeof parsed === 'object') {
    rawQuestions = parsed.questions || parsed.result || parsed.data || parsed.items || [];
  }

  const questions = rawQuestions.length > 0
    ? rawQuestions.map((q: any, i: number) => normalizeQuestion(q, i))
    : [normalizeQuestion({
        stem: `AI 응답 파싱 실패 (내용: ${rawJson.substring(0, 50)}...)`,
        answer: '확인',
        choices: ['확인', '-', '-', '-', '-'],
        explanation: 'JSON 구조를 확인하세요.',
      }, 0)];

  if (input.builderMode === 'summary' && !Array.isArray(parsed)) {
    return {
      summary: (parsed as any).summary || (parsed as any).content || '요약 내용을 생성하지 못했습니다.',
      questions,
    };
  }

  return { questions };
}

async function generateValidatedQuestionBatch(
  input: GenerateValidatedQuestionsInput,
): Promise<GenerateValidatedQuestionsOutput> {
  let feedback: string[] = [];
  for (let i = 1; i <= 3; i++) {
    try {
      const result = await requestQuestionsFromModel(input, feedback);
      const validation = validateGeneratedQuestions({
        questions: result.questions,
        count: input.count,
        subject: input.subject,
        difficulty: input.difficulty,
        schoolLevel: input.schoolLevel,
        format: input.format,
        questionType: input.questionType,
        title: input.title,
        topic: input.topic,
      });

      if (validation.isValid) {
        return {
          title: input.title || 'Exam',
          questions: result.questions,
          summary: result.summary,
          source: 'ai',
          attempts: i,
          validation,
        };
      }

      feedback = validation.reasons;
    } catch (e: any) {
      if (i === 3) throw e;
    }
  }

  const lastErrorMsg = feedback.length > 0 ? `\n사유: ${feedback.slice(0, 2).join(', ')}` : '';
  throw new Error(`3회 시도 후에도 유효한 결과를 얻지 못했습니다.${lastErrorMsg}`);
}

export async function generateValidatedQuestions(
  input: GenerateValidatedQuestionsInput,
): Promise<GenerateValidatedQuestionsOutput> {
  if (input.count <= MAX_BATCH_SIZE) {
    return generateValidatedQuestionBatch(input);
  }

  const mergedQuestions: GeneratedQuestion[] = [];
  let mergedSummary: string | undefined;

  for (let i = 0; i < input.count; i += MAX_BATCH_SIZE) {
    const batch = await generateValidatedQuestionBatch({
      ...input,
      count: Math.min(MAX_BATCH_SIZE, input.count - i),
    });
    if (!mergedSummary) mergedSummary = batch.summary;
    mergedQuestions.push(...batch.questions.map((q, j) => ({ ...q, id: i + j + 1 })));
  }

  return {
    title: input.title || 'Combined Exam',
    questions: mergedQuestions,
    summary: mergedSummary,
    source: 'ai',
    attempts: 1,
    validation: { isValid: true, reasons: [], warnings: [], issueCounts: {} },
  };
}
