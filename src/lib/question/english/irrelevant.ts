import { SubjectKey } from '../subjectConfig';
import { resolveAnswerFromChoices } from '../answerMatching';
import { isEnglishSubject, normalizeEnglishPlainText, escapeRegex } from './core';

export const CANONICAL_IRRELEVANT_SENTENCE_CHOICES = ['(1)', '(2)', '(3)', '(4)', '(5)'];
export const CANONICAL_IRRELEVANT_SENTENCE_INSTRUCTION = '다음 글에서 전체 흐름과 관계 없는 문장은?';

/**
 * 관계없는 문장 유형 판별
 */
export function isEnglishIrrelevantSentenceType(params: {
  subject: SubjectKey | string | null | undefined;
  questionType?: string;
  topic?: string;
  stem?: string;
}) {
  const selectionText = String(params.questionType ?? '').toLowerCase();
  const topicText = String(params.topic ?? '').toLowerCase();
  const stemText = String(params.stem ?? '').toLowerCase();
  const rawSelectionText = String(params.questionType ?? '');
  const rawTopicText = String(params.topic ?? '');
  const rawStemText = String(params.stem ?? '');

  return (
    isEnglishSubject(params.subject) &&
    (selectionText.includes('irrelevant') ||
      selectionText.includes('unrelated') ||
      topicText.includes('irrelevant') ||
      topicText.includes('unrelated') ||
      stemText.includes('overall flow') ||
      rawSelectionText.includes('관계없는 문장') ||
      rawSelectionText.includes('관계 없는 문장') ||
      rawTopicText.includes('관계없는 문장') ||
      rawTopicText.includes('관계 없는 문장') ||
      rawStemText.includes('전체 흐름과 관계 없는 문장은') ||
      rawStemText.includes('전체 흐름과 관계없는 문장은'))
  );
}

function normalizeIrrelevantSentenceSource(value: string | null | undefined) {
  return normalizeEnglishPlainText(value)
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * 숫자형 선택지 라벨인지 확인
 */
function isNumericChoiceLine(line: string) {
  return /^(?:\(?[1-5]\)?|[①-⑤])(?:\s*[.)-]?\s*)?$/.test(line.trim());
}

/**
 * 지문에서 숫자형 선택지 행 제거
 */
function stripNumericChoiceLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isNumericChoiceLine(line))
    .join('\n')
    .trim();
}

/**
 * 발문 추출
 */
function extractIrrelevantInstruction(text: string) {
  const patterns = [
    /(다음 글에서 전체 흐름과 관계 없는 문장은\?)/,
    /(다음 글에서 전체 흐름과 관계없는 문장은\?)/,
    /(다음 글의 흐름과 관계 없는 문장은\?)/,
    /(다음 글의 흐름과 관계없는 문장은\?)/,
    /(Which sentence is irrelevant to the overall flow\?)/i,
    /(Which sentence does not fit the overall flow\?)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return (
    lines.find(
      (line) =>
        /\?$/.test(line) &&
        (/overall flow/i.test(line) ||
          line.includes('관계 없는 문장') ||
          line.includes('관계없는 문장')),
    ) ?? null
  );
}

function isIrrelevantInstructionLike(text: string) {
  const normalized = text.trim();
  if (!normalized) return false;
  return (
    /overall flow/i.test(normalized) ||
    normalized.includes('관계 없는 문장') ||
    normalized.includes('관계없는 문장') ||
    normalized.includes('고르시오') ||
    normalized.includes('가장 적절하지 않은 것은')
  );
}

function removeInstructionFromText(text: string, instruction: string | null) {
  // 발문 텍스트를 먼저 제거한다. dedupeRepeatedPassageBlocks가 공백을 압축하면
  // 발문과 지문이 한 줄로 합쳐질 수 있는데, 이 경우 줄 전체를 isIrrelevantInstructionLike로
  // 필터링하면 지문까지 함께 사라지는 문제가 생긴다. 발문을 먼저 지우면 남은 지문 내용은 보존된다.
  let processed = String(text ?? '');
  if (instruction) {
    const escaped = escapeRegex(instruction);
    processed = processed.replace(new RegExp(escaped, 'g'), ' ');
  }

  const lines = processed
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isIrrelevantInstructionLike(line));

  return lines.join('\n').trim();
}

/**
 * 선택지(문장) 텍스트 정규화
 */
function normalizeIrrelevantChoiceSentence(choice: unknown) {
  const raw =
    typeof choice === 'object' && choice !== null
      ? (choice as { value?: string; display?: string }).value ??
        (choice as { value?: string; display?: string }).display ??
        ''
      : String(choice ?? '');

  return normalizeEnglishPlainText(raw)
    .replace(/^\s*(?:\(?[1-5]\)?|[①-⑤])[\s.)-]*/, '')
    .trim();
}

/**
 * 지문에 (1)~(5) 번호 주입
 */
function injectIrrelevantSentenceMarkers(passage: string, choiceSentences: string[]) {
  let nextPassage = passage;
  let replacedCount = 0;

  choiceSentences.forEach((sentence, index) => {
    if (!sentence) return;

    const marker = CANONICAL_IRRELEVANT_SENTENCE_CHOICES[index] ?? `(${index + 1})`;
    if (nextPassage.includes(`${marker} ${sentence}`) || nextPassage.includes(`${marker}${sentence}`)) {
      replacedCount += 1;
      return;
    }

    const exactRegex = new RegExp(escapeRegex(sentence), 'g');
    if (exactRegex.test(nextPassage)) {
      nextPassage = nextPassage.replace(exactRegex, `${marker} ${sentence}`);
      replacedCount += 1;
    }
  });

  return { passage: nextPassage.trim(), replacedCount };
}

function stripExistingIrrelevantMarkers(text: string) {
  return text.replace(/\(\s*[1-5]\s*\)\s*/g, '').trim();
}

function stripLeadingSentenceEnumeration(text: string) {
  return text.replace(/^\s*\d+\s*[.)]\s*/g, '').replace(/^\s*[①-⑤]\s*/g, '').trim();
}

function stripTrailingIrrelevantPrompt(text: string) {
  return text
    .replace(/\s*(?:가장\s*적절하지\s*않은\s*것은\??|다음\s*글에서\s*전체\s*흐름과\s*관계\s*없는\s*문장(?:을)?\s*(?:고르시오)?\.?\??)\s*$/giu, '')
    .trim();
}

function isValidIrrelevantSentenceCandidate(text: string) {
  const normalized = stripTrailingIrrelevantPrompt(stripLeadingSentenceEnumeration(text));
  if (!normalized) return false;
  if (isIrrelevantInstructionLike(normalized)) return false;
  return /[A-Za-z]/.test(normalized) && normalized.length >= 20;
}

/**
 * 지문을 개별 문장 후보로 분할
 */
function splitIrrelevantSentenceCandidates(text: string) {
  const normalized = stripExistingIrrelevantMarkers(text).replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const primary = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((sentence) => stripTrailingIrrelevantPrompt(stripLeadingSentenceEnumeration(sentence)))
    .filter(isValidIrrelevantSentenceCandidate);

  if (primary.length >= 5) return primary;

  const fallback = normalized
    .split(/\n+/)
    .map((line) => stripTrailingIrrelevantPrompt(stripLeadingSentenceEnumeration(line)))
    .filter(isValidIrrelevantSentenceCandidate);

  return fallback.length > primary.length ? fallback : primary;
}

/**
 * 영어 관계없는 문장 유형 표준화
 */
export function standardizeEnglishIrrelevantSentence(params: {
  stem: string;
  stimulus?: string | null;
  materialText?: string;
  choices?: Array<string | { value?: string; display?: string }>;
  answer?: unknown;
}) {
  const sources = [
    normalizeIrrelevantSentenceSource(params.stem),
    normalizeIrrelevantSentenceSource(params.stimulus),
    normalizeIrrelevantSentenceSource(params.materialText),
  ].filter(Boolean);

  const primarySource = sources[0] ?? '';
  const combinedSource = sources.join('\n\n').trim() || primarySource;
  const instruction =
    extractIrrelevantInstruction(primarySource) ??
    extractIrrelevantInstruction(combinedSource) ??
    CANONICAL_IRRELEVANT_SENTENCE_INSTRUCTION;

  const extractPassage = (txt: string, inst: string) => {
      const withoutInst = removeInstructionFromText(txt, inst);
      return stripNumericChoiceLines(withoutInst).replace(/\n{3,}/g, '\n\n').trim();
  };

  const basePassage = extractPassage(primarySource, instruction) || extractPassage(combinedSource, instruction);
  const choiceSentences = (params.choices ?? []).map(normalizeIrrelevantChoiceSentence).filter(Boolean);

  const injected = injectIrrelevantSentenceMarkers(basePassage, choiceSentences);
  const existingNumberedCount = new Set(injected.passage.match(/\([1-5]\)/g) ?? []).size;

  let finalPassage = injected.passage;
  
  if (existingNumberedCount < 5) {
      const candidates = splitIrrelevantSentenceCandidates(finalPassage || basePassage);
      if (candidates.length >= 5) {
          finalPassage = candidates
            .slice(0, 5)
            .map((sentence, index) => `${CANONICAL_IRRELEVANT_SENTENCE_CHOICES[index]} ${stripLeadingSentenceEnumeration(sentence)}`)
            .join(' ')
            .trim();
      }
  }

  const choices = [...CANONICAL_IRRELEVANT_SENTENCE_CHOICES];
  const answer = resolveAnswerFromChoices(params.answer, choices);

  return {
    stem: `${instruction}\n\n${finalPassage}`.trim(),
    stimulus: null,
    choices,
    answer,
    instruction,
    passage: finalPassage,
  };
}
