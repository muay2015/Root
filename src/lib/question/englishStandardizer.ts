import { resolveAnswerFromChoices } from './answerMatching.ts';
import type { SubjectKey } from './subjectConfig.ts';

export const CANONICAL_ORDER_CHOICES = [
  '(A) - (C) - (B)',
  '(B) - (A) - (C)',
  '(B) - (C) - (A)',
  '(C) - (A) - (B)',
  '(C) - (B) - (A)',
];

export const CANONICAL_IRRELEVANT_SENTENCE_CHOICES = [
  '(1)',
  '(2)',
  '(3)',
  '(4)',
  '(5)',
];
export const CANONICAL_IRRELEVANT_SENTENCE_INSTRUCTION =
  '다음 글에서 전체 흐름과 관계 없는 문장은?';

const ORDER_MARKER_REGEX = /(\(\s*([ABC])\s*\)|\[\s*([ABC])\s*\])/gi;

export function isEnglishSubject(subject: SubjectKey | string | null | undefined) {
  return String(subject ?? '').toLowerCase().includes('english');
}

export function isEnglishOrderArrangementType(params: {
  subject: SubjectKey | string | null | undefined;
  questionType?: string;
  topic?: string;
  stem?: string;
}) {
  const selectionText = String(params.questionType ?? '');
  const topicText = String(params.topic ?? '');
  const stemText = String(params.stem ?? '');

  return (
    isEnglishSubject(params.subject) &&
    (selectionText.includes('순서 배열') ||
      topicText.includes('순서 배열') ||
      /\(\s*A\s*\)/i.test(stemText))
  );
}

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

export function countEnglishWords(value: string) {
  return (value.match(/[A-Za-z]+/g) ?? []).length;
}

export function normalizeEnglishPlainText(value: string | null | undefined) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/<\/?u>/gi, '')
    .replace(/\[\/?u\]/gi, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

export function extractOrderArrangementSections(text: string) {
  const normalized = normalizeEnglishPlainText(text).replace(
    /([^\n])\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])/g,
    '$1\n$2',
  );

  const matches = [...normalized.matchAll(ORDER_MARKER_REGEX)];
  if (matches.length === 0) {
    return [];
  }

  return matches
    .map((match, index) => {
      const marker = match[1];
      const label = (match[2] || match[3] || '').toUpperCase();
      const start = (match.index ?? 0) + marker.length;
      const end =
        index + 1 < matches.length
          ? matches[index + 1].index ?? normalized.length
          : normalized.length;
      const content = normalized
        .slice(start, end)
        .replace(/^\s*[:\-–—]?\s*/, '')
        .trim();

      return { label, content };
    })
    .filter(
      (section): section is { label: 'A' | 'B' | 'C'; content: string } =>
        ['A', 'B', 'C'].includes(section.label) && section.content.length > 0,
    );
}

export function reconstructOrderArrangementStem(
  sections: Array<{ label: string; content: string }>,
  fallbackStem = '',
) {
  const ordered = ['A', 'B', 'C']
    .map((label) => sections.find((section) => section.label === label))
    .filter((section): section is { label: string; content: string } => Boolean(section));

  if (ordered.length < 3) {
    return normalizeEnglishPlainText(fallbackStem);
  }

  return ordered
    .map((section) => `(${section.label}) ${section.content.trim()}`)
    .join('\n\n')
    .trim();
}

export function extractOrderArrangementIntro(text: string | null | undefined) {
  const normalized = normalizeEnglishPlainText(text);
  if (!normalized) {
    return null;
  }

  const beforeMarker = normalized.replace(
    /\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])[\s\S]*$/i,
    '',
  ).trim();
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
  if (!intro) {
    return null;
  }

  return /[A-Za-z]{12,}/.test(intro) || countEnglishWords(intro) >= 5 ? intro : null;
}

export function extractEnglishIntroFromMaterial(materialText: string) {
  const normalized = normalizeEnglishPlainText(materialText);
  if (!normalized) {
    return null;
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    const intro = extractOrderArrangementIntro(paragraph);
    if (intro) {
      return intro;
    }
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const englishLines = lines.filter(
    (line) =>
      !/[\u3131-\u314E\uAC00-\uD7A3]/u.test(line) &&
      !/^\*/.test(line) &&
      !/\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\]/i.test(line) &&
      (/[A-Za-z]{12,}/.test(line) || countEnglishWords(line) >= 5),
  );

  return englishLines.length > 0 ? englishLines.join('\n').trim() : null;
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
    return { stimulus: intro, sections: nextSections };
  }

  return { stimulus: null, sections: nextSections };
}

export function standardizeEnglishOrderArrangement(params: {
  stem: string;
  stimulus?: string | null;
  materialText?: string;
  answer?: unknown;
}) {
  const normalizedStem = normalizeEnglishPlainText(params.stem);
  const normalizedStimulus = normalizeEnglishPlainText(params.stimulus);
  let sections = extractOrderArrangementSections(`${normalizedStimulus}\n${normalizedStem}`);

  let stimulus =
    extractOrderArrangementIntro(normalizedStimulus) ??
    extractOrderArrangementIntro(normalizedStem) ??
    extractEnglishIntroFromMaterial(params.materialText ?? '');

  if (!stimulus && sections.length > 0) {
    const promoted = promoteIntroFromSections(sections);
    stimulus = promoted.stimulus;
    sections = promoted.sections;
  }

  const choices = [...CANONICAL_ORDER_CHOICES];
  const answer = resolveAnswerFromChoices(params.answer, choices);

  return {
    stem: reconstructOrderArrangementStem(sections, normalizedStem),
    stimulus: stimulus || null,
    choices,
    answer,
    sections,
  };
}

export function normalizeOrderArrangementChoiceDisplay(
  choices: (string | { value: string; display: string })[],
) {
  const isNumericOnly =
    choices.length === 5 &&
    choices.every((choice) => {
      const text =
        typeof choice === 'object' && choice !== null
          ? choice.display ?? choice.value
          : String(choice);
      return /^(?:[1-5]|[①-⑤])$/.test(text.trim());
    });

  if (!isNumericOnly) {
    return choices;
  }

  return choices.map((choice, index) => ({
    value:
      typeof choice === 'object' && choice !== null
        ? choice.value ?? String(index + 1)
        : String(choice),
    display: CANONICAL_ORDER_CHOICES[index] ?? String(index + 1),
  }));
}

function normalizeIrrelevantSentenceSource(value: string | null | undefined) {
  return normalizeEnglishPlainText(value)
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isNumericChoiceLine(line: string) {
  return /^(?:\(?[1-5]\)?|[①-⑤])(?:\s*[.)-]?\s*)?$/.test(line.trim());
}

function stripNumericChoiceLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isNumericChoiceLine(line))
    .join('\n')
    .trim();
}

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
    if (match?.[1]) {
      return match[1].trim();
    }
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
  if (!normalized) {
    return false;
  }

  return (
    /overall flow/i.test(normalized) ||
    normalized.includes('관계 없는 문장') ||
    normalized.includes('관계없는 문장') ||
    normalized.includes('고르시오') ||
    normalized.includes('가장 적절하지 않은 것은')
  );
}

function removeInstructionFromText(text: string, instruction: string | null) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !isIrrelevantInstructionLike(line));

  let nextText = lines.join('\n').trim();
  if (!instruction) {
    return nextText;
  }

  const escaped = instruction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  nextText = nextText.replace(new RegExp(escaped, 'g'), '').trim();
  return nextText;
}

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

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function injectIrrelevantSentenceMarkers(passage: string, choiceSentences: string[]) {
  let nextPassage = passage;
  let replacedCount = 0;

  choiceSentences.forEach((sentence, index) => {
    if (!sentence) {
      return;
    }

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

  return {
    passage: nextPassage.trim(),
    replacedCount,
  };
}

function stripExistingIrrelevantMarkers(text: string) {
  return text.replace(/\(\s*[1-5]\s*\)\s*/g, '').trim();
}

function stripLeadingSentenceEnumeration(text: string) {
  return text
    .replace(/^\s*\d+\s*[.)]\s*/g, '')
    .replace(/^\s*[①-⑤]\s*/g, '')
    .trim();
}

function stripTrailingIrrelevantPrompt(text: string) {
  return text
    .replace(
      /\s*(?:가장\s*적절하지\s*않은\s*것은\??|다음\s*글에서\s*전체\s*흐름과\s*관계\s*없는\s*문장(?:을)?\s*(?:고르시오)?\.?\??)\s*$/giu,
      '',
    )
    .trim();
}

function isValidIrrelevantSentenceCandidate(text: string) {
  const normalized = stripTrailingIrrelevantPrompt(stripLeadingSentenceEnumeration(text));
  if (!normalized) {
    return false;
  }

  if (isIrrelevantInstructionLike(normalized)) {
    return false;
  }

  return /[A-Za-z]/.test(normalized) && normalized.length >= 20;
}

function splitIrrelevantSentenceCandidates(text: string) {
  const normalized = stripExistingIrrelevantMarkers(text)
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return [];
  }

  const primary = normalized
    .split(/(?<=[.!?])\s+(?=[A-Z])/)
    .map((sentence) => stripTrailingIrrelevantPrompt(stripLeadingSentenceEnumeration(sentence)))
    .filter(isValidIrrelevantSentenceCandidate);

  if (primary.length >= 5) {
    return primary;
  }

  const fallback = normalized
    .split(/\n+/)
    .map((line) => stripTrailingIrrelevantPrompt(stripLeadingSentenceEnumeration(line)))
    .filter(isValidIrrelevantSentenceCandidate);

  return fallback.length > primary.length ? fallback : primary;
}

function buildCanonicalIrrelevantPassage(passage: string, choiceSentences: string[]) {
  const injected = injectIrrelevantSentenceMarkers(passage, choiceSentences);
  const existingNumberedCount = new Set(injected.passage.match(/\([1-5]\)/g) ?? []).size;

  if (existingNumberedCount === 5) {
    return {
      passage: stripTrailingIrrelevantPrompt(injected.passage),
      numberedCount: 5,
    };
  }

  const candidates = splitIrrelevantSentenceCandidates(injected.passage || passage);
  if (candidates.length === 0) {
    return {
      passage: injected.passage || passage,
      numberedCount: existingNumberedCount,
    };
  }

  const numberedPassage = candidates
    .slice(0, 5)
    .map((sentence, index) => {
      const cleanSentence = stripLeadingSentenceEnumeration(sentence);
      return `${CANONICAL_IRRELEVANT_SENTENCE_CHOICES[index]} ${cleanSentence}`;
    })
    .join(' ')
    .trim();

  return {
    passage: numberedPassage,
    numberedCount: Math.min(candidates.length, 5),
  };
}

function extractIrrelevantPassage(text: string, instruction: string | null) {
  const withoutInstruction = removeInstructionFromText(text, instruction);
  return stripNumericChoiceLines(withoutInstruction)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

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
  const basePassage =
    extractIrrelevantPassage(primarySource, instruction) ||
    extractIrrelevantPassage(combinedSource, instruction);

  const choiceSentences = (params.choices ?? [])
    .map(normalizeIrrelevantChoiceSentence)
    .filter(Boolean)
    .slice(0, 5);

  const canonicalPassage = buildCanonicalIrrelevantPassage(basePassage, choiceSentences);
  const prompt = [CANONICAL_IRRELEVANT_SENTENCE_INSTRUCTION, canonicalPassage.passage || basePassage]
    .filter((part) => typeof part === 'string' && part.trim().length > 0)
    .join('\n\n')
    .trim();

  const choices = [...CANONICAL_IRRELEVANT_SENTENCE_CHOICES];
  const answer = resolveAnswerFromChoices(params.answer, choices);

  return {
    stem: prompt || combinedSource,
    stimulus: null,
    choices,
    answer,
    instruction: CANONICAL_IRRELEVANT_SENTENCE_INSTRUCTION,
    passage: canonicalPassage.passage || basePassage,
    choiceSentences,
    numberedCount: canonicalPassage.numberedCount,
  };
}
