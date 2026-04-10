import { resolveAnswerFromChoices as resolveAnswerFromChoicesLoose } from './answerMatching.ts';
import { extractRawChoices } from './generatorParsing.ts';
import { type SubjectKey } from './subjectConfig.ts';
import {
  isEnglishContentMatchingType,
  isEnglishEmotionAtmosphereType,
  isEnglishIrrelevantSentenceType,
  isEnglishOrderArrangementType as isStandardEnglishOrderArrangementType,
  isEnglishSummaryCompletionType,
  normalizeEmotionChangeAnswer,
  normalizeEmotionChangeChoices,
  normalizeSummaryCompletionChoices,
  normalizeSummaryCompletionPairText,
  standardizeEnglishContentMatching,
  standardizeEnglishEmotionAtmosphere,
  standardizeEnglishIrrelevantSentence,
  standardizeEnglishOrderArrangement,
  standardizeEnglishSummaryCompletion,
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

export type NormalizeQuestionContext = {
  subject: SubjectKey;
  questionType?: string;
  materialText: string;
};

function stripLeadingQuestionNumber(value: string) {
  return String(value ?? '')
    .replace(/^\s*(?:question\s*)?\d+\s*[\.\)]\s*/i, '')
    .replace(/^\s*[①-⑳]\s*/u, '')
    .trim();
}

function removeChoiceBlockFromStem(stem: string, choices: string[]) {
  let nextStem = String(stem ?? '');
  if (choices.length < 2) {
    return nextStem;
  }

  const lines = nextStem.split('\n');
  const normalizedChoices = choices.map((choice) => String(choice ?? '').trim()).filter(Boolean);

  while (lines.length > 0) {
    const lastLine = lines[lines.length - 1].trim();
    if (!lastLine) {
      lines.pop();
      continue;
    }

    const matchesChoice = normalizedChoices.some((choice) => lastLine.includes(choice));
    const looksLikeChoiceLine = /^(?:[①-⑤]|\(?[1-5]\)?)[\s.)-]/.test(lastLine);
    if (!matchesChoice && !looksLikeChoiceLine) {
      break;
    }

    lines.pop();
  }

  nextStem = lines.join('\n').trim();

  if (!nextStem) {
    return String(stem ?? '').trim();
  }

  return nextStem;
}

function dedupeBilingualInstruction(stem: string) {
  const nextStem = String(stem ?? '').trim();
  if (!nextStem) {
    return nextStem;
  }

  const lines = nextStem.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return nextStem;
  }

  const instructionPatterns = [
    /다음\s+글.*가장\s+적절한\s+것은\?/,
    /다음\s+빈칸.*가장\s+적절한\s+것은\?/,
    /주어진\s+문장.*가장\s+적절한\s+곳은\?/,
    /다음\s+글의\s+내용과\s+일치(?:하지\s+않는|하는)\s+것은\?/,
  ];

  const englishInstructionPatterns = [
    /which of the following/i,
    /what is the best title/i,
    /what is the main idea/i,
    /where would the following sentence/i,
    /which statement is (?:consistent|inconsistent) with the passage/i,
  ];

  const firstLine = lines[0];
  const secondLine = lines[1];
  const firstIsKoreanInstruction = instructionPatterns.some((pattern) => pattern.test(firstLine));
  const secondIsEnglishInstruction = englishInstructionPatterns.some((pattern) => pattern.test(secondLine));

  if (firstIsKoreanInstruction && secondIsEnglishInstruction) {
    return [firstLine, ...lines.slice(2)].join('\n').trim();
  }

  return nextStem;
}

function stripRepeatedBlankInferenceInstruction(stem: string, questionType?: string) {
  const nextStem = String(stem ?? '').trim();
  const typeText = String(questionType ?? '');
  const isBlankInference =
    typeText.includes('빈칸') || typeText.includes('추론') || /blank/i.test(nextStem);

  if (!isBlankInference || !nextStem) {
    return nextStem;
  }

  const instructionPatterns = [
    /다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?/gi,
    /빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?/gi,
    /what\s+is\s+the\s+most\s+appropriate\s+word\s+for\s+the\s+blank\?/gi,
  ];

  let cleaned = nextStem;
  cleaned = cleaned.replace(
    /^(다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?)\s+[A-E]\s+(?=[A-Za-z])/i,
    '$1\n\n',
  );
  for (const pattern of instructionPatterns) {
    const matches = [...cleaned.matchAll(pattern)];
    if (matches.length <= 1) {
      continue;
    }

    let firstKept = false;
    cleaned = cleaned.replace(pattern, () => {
      if (!firstKept) {
        firstKept = true;
        return '__KEEP__';
      }
      return ' ';
    });
    cleaned = cleaned.replace('__KEEP__', matches[0]?.[0] ?? '');
  }

  const lines = cleaned.split('\n').map((line) => line.trim()).filter(Boolean);
  if (lines.length >= 2) {
    const firstLine = lines[0];
    const remaining = lines.slice(1).join('\n').trim();
    if (
      /다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?/i.test(firstLine) &&
      /가장\s+적절한\s+것은\?$/i.test(remaining)
    ) {
      cleaned = [firstLine, remaining.replace(/\s*가장\s+적절한\s+것은\?\s*$/i, '')]
        .filter(Boolean)
        .join('\n')
        .trim();
    }
  }

  return cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function dedupeRepeatedPassageBlocks(stem: string) {
  const nextStem = String(stem ?? '').trim();
  if (!nextStem) {
    return nextStem;
  }

  const normalizeBlock = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/[“”"']/g, '')
      .trim()
      .toLowerCase();

  const paragraphs = nextStem.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length < 2) {
    return nextStem;
  }

  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const paragraph of paragraphs) {
    const normalized = normalizeBlock(paragraph);
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(paragraph);
  }

  const collapseTrailingRepeatedSequence = (blocks: string[]) => {
    if (blocks.length < 3) {
      return blocks;
    }

    const normalizedBlocks = blocks.map(normalizeBlock);

    for (let size = Math.floor(blocks.length / 2); size >= 1; size -= 1) {
      const tail = normalizedBlocks.slice(-size);
      for (let start = 0; start <= normalizedBlocks.length - size * 2; start += 1) {
        const candidate = normalizedBlocks.slice(start, start + size);
        if (candidate.join('\n') === tail.join('\n')) {
          return blocks.slice(0, blocks.length - size);
        }
      }
    }

    return blocks;
  };

  const collapseTrailingRepeatedSentences = (value: string) => {
    const compact = value.replace(/\s+/g, ' ').trim();
    if (!compact) {
      return value;
    }

    const sentenceMatches = compact.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
    const sentences = sentenceMatches.map((part) => part.trim()).filter(Boolean);
    if (sentences.length < 4) {
      return value;
    }

    const normalizedSentences = sentences.map(normalizeBlock);

    for (let size = Math.floor(sentences.length / 2); size >= 1; size -= 1) {
      const tail = normalizedSentences.slice(-size);
      for (let start = 0; start <= normalizedSentences.length - size * 2; start += 1) {
        const candidate = normalizedSentences.slice(start, start + size);
        if (candidate.join('\n') === tail.join('\n')) {
          return sentences.slice(0, sentences.length - size).join(' ').trim();
        }
      }
    }

    return compact;
  };

  const collapsed = collapseTrailingRepeatedSequence(deduped).join('\n\n').trim();
  return collapseTrailingRepeatedSentences(collapsed);
}

function isEnglishBlankInferenceType(context: NormalizeQuestionContext, raw: any, stem: string) {
  const selectionText = String(context.questionType ?? '');
  const topicText = String(raw?.topic ?? '');
  const stemText = String(stem ?? '');

  return (
    String(context.subject).toLowerCase().includes('english') &&
    (selectionText.includes('빈칸') ||
      topicText.includes('빈칸') ||
      (selectionText.includes('추론') && /_{2,}|\bblank\b/i.test(stemText)))
  );
}

function normalizeBlankInferenceStem(stem: string, answer: string, choices: string[]) {
  let nextStem = String(stem ?? '');
  const blankTokenPattern = /(?:\(\s*[A-Z]\s*\)|\[\s*[A-Z]\s*\])\s*_{2,}|_{2,}|\(\s*\)/g;
  const collapseToSingleVisibleBlank = (value: string) => {
    let blankSeen = false;
    return value
      .replace(/(?:\(\s*[A-Z]\s*\)|\[\s*[A-Z]\s*\])\s*_{2,}/gi, '_________')
      .replace(/_{2,}|\(\s*\)/g, () => {
        if (blankSeen) {
          return ' ';
        }
        blankSeen = true;
        return '_________';
      })
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .trim();
  };
  const removeVisibleBlank = (value: string) =>
    value
      .replace(blankTokenPattern, ' ')
      .replace(/\s{2,}/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .trim();
  const isBlankTooLate = (value: string) => {
    const blankIndex = value.search(/_{2,}|\(\s*\)/);
    if (blankIndex < 0) {
      return false;
    }

    const blankRatio = value.length > 0 ? blankIndex / value.length : 0;
    const sentences = [...value.matchAll(/([A-Za-z][^.!?]{20,}?[.!?])/g)];
    const lastSentence = sentences[sentences.length - 1];
    const blankInLastSentence =
      !!lastSentence &&
      blankIndex >= (lastSentence.index ?? value.length);

    return blankRatio > 0.75 || blankInLastSentence;
  };
  const injectBlankIntoSentence = (source: string) => {
    const sentenceMatches = [...source.matchAll(/([A-Za-z][^.!?]{20,}?[.!?])/g)];
    if (sentenceMatches.length === 0) {
      return null;
    }

    const preferredMatch =
      sentenceMatches.find((match) => {
        const start = match.index ?? 0;
        const ratio = source.length > 0 ? start / source.length : 0;
        return ratio >= 0.2 && ratio <= 0.8;
      }) ?? sentenceMatches[Math.floor(sentenceMatches.length / 2)];

    const sentence = preferredMatch?.[1];
    if (!sentence) {
      return null;
    }

    const words = sentence.trim().split(/\s+/).filter(Boolean);
    if (words.length < 4) {
      return null;
    }

    const pivot = Math.max(1, Math.floor(words.length / 2) - 1);
    words.splice(pivot, Math.min(2, words.length - pivot), '_________');
    return source.replace(sentence, words.join(' '));
  };
  const repositionBlankIntoMiddle = (source: string) => {
    const blankRemoved = removeVisibleBlank(source);
    const paragraphs = blankRemoved.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

    if (paragraphs.length >= 2) {
      const instruction = paragraphs[0];
      const passage = paragraphs.slice(1).join('\n\n');
      const rebuiltPassage = injectBlankIntoSentence(passage);
      if (rebuiltPassage) {
        return collapseToSingleVisibleBlank(`${instruction}\n\n${rebuiltPassage}`.trim());
      }
    }

    const firstEnglishIdx = blankRemoved.search(/[A-Za-z]{4,}/);
    if (firstEnglishIdx > 0) {
      const instruction = blankRemoved.slice(0, firstEnglishIdx).trim();
      const passage = blankRemoved.slice(firstEnglishIdx).trim();
      const rebuiltPassage = injectBlankIntoSentence(passage);
      if (rebuiltPassage) {
        return collapseToSingleVisibleBlank(`${instruction}\n\n${rebuiltPassage}`.trim());
      }
    }

    const rebuiltWholeStem = injectBlankIntoSentence(blankRemoved);
    if (rebuiltWholeStem) {
      return collapseToSingleVisibleBlank(rebuiltWholeStem.trim());
    }

    return null;
  };

  if (/<[\/]?u\b|\[[\/]?u\]/i.test(nextStem)) {
    nextStem = nextStem.replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '');
  }

  if (/_{2,}|\(\s*\)/.test(nextStem)) {
    const collapsed = collapseToSingleVisibleBlank(nextStem);
    if (!isBlankTooLate(collapsed)) {
      return collapsed;
    }

    return repositionBlankIntoMiddle(collapsed) ?? collapsed;
  }

  const candidates = [answer, ...choices]
    .map((value) => String(value ?? '').trim())
    .filter((value) => value.length >= 3)
    .sort((a, b) => b.length - a.length);

  for (const candidate of candidates) {
    const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'g');
    const matches = [...nextStem.matchAll(regex)];
    if (matches.length > 0) {
      const chosen =
        matches.find((match) => {
          const start = match.index ?? 0;
          const ratio = nextStem.length > 0 ? start / nextStem.length : 0;
          return ratio >= 0.2 && ratio <= 0.8;
        }) ?? matches[Math.floor(matches.length / 2)];

      const start = chosen.index ?? -1;
      if (start >= 0) {
        const end = start + chosen[0].length;
        return collapseToSingleVisibleBlank(
          `${nextStem.slice(0, start)}_________${nextStem.slice(end)}`,
        );
      }
    }
  }

  const paragraphs = nextStem.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length >= 2) {
    const instruction = paragraphs[0];
    const passage = paragraphs.slice(1).join('\n\n');
    const rebuiltPassage = injectBlankIntoSentence(passage);
    if (rebuiltPassage) {
      return collapseToSingleVisibleBlank(`${instruction}\n\n${rebuiltPassage}`.trim());
    }
  }

  const firstEnglishIdx = nextStem.search(/[A-Za-z]{4,}/);
  if (firstEnglishIdx > 0) {
    const instruction = nextStem.slice(0, firstEnglishIdx).trim();
    const passage = nextStem.slice(firstEnglishIdx).trim();
    const rebuiltPassage = injectBlankIntoSentence(passage);
    if (rebuiltPassage) {
      return collapseToSingleVisibleBlank(`${instruction}\n\n${rebuiltPassage}`.trim());
    }
  }

  const rebuiltWholeStem = injectBlankIntoSentence(nextStem);
  if (rebuiltWholeStem) {
    return collapseToSingleVisibleBlank(rebuiltWholeStem.trim());
  }

  return nextStem;
}

function standardizeEnglishSentenceInsertionItem(stem: string, stimulus: string | null, choices: string[]) {
  let nextStem = String(stem ?? '').replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '');
  let nextStimulus = String(stimulus ?? '').trim();
  const canonicalChoices = ['①', '②', '③', '④', '⑤'];

  if (!nextStimulus) {
    const paragraphs = nextStem.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const englishParagraphs = paragraphs.filter((part) => /[A-Za-z]{8,}/.test(part));
    if (englishParagraphs.length >= 2) {
      const duplicateSource = englishParagraphs[0];
      const passageSource = englishParagraphs.slice(1).join('\n\n');
      const duplicateSentences = duplicateSource
        .split(/(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .filter((line) => line.length >= 20)
        .filter((line) => passageSource.includes(line));

      if (duplicateSentences.length > 0) {
        nextStimulus = duplicateSentences[0];
        nextStem = nextStem.replace(duplicateSentences[0], '').replace(/\n{3,}/g, '\n\n').trim();
      }
    }
  }

  if (nextStimulus) {
    const escaped = nextStimulus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    nextStem = nextStem.replace(new RegExp(`\\s*${escaped}\\s*`, 'i'), '\n');
    nextStem = nextStem.replace(/\n{3,}/g, '\n\n').trim();
  }

  const hasMarkers = (nextStem.match(/[①-⑤]|\(\s*[1-5]\s*\)/g) ?? []).length;
  if (hasMarkers < 5) {
    const paragraphs = nextStem.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
    const instruction = paragraphs[0] ?? '';
    const passage = paragraphs.slice(1).join(' ').trim();
    const sentences = passage.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);

    if (sentences.length >= 4) {
      const rebuilt: string[] = [];
      for (let i = 0; i < Math.min(5, sentences.length); i += 1) {
        rebuilt.push(sentences[i]);
        rebuilt.push(canonicalChoices[i]);
      }
      if (sentences.length > 5) {
        rebuilt.push(...sentences.slice(5));
      }
      nextStem = instruction ? `${instruction}\n\n${rebuilt.join(' ')}`.trim() : rebuilt.join(' ').trim();
    }
  }

  return {
    stem: nextStem,
    stimulus: nextStimulus || null,
    choices: canonicalChoices,
  };
}

export function normalizeQuestion(
  raw: any,
  index: number,
  context: NormalizeQuestionContext,
): GeneratedQuestion {
  let stimulus =
    typeof raw.stimulus === 'string' && raw.stimulus.trim().length > 0
      ? raw.stimulus.trim()
      : null;
  let stem = stripLeadingQuestionNumber(raw.stem || raw.question || '');

  const isSummaryCompletionType = isEnglishSummaryCompletionType({
    subject: context.subject,
    questionType: context.questionType,
    topic: raw?.topic,
    stem,
  });
  const isEmotionAtmosphereType = isEnglishEmotionAtmosphereType({
    subject: context.subject,
    questionType: context.questionType,
  });
  const isEmotionChangeItem =
    isEmotionAtmosphereType &&
    (stem.includes('\uc2ec\uacbd') || /emotion(?:al)? change/i.test(stem));

  const extractedChoices = extractRawChoices(raw).filter((choice: string) => choice.length > 0);
  let choices = (
    isSummaryCompletionType
      ? normalizeSummaryCompletionChoices(extractedChoices)
      : isEmotionChangeItem
        ? normalizeEmotionChangeChoices(extractedChoices)
        : extractedChoices
  ).slice(0, 5);
  stem = dedupeRepeatedPassageBlocks(
    stripRepeatedBlankInferenceInstruction(
      dedupeBilingualInstruction(removeChoiceBlockFromStem(stem, choices)),
      context.questionType,
    ),
  );

  let answerStr = resolveAnswerFromChoicesLoose(raw.answer, choices);
  const isSentenceInsertionType =
    String(context.subject).toLowerCase().includes('english') &&
    String(context.questionType ?? '').includes('문장 삽입');
  const isBlankInferenceType = isEnglishBlankInferenceType(context, raw, stem);

  if (isSentenceInsertionType) {
    const standardized = standardizeEnglishSentenceInsertionItem(stem, stimulus, choices);
    stem = standardized.stem;
    stimulus = standardized.stimulus;
    choices = standardized.choices;
    answerStr = resolveAnswerFromChoicesLoose(raw.answer, choices) || answerStr;
  }

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

  const isContentMatchingType = isEnglishContentMatchingType({
    subject: context.subject,
    questionType: context.questionType,
  });

  if (isContentMatchingType) {
    const standardized = standardizeEnglishContentMatching({
      stem,
      stimulus,
    });
    stem = standardized.stem;
    stimulus = standardized.stimulus;
  }

  if (
    !isContentMatchingType &&
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

  if (isSummaryCompletionType) {
    choices = normalizeSummaryCompletionChoices(choices);
    const standardized = standardizeEnglishSummaryCompletion({
      stem,
      stimulus,
      choices,
    });
    stem = standardized.stem;
    stimulus = standardized.stimulus;
    choices = standardized.choices;
    const normalizedRawAnswer = normalizeSummaryCompletionPairText(raw.answer);
    answerStr =
      resolveAnswerFromChoicesLoose(normalizedRawAnswer, choices) ||
      resolveAnswerFromChoicesLoose(raw.answer, choices) ||
      normalizedRawAnswer;
  }

  if (isBlankInferenceType) {
    stem = normalizeBlankInferenceStem(stem, answerStr || raw.answer || '', choices);
  }

  if (isEmotionAtmosphereType) {
    const standardized = standardizeEnglishEmotionAtmosphere({
      stem,
      choices,
      materialText: context.materialText,
    });
    stem = standardized.stem;
    choices = standardized.choices;

    const normalizedEmotionAnswer =
      typeof raw.answer === 'string' && stem.includes('\ubd84\uc704\uae30')
        ? raw.answer.split(/\s*\/\s*/)[0].trim()
        : normalizeEmotionChangeAnswer(raw.answer);
    answerStr = resolveAnswerFromChoicesLoose(normalizedEmotionAnswer, choices) || answerStr;
  }

  return {
    id: index + 1,
    topic: raw.topic || '\ubb38\ud56d',
    type: 'multiple',
    stem,
    choices,
    answer: answerStr,
    explanation: raw.explanation || '',
    stimulus,
  };
}
