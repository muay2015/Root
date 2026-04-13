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

/**
 * 국어 문학/독서 유형 전용 지문-발문 분리기.
 *
 * AI가 지문을 stem·stimulus 어디에 넣든, 렌더링 시 발문과 지문이 시각적으로 분리되도록
 * - stem: 발문(도입 발문 + 세부 발문)만
 * - stimulus: 지문(작품 원문/비문학 본문)만
 * 로 재배치한다.
 */
function splitKoreanLiteraturePassage(
  stem: string,
  stimulus: string | null,
): { stem: string; stimulus: string | null } {
  const rawStem = String(stem ?? '').trim();
  const rawStimulus = String(stimulus ?? '').trim();

  if (!rawStem && !rawStimulus) {
    return { stem: rawStem, stimulus: rawStimulus || null };
  }

  // 이미 stimulus가 충분히 길면(지문으로 판단) stem에 또 다시 지문이 섞여있는지만 확인해서 제거.
  const paragraphs = rawStem
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  const promptKeywordPattern =
    /(다음\s+(?:글|시|작품|자료|밑줄|보기)|윗글|윗\s*시|〈보기〉|<보기>|물음에\s+답하시오|가장\s+적절한|적절하지\s+않은|옳은\s+것|고른\s+것|이해한\s+내용|설명으로|감상한\s+내용|읽고\s+물음)/;
  const endsWithQuestion = (text: string) =>
    /[?？]\s*$/.test(text) || /다\.\s*$/.test(text) || /것은\s*$/.test(text);

  const looksLikeInstruction = (text: string) => {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (!compact) return false;
    if (compact.length <= 80 && (endsWithQuestion(compact) || promptKeywordPattern.test(compact))) {
      return true;
    }
    if (compact.length <= 40 && promptKeywordPattern.test(compact)) {
      return true;
    }
    return false;
  };

  const looksLikePassageLine = (text: string) => {
    const compact = text.replace(/\s+/g, ' ').trim();
    if (!compact) return false;
    if (looksLikeInstruction(compact)) return false;
    if (/^(?:<보기>|〈보기〉|\[보기\]|보기\b)/.test(compact)) return false;
    return compact.length >= 6;
  };

  const normalizeEmbeddedViewBlock = (text: string) => {
    const collapseRepeatedBlocks = (value: string) => {
      const paragraphs = value
        .split(/\n\s*\n/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (paragraphs.length < 2) {
        return value.trim();
      }

      const normalizedParagraphs = paragraphs.map((part) =>
        part.replace(/\s+/g, ' ').trim().toLowerCase(),
      );

      const deduped: string[] = [];
      for (let i = 0; i < paragraphs.length; i += 1) {
        if (i > 0 && normalizedParagraphs[i] === normalizedParagraphs[i - 1]) {
          continue;
        }
        deduped.push(paragraphs[i]);
      }

      if (deduped.length % 2 === 0 && deduped.length >= 2) {
        const half = deduped.length / 2;
        const left = deduped.slice(0, half).map((part) => part.replace(/\s+/g, ' ').trim().toLowerCase());
        const right = deduped.slice(half).map((part) => part.replace(/\s+/g, ' ').trim().toLowerCase());
        if (left.join('\n') === right.join('\n')) {
          return deduped.slice(0, half).join('\n\n').trim();
        }
      }

      return deduped.join('\n\n').trim();
    };

    const normalized = String(text ?? '')
      .replace(/(?:^|\n)\s*보기\s*/g, '\n<보기>\n')
      .replace(/(?:^|\n)\s*〈보기〉\s*/g, '\n<보기>\n')
      .replace(/(?:^|\n)\s*\[보기\]\s*/g, '\n<보기>\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!normalized.includes('<보기>')) {
      return normalized;
    }

    const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
    const viewIdx = lines.findIndex((line) => line === '<보기>');
    if (viewIdx === -1) {
      return normalized;
    }

    const before = lines.slice(0, viewIdx);
    const after = lines.slice(viewIdx + 1);

    if (before.length > 0) {
      return collapseRepeatedBlocks(normalized);
    }

    const passageStart = after.findIndex((line, idx) => idx > 0 && looksLikePassageLine(line));
    if (passageStart <= 0) {
      return collapseRepeatedBlocks(
        normalized.replace(/^<보기>\n?/u, '').trim(),
      );
    }

    const viewLines = after.slice(0, passageStart);
    const passageLines = after.slice(passageStart);
    if (viewLines.length === 0 || passageLines.length === 0) {
      return collapseRepeatedBlocks(normalized);
    }

    return collapseRepeatedBlocks(
      `${passageLines.join('\n')}\n\n<보기>\n${viewLines.join('\n')}`.trim(),
    );
  };

  const instructionParts: string[] = [];
  const passageParts: string[] = [];

  for (const paragraph of paragraphs) {
    if (looksLikeInstruction(paragraph)) {
      instructionParts.push(paragraph);
    } else {
      passageParts.push(paragraph);
    }
  }

  // 단일 문단이고 길이가 짧으면 그대로 stem 유지(정상 케이스).
  if (paragraphs.length <= 1 && passageParts.length === 0) {
    return { stem: rawStem, stimulus: rawStimulus || null };
  }

  // 단일 문단이지만 매우 긴 경우: 줄바꿈(\n) 단위로 발문과 지문을 분리 시도.
  if (paragraphs.length === 1 && passageParts.length === 1 && instructionParts.length === 0) {
    const lines = paragraphs[0]
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length >= 2) {
      const firstInstrIdx = lines.findIndex((line) => looksLikeInstruction(line));
      if (firstInstrIdx !== -1) {
        const instructionLines = lines.filter((line) => looksLikeInstruction(line));
        const passageLines = lines.filter((line) => !looksLikeInstruction(line));
        if (instructionLines.length > 0 && passageLines.length > 0) {
          const nextStem = instructionLines.join('\n\n');
          const passageText = passageLines.join('\n');
          const nextStimulus = rawStimulus
            ? `${passageText}\n\n${rawStimulus}`
            : passageText;
          return { stem: nextStem, stimulus: nextStimulus };
        }
      }
    }
    // 분리 실패: stem을 그대로 두되, 최소한 stimulus가 비어있으면 stem 전체를 stimulus로 복제하지 않는다.
    return { stem: rawStem, stimulus: rawStimulus || null };
  }

  if (instructionParts.length === 0) {
    // 발문 문단이 하나도 식별되지 않음 → 맨 앞 문단을 발문으로 간주.
    if (paragraphs.length >= 2) {
      instructionParts.push(paragraphs[0]);
      passageParts.splice(0, passageParts.length, ...paragraphs.slice(1));
    }
  }

  if (passageParts.length === 0) {
    return { stem: rawStem, stimulus: rawStimulus || null };
  }

  const nextStem = instructionParts.join('\n\n').trim();
  const passageText = passageParts.join('\n\n').trim();
  const nextStimulus = rawStimulus
    ? // 기존 stimulus와 본문 지문이 중복되는 경우 중복 제거.
      rawStimulus.includes(passageText) || passageText.includes(rawStimulus)
      ? passageText.length >= rawStimulus.length
        ? passageText
        : rawStimulus
      : `${passageText}\n\n${rawStimulus}`
    : passageText;

  return {
    stem: nextStem || rawStem,
    stimulus: normalizeEmbeddedViewBlock(nextStimulus) || null,
  };
}

function normalizeKoreanLiteratureStemAndChoices(
  stem: string,
  choices: string[],
  stimulus: string | null,
) {
  let nextStem = String(stem ?? '').trim();
  let nextChoices = Array.isArray(choices) ? choices.map((choice) => String(choice ?? '').trim()) : [];

  const hasViewBlock =
    typeof stimulus === 'string' &&
    /(?:<보기>|〈보기〉|\[보기\]|(?:^|\n)\s*보기(?=\s|\n|$))/u.test(stimulus);

  if (hasViewBlock) {
    nextStem = nextStem
      .replace(/^(?:<보기>|〈보기〉|\[보기\]|보기)\s*\n?\s*를 참고할 때\s*,?/u, '다음 글과 <보기>를 참고할 때, ')
      .replace(/^(?:<보기>|〈보기〉|\[보기\]|보기)\s*\n?\s*를 참고할 때/u, '다음 글과 <보기>를 참고할 때')
      .replace(/^(?:<보기>|〈보기〉|\[보기\]|보기)\s+/u, '<보기> ')
      .replace(/<보기>\s*\n+\s*를 참고할 때/u, '<보기>를 참고할 때')
      .replace(/\s{2,}/g, ' ')
      .trim();

    nextChoices = nextChoices.map((choice) =>
      choice
        .replace(/^(?:<보기>|〈보기〉|\[보기\]|보기)\s*/u, '')
        .replace(/\s{2,}/g, ' ')
        .trim(),
    );
  }

  return {
    stem: nextStem,
    choices: nextChoices,
  };
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

export function normalizePhysicsExpression(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. 이미 \(\)로 감싸진 수식 내부의 백슬래시 과잉 이스케이프 방지 및 정리
  // (이 로직은 후순위로 밀림)

  // 2. 잘못된 긴 밑줄 형태 복구 (S_________1 -> \(S_1\))
  // 변수(영문) + 긴 밑줄 + 숫자/문자 조합을 감지하여 수식으로 변환
  result = result.replace(/([a-zA-Z])_{3,}([0-9a-zA-Z]+)/g, '\\($1_{$2}\\)');

  // 3. 누락된 래퍼 추가: v_0, m_A, x_1 등 간단한 첨자 형태
  // 이미 \(\) 내부에 있는 경우는 제외하기 위해 순차적으로 처리
  result = result.replace(/(?<!\\\(|[\w\\])([a-zA-Z])_([0-9a-zA-Z])(?!\w|\\\))/g, '\\($1_$2\\)');

  // 4. 주요 LaTeX 명령어 자동 래핑 (감싸져 있지 않은 경우)
  // \frac, \sqrt, \times, \pm, \div, \alpha, \beta, \gamma, \delta, \epsilon 등
  const mathCommands = ['frac', 'sqrt', 'times', 'pm', 'div', 'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'theta', 'pi', 'sigma', 'phi', 'omega', 'leq', 'geq', 'neq', 'approx', 'infty'];
  mathCommands.forEach(cmd => {
    // 래퍼 없이 단독으로 쓰인 명령어나 해당 명령어로 시작하는 구문을 찾아 감쌈
    const regex = new RegExp(`(?<!\\\\\\()\\\\${cmd}\\b(?:\\{[^{}]*\\}|[^{}\\s]*)*`, 'g');
    result = result.replace(regex, (match) => `\\(${match}\\)`);
  });

  // 5. 중복 래퍼 정리: \(\( ... \)\) -> \( ... \)
  result = result.replace(/\\\(+\s*\\\(+/g, '\\(').replace(/\\\)+\s*\\\)+/g, '\\)');

  // 6. 단일 영문 변수 처리 (x, m, v, k, t, F 등 주요 물리 변수)
  result = result.replace(/(?<![a-zA-Z\\\(])([xytvmakfF])(?![a-zA-Z\)])/g, '\\($1\\)');

  // 7. 하첨자 내의 일반 텍스트 명령어화 (max, min, total, avg 등)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (match, content) => {
    return `\\(${content.replace(/\b(max|min|total|avg|eff)\b/g, '\\$1')}\\)`;
  });

  // 8. 수식 근처 이상한 긴 밑줄 제거 (남은 것들)
  result = result.replace(/_{5,}/g, '______');

  return result;
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
  const isLikelyEnglishOrderType =
    String(context.subject).toLowerCase().includes('english') &&
    String(context.questionType ?? '').includes('순서 배열');

  if (isLikelyEnglishOrderType) {
    stem = stem
      .replace(/\(\s*([ABC])\s*\)\s*[_\-.~]{1,}/gi, '($1) ')
      .replace(/\[\s*([ABC])\s*\]\s*[_\-.~]{1,}/gi, '[$1] ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

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

  // 어법/어휘 유형은 선택지(예: "interested", "was")가 지문 내 밑줄 단어 그 자체이므로,
  // removeChoiceBlockFromStem이 지문 마지막 줄의 밑줄 단어를 "선택지 블록"으로 오인해
  // 지문을 뒤에서부터 잘라내는 치명적 부작용을 일으킨다. 해당 유형에서는 건너뛴다.
  // 관계없는 문장 유형도 선택지가 (1)~(5)이고 지문에 동일 표기가 있어 같은 문제가 발생한다.
  const questionTypeText = String(context.questionType ?? '');
  const topicText = String(raw?.topic ?? '');
  const isEnglishSubject = String(context.subject).toLowerCase().includes('english');
  const isEnglishGrammarVocabType =
    isEnglishSubject &&
    (questionTypeText.includes('어법') ||
      questionTypeText.includes('어휘') ||
      questionTypeText.includes('문법') ||
      topicText.includes('어법') ||
      topicText.includes('어휘') ||
      topicText.includes('문법'));
  const isEnglishIrrelevantType =
    isEnglishSubject && questionTypeText.includes('관계없는 문장');

  const stemAfterChoiceBlockStrip = (isEnglishGrammarVocabType || isEnglishIrrelevantType)
    ? stem
    : removeChoiceBlockFromStem(stem, choices);

  stem = dedupeRepeatedPassageBlocks(
    stripRepeatedBlankInferenceInstruction(
      dedupeBilingualInstruction(stemAfterChoiceBlockStrip),
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
    stem = stem
      .replace(/\(\s*([ABC])\s*\)\s*[_\-.~]{1,}/gi, '($1) ')
      .replace(/\[\s*([ABC])\s*\]\s*[_\-.~]{1,}/gi, '[$1] ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
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

  // 국어 문학/독서: stem에 뒤섞인 지문을 강제로 stimulus로 분리해 렌더링 시 발문-지문이 별도 영역으로 표시되도록 한다.
  if (context.subject === 'korean_literature' || context.subject === 'korean_reading') {
    const split = splitKoreanLiteraturePassage(stem, stimulus);
    stem = split.stem;
    stimulus = split.stimulus;

    const normalizedLiterature = normalizeKoreanLiteratureStemAndChoices(stem, choices, stimulus);
    stem = normalizedLiterature.stem;
    choices = normalizedLiterature.choices;
  }

  // 과학/물리 과목 전용 수식 후처리
  const subjectKey = String(context.subject).toLowerCase();
  const isScience =
    subjectKey.includes('science') ||
    subjectKey.includes('physics') ||
    subjectKey.includes('chemistry') ||
    subjectKey.includes('biology');

  if (isScience) {
    stem = normalizePhysicsExpression(stem);
    if (stimulus) {
      stimulus = normalizePhysicsExpression(stimulus);
    }
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
