import { SubjectKey } from '../subjectConfig';
import { isEnglishSubject, normalizeEnglishPlainText } from './core';

function normalizeSummaryBlankMarkers(value: string): string {
  return value
    .replace(/[\[\uFF3B]\s*a\s*[\]\uFF3D]/gi, '(A)')
    .replace(/[\[\uFF3B]\s*b\s*[\]\uFF3D]/gi, '(B)')
    .replace(/[\(\uFF08]\s*a\s*[\)\uFF09]/gi, '(A)')
    .replace(/[\(\uFF08]\s*b\s*[\)\uFF09]/gi, '(B)')
    .replace(/\bA\s*_{2,}/g, '(A)_______')
    .replace(/\bB\s*_{2,}/g, '(B)_______')
    .replace(/\(\s*A\s*\)\s*(?:_{2,}|blank)?/gi, '(A)_______')
    .replace(/\(\s*B\s*\)\s*(?:_{2,}|blank)?/gi, '(B)_______');
}

function hasSummaryBlanks(value: string) {
  return /\(\s*A\s*\)/i.test(value) && /\(\s*B\s*\)/i.test(value);
}

function looksLikeEnglishSummarySentence(value: string) {
  return hasSummaryBlanks(value) && /[A-Za-z]{5,}/.test(value);
}

function stripLeadingSummaryLabel(value: string) {
  return value.replace(/^(?:Summary|Result|Conclusion)\s*[:\-]?\s*/i, '').trim();
}

function stripBlanksFromSummaryInstruction(value: string) {
  return value
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      const isInstructionLine =
        /가장 적절한 것은\?|빈칸/i.test(trimmed) &&
        /다음 글의 내용을 한 문장으로 요약/i.test(trimmed);

      if (!isInstructionLine) {
        return line;
      }

      return line
        .replace(/\(\s*A\s*\)_{2,}/gi, '(A)')
        .replace(/\(\s*B\s*\)_{2,}/gi, '(B)')
        .replace(/\(\s*A\s*\)\s*_{2,}/gi, '(A)')
        .replace(/\(\s*B\s*\)\s*_{2,}/gi, '(B)');
    })
    .join('\n');
}

export function isEnglishSummaryCompletionType(params: {
  subject: SubjectKey | string | null | undefined;
  questionType?: string;
  topic?: string;
  stem?: string;
  prompt?: string;
  choices?: (string | { value: string; display: string })[];
}) {
  const questionType = String(params.questionType ?? '');
  const topicText = String(params.topic ?? '').toLowerCase();
  const stemText = normalizeSummaryBlankMarkers(
    String(params.stem ?? '').replace(/<[^>]+>/g, '').toLowerCase(),
  );
  const promptText = normalizeSummaryBlankMarkers(String(params.prompt ?? '').toLowerCase());

  const choiceSignals = (params.choices ?? []).some((choice) => {
    const text = typeof choice === 'object' ? choice.display || choice.value : String(choice);
    const words = text.trim().split(/\s+/).filter(Boolean);
    return text.includes('/') || words.length === 2 || words.length === 4;
  });

  const contentSignals =
    questionType.includes('요약문 완성') ||
    questionType.includes('요약문완성') ||
    topicText.includes('summary completion') ||
    topicText.includes('요약문') ||
    stemText.includes('(a)') ||
    promptText.includes('(a)') ||
    (/\(a\)/i.test(stemText) && /\(b\)/i.test(stemText)) ||
    (/\(a\)/i.test(promptText) && /\(b\)/i.test(promptText));

  return isEnglishSubject(params.subject) && (contentSignals || choiceSignals);
}

export function normalizeSummaryCompletionPairText(value: unknown) {
  const normalized = normalizeSummaryBlankMarkers(normalizeEnglishPlainText(String(value ?? '')));
  if (!normalized) return '';

  const slashParts = normalized.split(/\s*\/\s*|\n+/).map((part) => part.trim()).filter(Boolean);
  if (slashParts.length >= 2) return `${slashParts[0]} / ${slashParts[1]}`;

  const commaParts = normalized.split(/\s*,\s*/).map((part) => part.trim()).filter(Boolean);
  if (commaParts.length === 2) return `${commaParts[0]} / ${commaParts[1]}`;

  const words = normalized.trim().split(/\s+/).filter(Boolean);
  if (words.length === 2) return `${words[0]} / ${words[1]}`;
  if (words.length === 4) return `${words[0]} ${words[1]} / ${words[2]} ${words[3]}`;

  return normalized.replace(/\s+/g, ' ').trim();
}

export function normalizeSummaryCompletionChoices(choices: string[]) {
  const cleaned = choices.map((choice) => normalizeEnglishPlainText(choice)).filter(Boolean);

  if (cleaned.length >= 10 && cleaned.length % 2 === 0 && cleaned.every((choice) => !choice.includes('/'))) {
    const repaired: string[] = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      repaired.push(normalizeSummaryCompletionPairText(`${cleaned[i]} / ${cleaned[i + 1]}`));
    }
    return repaired.slice(0, 5);
  }

  return cleaned.map((choice) => normalizeSummaryCompletionPairText(choice));
}

export function standardizeEnglishSummaryCompletion(params: {
  stem: string;
  stimulus?: string | null;
  choices?: string[];
}) {
  let stem = normalizeSummaryBlankMarkers(
    normalizeEnglishPlainText(params.stem.replace(/\r\n/g, '\n')),
  );
  let stimulus =
    typeof params.stimulus === 'string'
      ? normalizeSummaryBlankMarkers(normalizeEnglishPlainText(params.stimulus))
      : null;

  const summarySentenceRegex =
    /((?:Summary|Result|Conclusion)?[:\s-]*[A-Z0-9][^.?!\n]*(?:\(\s*A\s*\)|\[\s*A\s*\])[^.?!\n]*(?:\(\s*B\s*\)|\[\s*B\s*\])[^.?!\n]*[.?!]?|(?:Summary|Result|Conclusion)?[:\s-]*[A-Z0-9][^.?!\n]*(?:\(\s*B\s*\)|\[\s*B\s*\])[^.?!\n]*(?:\(\s*A\s*\)|\[\s*A\s*\])[^.?!\n]*[.?!]?)/gi;

  const candidates = [
    ...stem.split(/\n\s*\n/),
    ...stem.split('\n'),
    ...(stem.match(summarySentenceRegex) ?? []),
  ]
    .map((part) => stripLeadingSummaryLabel(normalizeSummaryBlankMarkers(normalizeEnglishPlainText(part))))
    .filter(Boolean)
    .filter(looksLikeEnglishSummarySentence)
    .sort((a, b) => b.length - a.length);

  const extractedSummary = candidates[0] ?? '';

  if (!stimulus || !hasSummaryBlanks(stimulus) || stimulus.length < extractedSummary.length) {
    if (extractedSummary) {
      stimulus = extractedSummary;
    }
  }

  if (stimulus && hasSummaryBlanks(stimulus)) {
    const normalizedStimulus = normalizeEnglishPlainText(stimulus);
    stem = stem.replace(normalizedStimulus, '').trim();

    const core = normalizedStimulus.slice(0, Math.min(normalizedStimulus.length, 40));
    if (core) {
      stem = stem
        .split('\n')
        .filter((line) => !normalizeEnglishPlainText(line).includes(core))
        .join('\n')
        .trim();
    }
  }

  stem = stripBlanksFromSummaryInstruction(stem);
  stem = stem.replace(/\n{3,}/g, '\n\n').trim();

  const choices = normalizeSummaryCompletionChoices(params.choices ?? []);
  return { stem, stimulus, choices };
}
