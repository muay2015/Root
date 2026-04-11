import { type DifficultyLevel, type SchoolLevel } from './generationRules.ts';
import { extractJson } from './generatorParsing.ts';
import { buildQuestionPrompt } from './promptBuilder.ts';
import { normalizeQuestion, type GeneratedQuestion } from './questionNormalizer.ts';
import { type SubjectKey } from './subjectConfig.ts';
import { validateGeneratedQuestions, type ValidationResult } from './validator.ts';

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

type ModelResponse = {
  questions: GeneratedQuestion[];
  summary?: string;
};

function buildFallbackQuestion(
  rawJson: string,
  context: Pick<GenerateValidatedQuestionsInput, 'subject' | 'questionType' | 'materialText'>,
) {
  return normalizeQuestion(
    {
      stem: `AI output parse failed (${rawJson.substring(0, 50)}...)`,
      answer: '확인',
      choices: ['확인', '-', '-', '-', '-'],
      explanation: 'JSON 구조를 확인하세요.',
    },
    0,
    context,
  );
}

async function createModelResponse(
  input: GenerateValidatedQuestionsInput,
  prompt: string,
) {
  if (typeof input.openai?.responses?.create === 'function') {
    const response = await input.openai.responses.create({
      model: input.model,
      input: [
        { role: 'system', content: 'Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      text: { verbosity: 'low' },
    });

    return response.output_text || '';
  }

  const messages: any[] = [{ role: 'system', content: 'Return JSON only.' }];
  const userContent: any[] = [{ type: 'text', text: prompt }];

  if (input.images && input.images.length > 0) {
    input.images.forEach((img) => {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: `data:${img.mimeType};base64,${img.data}`,
        },
      });
    });
  }

  messages.push({ role: 'user', content: userContent });

  const response = await input.openai.chat.completions.create({
    model: input.model,
    messages,
  });

  return response.choices[0]?.message?.content || '';
}

async function requestQuestionsFromModel(
  input: GenerateValidatedQuestionsInput,
  feedback: string[],
): Promise<ModelResponse> {
  const prompt = buildQuestionPrompt({ ...input, validationFeedback: feedback }, input.builderMode);

  let rawJson = '';
  try {
    rawJson = await createModelResponse(input, prompt);
  } catch (error: any) {
    throw new QuestionGenerationError(`AI 호출 실패: ${error.message}`);
  }

  const parsed = JSON.parse(extractJson(rawJson));
  let rawQuestions: any[] = [];

  if (Array.isArray(parsed)) {
    rawQuestions = parsed;
  } else if (parsed && typeof parsed === 'object') {
    rawQuestions = parsed.questions || parsed.result || parsed.data || parsed.items || [];
  }

  const context = {
    subject: input.subject,
    questionType: input.questionType,
    materialText: input.materialText,
  };

  const questions =
    rawQuestions.length > 0
      ? rawQuestions.map((question, index) => normalizeQuestion(question, index, context))
      : [buildFallbackQuestion(rawJson, context)];

  if (input.builderMode === 'summary' && !Array.isArray(parsed)) {
    return {
      summary: (parsed as any).summary || (parsed as any).content || '요약 내용을 생성하지 못했습니다.',
      questions,
    };
  }

  return { questions };
}

function buildRetryFeedback(requestedCount: number, returnedCount: number, remainingCount: number) {
  return [
    `You returned ${returnedCount} question(s), but ${requestedCount} were requested.`,
    `Return exactly ${remainingCount} additional complete questions in the same JSON schema.`,
  ];
}

async function generateValidatedQuestionBatch(
  input: GenerateValidatedQuestionsInput,
): Promise<GenerateValidatedQuestionsOutput> {
  let feedback: string[] = [];

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      console.log(`\n[Generator] Batch Attempt ${attempt}/3 starting... (Count: ${input.count}, Type: ${input.questionType || 'Mixed'})`);
      const collectedQuestions: GeneratedQuestion[] = [];
      let collectedSummary: string | undefined;
      let generationFeedback = feedback;

      for (let subAttempt = 0; subAttempt < 3 && collectedQuestions.length < input.count; subAttempt += 1) {
        const remainingCount = input.count - collectedQuestions.length;
        console.log(`  - Sub-Attempt ${subAttempt + 1}: Fetching ${remainingCount} questions from AI...`);
        const partial = await requestQuestionsFromModel(
          {
            ...input,
            count: remainingCount,
          },
          generationFeedback,
        );

        if (!collectedSummary && partial.summary) {
          collectedSummary = partial.summary;
        }

        if (partial.questions.length === 0) {
          console.warn(`    ! AI returned zero questions. Retrying sub-attempt...`);
          generationFeedback = [
            `Return exactly ${remainingCount} complete questions in a JSON array. Do not return zero items.`,
          ];
          continue;
        }

        collectedQuestions.push(...partial.questions);
        console.log(`    + Received ${partial.questions.length} questions. (Progress: ${collectedQuestions.length}/${input.count})`);

        if (collectedQuestions.length < input.count) {
          generationFeedback = buildRetryFeedback(
            remainingCount,
            partial.questions.length,
            input.count - collectedQuestions.length,
          );
        }
      }

      const result = {
        questions:
          collectedQuestions.length > input.count
            ? collectedQuestions.slice(0, input.count)
            : collectedQuestions,
        summary: collectedSummary,
      };

      console.log(`  - Validating ${result.questions.length} questions...`);
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
        console.log(`[Generator] SUCCESS: Batch Validation passed on attempt ${attempt}.`);
        return {
          title: input.title || 'Exam',
          questions: result.questions,
          summary: result.summary,
          source: 'ai',
          attempts: attempt,
          validation,
        };
      }

      console.warn(`[Generator] WARNING: Batch Validation failed on attempt ${attempt}. Reasons (first 2):`, validation.reasons.slice(0, 2));

      // 재시도 실패 원인 진단을 돕기 위해, 마지막 시도에서 실패한 문항의 실제 내용을 로그로 남긴다.
      // (normalizer/validator 수정 없이도 "AI가 실제로 어떤 포맷을 반환했는지"를 바로 확인할 수 있게 함.)
      // 개인정보가 아닌 문항 텍스트만 출력하고, 길이를 잘라 로그 폭주를 방지한다.
      if (attempt === 3) {
        const truncate = (value: unknown, max = 400) => {
          const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
          return text.length > max ? `${text.slice(0, max)}…(+${text.length - max}자)` : text;
        };
        console.warn(
          `[Generator] DIAGNOSTIC: Dumping failed questions (subject=${input.subject}, questionType=${input.questionType ?? 'N/A'}, difficulty=${input.difficulty})`,
        );
        result.questions.forEach((q: any, i: number) => {
          console.warn(
            `  [Q${i + 1}] topic=${truncate(q?.topic, 80)}\n       stem=${truncate(q?.stem)}\n       stimulus=${truncate(q?.stimulus)}\n       choices=${truncate(q?.choices, 200)}\n       answer=${truncate(q?.answer, 80)}`,
          );
        });
        console.warn(`[Generator] DIAGNOSTIC: All validation reasons:`, validation.reasons);
      }

      feedback = validation.reasons;
    } catch (error: any) {
      console.error(`[Generator] ERROR on attempt ${attempt}:`, error.message);
      if (attempt === 3) {
        throw error;
      }
    }
  }

  const suffix = feedback.length > 0 ? `\n사유: ${feedback.slice(0, 2).join(', ')}` : '';
  throw new QuestionGenerationError(`3회 시도 후에도 유효한 결과를 얻지 못했습니다.${suffix}`, feedback);
}


export async function generateValidatedQuestions(
  input: GenerateValidatedQuestionsInput,
): Promise<GenerateValidatedQuestionsOutput> {
  if (input.count <= MAX_BATCH_SIZE) {
    return generateValidatedQuestionBatch(input);
  }

  const mergedQuestions: GeneratedQuestion[] = [];
  let mergedSummary: string | undefined;

  // 병렬 처리를 위한 배치 입력 그룹 생성
  const batchRequests: Promise<GenerateValidatedQuestionsOutput>[] = [];
  for (let offset = 0; offset < input.count; offset += MAX_BATCH_SIZE) {
    batchRequests.push(
      generateValidatedQuestionBatch({
        ...input,
        count: Math.min(MAX_BATCH_SIZE, input.count - offset),
      })
    );
  }

  console.log(`[Generator] Starting ${batchRequests.length} batches IN PARALLEL...`);

  // 모든 배치를 병렬로 실행
  const results = await Promise.all(batchRequests);

  // 결과 병합 및 ID 재할당
  results.forEach((batch, batchIdx) => {
    const offset = batchIdx * MAX_BATCH_SIZE;
    if (!mergedSummary && batch.summary) {
      mergedSummary = batch.summary;
    }
    mergedQuestions.push(
      ...batch.questions.map((q, i) => ({ ...q, id: offset + i + 1 }))
    );
  });

  return {
    title: input.title || 'Combined Exam',
    questions: mergedQuestions.slice(0, input.count),
    summary: mergedSummary,
    source: 'ai',
    attempts: 1, // 개별 배치는 이미 여러 번 시도했을 수 있음
    validation: { isValid: true, reasons: [], warnings: [], issueCounts: {} },
  };
}

