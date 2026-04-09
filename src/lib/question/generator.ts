import { type DifficultyLevel, type SchoolLevel } from './generationRules.ts';
import { buildQuestionPrompt } from './promptBuilder.ts';
import { validateGeneratedQuestions, type ValidationResult } from './validator.ts';
import { type SubjectKey } from './subjectConfig.ts';
import { normalizeChoiceText } from './normalizeChoiceText.ts';
import { resolveAnswerFromChoices as resolveAnswerFromChoicesLoose } from './answerMatching.ts';
import {
  isEnglishIrrelevantSentenceType,
  isEnglishOrderArrangementType as isStandardEnglishOrderArrangementType,
  standardizeEnglishIrrelevantSentence,
  standardizeEnglishOrderArrangement,
} from './englishStandardizer.ts';

export type GeneratedQuestion = {
  id: number;
  topic: string;
  type: 'multiple';
  stem: string;
  choices: string[];
  answer: string;
  explanation: string;
  stimulus?: string | null;
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

const ORDER_MARKER_REGEX = /(\(\s*([ABC])\s*\)|\[\s*([ABC])\s*\])/gi;
const CANONICAL_ORDER_CHOICES = [
  '(A) - (C) - (B)',
  '(B) - (A) - (C)',
  '(B) - (C) - (A)',
  '(C) - (A) - (B)',
  '(C) - (B) - (A)',
];

function countEnglishWords(value: string) {
  return (value.match(/[A-Za-z]+/g) ?? []).length;
}

function stripOrderArrangementArtifacts(value: string) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/<\/?u>/gi, '')
    .replace(/\[\/?u\]/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function extractOrderSections(text: string) {
  const normalized = stripOrderArrangementArtifacts(text).replace(
    /([^\n])\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])/g,
    '$1\n$2',
  );

  const matches = [...normalized.matchAll(ORDER_MARKER_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  return matches.map((match, index) => {
    const marker = match[1];
    const label = (match[2] || match[3] || '').toUpperCase();
    const start = (match.index ?? 0) + marker.length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? normalized.length : normalized.length;
    const content = normalized
      .slice(start, end)
      .replace(/^\s*[:\-–—]?\s*/, '')
      .trim();

    return {
      label,
      content,
    };
  }).filter((section) => ['A', 'B', 'C'].includes(section.label) && section.content.length > 0);
}

function reconstructOrderStem(
  sections: Array<{ label: string; content: string }>,
  fallbackStem: string,
) {
  const ordered = ['A', 'B', 'C']
    .map((label) => sections.find((section) => section.label === label))
    .filter((section): section is { label: string; content: string } => Boolean(section));

  if (ordered.length < 3) {
    return stripOrderArrangementArtifacts(fallbackStem);
  }

  return ordered
    .map((section) => `(${section.label}) ${section.content.trim()}`)
    .join('\n\n')
    .trim();
}

function extractIntroFromText(text: string) {
  const normalized = stripOrderArrangementArtifacts(text);
  if (!normalized) {
    return null;
  }

  const beforeMarker = normalized.replace(/\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])[\s\S]*$/i, '').trim();
  if (!beforeMarker) {
    return null;
  }

  const lines = beforeMarker
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (!line) return false;
      if (!/[A-Za-z]/.test(line)) return false;
      if (/[\u3131-\u314E\uAC00-\uD7A3]/u.test(line)) return false;
      if (/^\*/.test(line)) return false;
      if (/^(?:\d+|[①-⑤])(?:\s|$)/.test(line)) return false;
      if (/^\(?[A-C]\)?\s*[-–—]/i.test(line)) return false;
      return true;
    });

  const intro = lines.join('\n').trim();
  return /[A-Za-z]{12,}/.test(intro) || countEnglishWords(intro) >= 5 ? intro : null;
}

function promoteIntroFromSections(sections: Array<{ label: string; content: string }>) {
  const nextSections = sections.map((section) => ({ ...section }));

  for (const label of ['A', 'B', 'C']) {
    const target = nextSections.find((section) => section.label === label);
    if (!target) continue;

    const sentenceMatch = target.content.match(/^(.+?[.!?](?=\s|$))(?:\s+|$)([\s\S]*)$/);
    if (!sentenceMatch) continue;

    const intro = sentenceMatch[1].trim();
    const remaining = sentenceMatch[2].trim();
    if ((countEnglishWords(intro) < 5 && !/[A-Za-z]{12,}/.test(intro)) || countEnglishWords(remaining) < 5) {
      continue;
    }

    target.content = remaining;
    return {
      stimulus: intro,
      sections: nextSections,
    };
  }

  return {
    stimulus: null,
    sections: nextSections,
  };
}

function isEnglishOrderArrangementType(
  subject: SubjectKey,
  questionType: string | undefined,
  raw: any,
) {
  const subjectText = String(subject ?? '').toLowerCase();
  const selectionText = String(questionType ?? '');
  const topicText = String(raw?.topic ?? '');
  const stemText = String(raw?.stem ?? raw?.question ?? '');

  return (
    subjectText.includes('english') &&
    (selectionText.includes('순서 배열') ||
      topicText.includes('순서 배열') ||
      /\(\s*A\s*\)/i.test(stemText))
  );
}

function repairEnglishOrderArrangement(
  stem: string,
  stimulus: string | null,
  materialText: string,
) {
  const normalizedStem = stripOrderArrangementArtifacts(stem);
  const normalizedStimulus = stripOrderArrangementArtifacts(stimulus ?? '');
  const sections = extractOrderSections(`${normalizedStimulus}\n${normalizedStem}`);

  let repairedStimulus =
    extractIntroFromText(normalizedStimulus) ??
    extractIntroFromText(normalizedStem) ??
    extractEnglishIntroFromMaterial(materialText);

  let repairedSections = sections;

  if (!repairedStimulus && repairedSections.length > 0) {
    const promoted = promoteIntroFromSections(repairedSections);
    repairedStimulus = promoted.stimulus;
    repairedSections = promoted.sections;
  }

  return {
    stem: reconstructOrderStem(repairedSections, normalizedStem),
    stimulus: repairedStimulus || null,
  };
}

function extractEnglishIntroFromMaterial(materialText: string) {
  const normalized = materialText.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return null;
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const cleaned = paragraph
      .replace(/<\/?u>/gi, '')
      .replace(/\[\/?u\]/gi, '')
      .replace(/\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])[\s\S]*$/i, '')
      .trim();

    if (
      !/[\u3131-\u314E\uAC00-\uD7A3]/u.test(cleaned) &&
      (/[A-Za-z]{12,}/.test(cleaned) || countEnglishWords(cleaned) >= 5)
    ) {
      return cleaned;
    }
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const englishLines = lines.filter(
    (line) =>
      (/[A-Za-z]{12,}/.test(line) || countEnglishWords(line) >= 5) &&
      !/[\u3131-\u314E\uAC00-\uD7A3]/u.test(line) &&
      !/^\*/.test(line) &&
      !/\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\]/i.test(line),
  );

  return englishLines.length > 0 ? englishLines.join('\n').trim() : null;
}

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

function splitChoiceStringSafely(value: string) {
  const prepared = value
    .replace(/\r\n/g, '\n')
    .replace(/\s*\|\s*/g, '\n')
    .replace(/\s\/\s/g, '\n')
    .replace(/(?:^|\s)([\u2460-\u2464])\s+/gu, '\n$1 ')
    .replace(/(?:^|\s)([1-5]|[A-Ea-e])[\.\)]\s+/g, '\n$1. ');

  return prepared
    .split(/\n+/)
    .map((part) => normalizeChoiceText(part))
    .filter((part) => part.length > 0);
}

function normalizeAnswerComparison(value: string) {
  return normalizeChoiceText(value)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\\\(|\\\)|\\\[|\\\]|\$|\{|\}/g, '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\sqrt/g, 'root')
    .replace(/\\times/g, '*')
    .replace(/\\div/g, '/')
    .trim();
}

function parseLetterChoiceIndex(value: string): number | null {
  const compact = value.trim().toUpperCase();
  const match = compact.match(/^(?:ANSWER[:\s]*)?([A-E])(?:[.)])?$/);
  if (!match) {
    return null;
  }

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

function resolveAnswerFromChoices(rawAnswer: unknown, choices: string[]) {
  if (typeof rawAnswer === 'number') {
    const idx = Math.floor(rawAnswer) - 1;
    return choices[idx] || '';
  }

  if (typeof rawAnswer !== 'string') {
    return '';
  }

  const trimmed = rawAnswer.trim();
  if (!trimmed) {
    return '';
  }

  const numericIndex = parseAnswerChoiceIndex(trimmed);
  if (numericIndex !== null) {
    return choices[numericIndex] || '';
  }

  const answerWithoutLeadingLabel = trimmed
    .replace(/^(?:answer|correct answer)\s*[:\-]?\s*/i, '')
    .replace(/^(?:정답|답)\s*[:：\-]?\s*/u, '')
    .trim();

  const labeledIndex = parseAnswerChoiceIndex(answerWithoutLeadingLabel);
  if (labeledIndex !== null) {
    return choices[labeledIndex] || '';
  }

  const normalizedAnswer = normalizeAnswerComparison(answerWithoutLeadingLabel);
  if (!normalizedAnswer) {
    return normalizeChoiceText(answerWithoutLeadingLabel);
  }

  const exactMatches = choices.filter(
    (choice) => normalizeAnswerComparison(choice) === normalizedAnswer,
  );
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  const containedMatches =
    normalizedAnswer.length >= 2
      ? choices.filter((choice) => {
          const normalizedChoice = normalizeAnswerComparison(choice);
          return (
            normalizedChoice.includes(normalizedAnswer) ||
            normalizedAnswer.includes(normalizedChoice)
          );
        })
      : [];
  if (containedMatches.length === 1) {
    return containedMatches[0];
  }

  return normalizeChoiceText(answerWithoutLeadingLabel);
}

function extractRawChoices(raw: any): string[] {
  const candidate = raw.choices ?? raw.options ?? raw.items;

  if (Array.isArray(candidate)) {
    return candidate.flatMap((item) => {
      if (typeof item === 'string') {
        return splitChoiceStringSafely(item);
      }
      if (item && typeof item === 'object') {
        const text = item.text ?? item.label ?? item.value ?? item.content;
        return typeof text === 'string' ? splitChoiceStringSafely(text) : [];
      }
      return [];
    });
  }

  if (typeof candidate === 'string') {
    return splitChoiceStringSafely(candidate);
  }

  return [];
}

function normalizeOrderArrangementChoices(rawAnswer: unknown) {
  return {
    choices: [...CANONICAL_ORDER_CHOICES],
    answer: resolveAnswerFromChoicesLoose(rawAnswer, CANONICAL_ORDER_CHOICES),
  };
}

function normalizeQuestion(
  raw: any,
  index: number,
  context: Pick<GenerateValidatedQuestionsInput, 'subject' | 'questionType' | 'materialText'>,
): GeneratedQuestion {
  // Keep only real options from the model; validation should fail on missing choices,
  // not on placeholders we injected ourselves.
  let choices = extractRawChoices(raw)
    .filter((choice: string) => choice.length > 0)
    .slice(0, 5);

  let answerStr = resolveAnswerFromChoicesLoose(raw.answer, choices);
  let stimulus =
    typeof raw.stimulus === 'string' && raw.stimulus.trim().length > 0
      ? raw.stimulus.trim()
      : null;
  let stem = raw.stem || raw.question || '';

  if (
    isStandardEnglishOrderArrangementType({
      subject: context.subject,
      questionType: context.questionType,
      topic: raw?.topic,
      stem,
    })
  ) {
    const standardized = standardizeEnglishOrderArrangement({
      stem,
      stimulus,
      materialText: context.materialText,
      answer: raw.answer,
    });
    stem = standardized.stem;
    stimulus = standardized.stimulus;
    choices = standardized.choices;
    answerStr = standardized.answer || resolveAnswerFromChoicesLoose(raw.answer, choices);
  }

  if (
    isEnglishIrrelevantSentenceType({
      subject: context.subject,
      questionType: context.questionType,
      topic: raw?.topic,
      stem,
    })
  ) {
    const standardized = standardizeEnglishIrrelevantSentence({
      stem,
      stimulus,
      materialText: context.materialText,
      choices,
      answer: raw.answer,
    });
    stem = standardized.stem;
    stimulus = standardized.stimulus;
    choices = standardized.choices;
    answerStr = standardized.answer || resolveAnswerFromChoicesLoose(raw.answer, choices);
  }

  return {
    id: index + 1,
    topic: raw.topic || '문항',
    type: 'multiple',
    stem,
    choices,
    answer: answerStr,
    explanation: raw.explanation || '',
    stimulus,
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
    ? rawQuestions.map((q: any, i: number) =>
        normalizeQuestion(q, i, {
          subject: input.subject,
          questionType: input.questionType,
          materialText: input.materialText,
        }),
      )
    : [normalizeQuestion({
        stem: `AI 응답 파싱 실패 (내용: ${rawJson.substring(0, 50)}...)`,
        answer: '확인',
        choices: ['확인', '-', '-', '-', '-'],
        explanation: 'JSON 구조를 확인하세요.',
      }, 0, {
        subject: input.subject,
        questionType: input.questionType,
        materialText: input.materialText,
      })];

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
