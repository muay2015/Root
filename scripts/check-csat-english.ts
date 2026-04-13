import dotenv from 'dotenv';
import OpenAI from 'openai';
import {
  generateValidatedQuestions,
  QuestionGenerationError,
} from '../src/lib/question/generator.ts';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true });

function sanitizeEnvStyleValue(value?: string) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/^['"]+|['"]+$/g, '').trim();
}

const ENGLISH_TYPES = [
  '빈칸 추론',
  '요약문 완성',
  '어법/어휘',
  '심경/분위기',
  '문장 삽입',
  '순서 배열',
  '관계없는 문장',
] as const;

const SAMPLE_MATERIAL = [
  'Modern cities are being reshaped by environmental, technological, and social pressures in ways that are not always immediately visible.',
  'Some neighborhoods redesign streets to reduce flooding, yet local residents often evaluate those projects by whether they also preserve familiar routines and public trust.',
  'Schools and libraries have expanded into support hubs, which shows that urban institutions are now expected to provide stability as well as information.',
  'At the same time, digital systems allow governments to react quickly, but the speed of response can create new concerns about privacy, fairness, and accountability.',
  'As a result, successful policy is rarely judged only by technical efficiency; it is judged by whether people feel that the city still works for them.',
  'This tension explains why even practical reforms can produce debate, because citizens measure public change through both outcomes and social meaning.',
].join(' ');

function parseDifficultyArg() {
  const cliArg = process.argv.find((arg) => arg.startsWith('--difficulty='));
  const raw =
    cliArg?.split('=')[1] ??
    process.env.CSAT_CHECK_DIFFICULTY ??
    'medium';

  return raw === 'easy' || raw === 'medium' || raw === 'hard' ? raw : 'medium';
}

function compact(value: unknown, max = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function run() {
  const apiKey = sanitizeEnvStyleValue(process.env.OPENAI_API_KEY);
  const model = sanitizeEnvStyleValue(process.env.OPENAI_MODEL) || 'gpt-4o';
  const difficulty = parseDifficultyArg();

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing.');
  }

  const openai = new OpenAI({ apiKey });
  process.stdout.write(`[INFO] difficulty=${difficulty}, model=${model}\n`);
  const results: Array<{
    type: string;
    ok: boolean;
    attempts?: number;
    title?: string;
    stem?: string;
    stimulus?: string | null;
    choices?: string[];
    answer?: string;
    reasons?: string[];
    error?: string;
  }> = [];

  for (const questionType of ENGLISH_TYPES) {
    process.stdout.write(`\n[CHECK] ${questionType}\n`);

    try {
      const generated = await generateValidatedQuestions({
        openai,
        model,
        materialText: SAMPLE_MATERIAL,
        count: 1,
        subject: 'high_english',
        questionType,
        difficulty,
        schoolLevel: 'csat',
        title: `check-${questionType}`,
        topic: `sample-${questionType}`,
        builderMode: 'csat',
      });

      const first = generated.questions[0];
      results.push({
        type: questionType,
        ok: generated.validation.isValid,
        attempts: generated.attempts,
        title: generated.title,
        stem: first?.stem,
        stimulus: first?.stimulus,
        choices: first?.choices,
        answer: first?.answer,
        reasons: generated.validation.reasons,
      });

      process.stdout.write(`PASS in ${generated.attempts} attempt(s)\n`);
      process.stdout.write(`stem: ${compact(first?.stem)}\n`);
      if (first?.stimulus) {
        process.stdout.write(`stimulus: ${compact(first.stimulus)}\n`);
      }
      process.stdout.write(`choices: ${(first?.choices ?? []).join(' | ')}\n`);
      process.stdout.write(`answer: ${first?.answer ?? ''}\n`);
    } catch (error) {
      const message =
        error instanceof QuestionGenerationError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Unknown error';

      results.push({
        type: questionType,
        ok: false,
        error: message,
      });

      process.stdout.write(`FAIL: ${message}\n`);
    }
  }

  const failed = results.filter((result) => !result.ok);

  process.stdout.write('\n===== SUMMARY =====\n');
  results.forEach((result) => {
    process.stdout.write(`${result.ok ? 'OK  ' : 'FAIL'} ${result.type}\n`);
  });

  if (failed.length > 0) {
    process.stdout.write('\n===== FAILURES =====\n');
    failed.forEach((result) => {
      process.stdout.write(`${result.type}: ${result.error ?? (result.reasons ?? []).join(' | ')}\n`);
    });
    process.exitCode = 1;
    return;
  }

  process.stdout.write('\nAll CSAT English type checks passed.\n');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
