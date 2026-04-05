import { hasStimulus } from '../../lib/question/hasStimulus';

export type ExamQuestion = {
  id: number;
  topic: string;
  type: '객관식' | '주관식';
  stem: string;
  choices?: string[];
  answer: string;
  explanation: string;
};

export type ExamQuestionParts = {
  prompt: string;
  stimulus: string | null;
};

const INLINE_MARKER_PATTERN =
  /(?:^|\s|\()(ㄱ|ㄴ|ㄷ|ㄹ|ㅁ|ㅂ|ㅅ|ㅇ|ㅈ|ㅊ|ㅋ|ㅌ|ㅍ|ㅎ)(?:\)|\.|,|:)?(?=\s)/g;

function joinPromptParts(parts: string[]) {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSingleQuestionPrompt(prompt: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  const questionMarks = [...normalized.matchAll(/\?/g)];
  if (questionMarks.length <= 1) {
    return normalized;
  }

  const segments = normalized
    .split('?')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length <= 1) {
    return normalized;
  }

  const leading = segments
    .slice(0, -1)
    .map((segment) => {
      if (/모습인가$/.test(segment)) {
        return segment.replace(/모습인가$/, '모습이다.');
      }
      if (/것인가$/.test(segment)) {
        return segment.replace(/것인가$/, '것이다.');
      }
      if (/한가$/.test(segment)) {
        return segment.replace(/한가$/, '한다.');
      }
      if (/는가$/.test(segment)) {
        return segment.replace(/는가$/, '는다.');
      }
      if (/인가$/.test(segment)) {
        return segment.replace(/인가$/, '이다.');
      }
      return /[.!]$/.test(segment) ? segment : `${segment}.`;
    })
    .join(' ');

  const trailing = segments[segments.length - 1];
  return `${leading} ${trailing}?`.replace(/\s+/g, ' ').trim();
}

function looksLikePrompt(line: string) {
  return /(다음|자료|물음|설명|보기|글을 읽고|시를 보고|옳은 것은|고른 것은|추론한 것은|해석한 것은)/.test(line);
}

function looksLikeQuestionLine(line: string) {
  return /(무엇|어떤|옳은 것은|고른 것은|추론한 것은|해석한 것은|\?)$/.test(line);
}

function splitTrailingQuestion(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { stimulusText: '', trailingPrompt: '' };
  }

  const questionStartPatterns = [
    /\s+(이\s+(?:관찰|자료|실험|설명|내용)[^?]*\?)$/u,
    /\s+((?:위|이)[^?]*(?:옳은 것은|고른 것은|알 수 있는 내용|추론한 것은|해석한 것은)[^?]*\?)$/u,
    /\s+((?:무엇|어떤)[^?]*\?)$/u,
  ];

  for (const pattern of questionStartPatterns) {
    const match = normalized.match(pattern);
    if (!match || typeof match.index !== 'number') {
      continue;
    }

    const trailingPrompt = match[1].trim();
    const stimulusText = normalized.slice(0, match.index).trim();
    if (stimulusText && trailingPrompt) {
      return { stimulusText, trailingPrompt };
    }
  }

  if (looksLikeQuestionLine(normalized)) {
    return { stimulusText: '', trailingPrompt: normalized };
  }

  return { stimulusText: normalized, trailingPrompt: '' };
}

function splitParagraphs(stem: string) {
  return stem
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLines(stem: string) {
  return stem
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractInlineStimulus(stem: string): ExamQuestionParts | null {
  const compact = stem.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return null;
  }

  const matches = [...compact.matchAll(INLINE_MARKER_PATTERN)];
  if (matches.length < 2) {
    return null;
  }

  const firstMarkerIndex = matches[0].index ?? -1;
  if (firstMarkerIndex <= 0) {
    return null;
  }

  const promptPrefix = compact.slice(0, firstMarkerIndex).trim();
  if (!looksLikePrompt(promptPrefix)) {
    return null;
  }

  const markerSections = matches.map((match, index) => {
    const marker = match[1];
    const fullMatch = match[0];
    const start = (match.index ?? 0) + fullMatch.length;
    const contentStart = start;
    const nextStart = matches[index + 1]?.index ?? compact.length;
    return {
      marker,
      text: compact.slice(contentStart, nextStart).trim(),
    };
  });

  let trailingPrompt = '';
  const lastSection = markerSections[markerSections.length - 1];
  if (lastSection && looksLikeQuestionLine(lastSection.text)) {
    const split = splitTrailingQuestion(lastSection.text);
    trailingPrompt = split.trailingPrompt;

    if (split.stimulusText) {
      lastSection.text = split.stimulusText;
    } else {
      markerSections.pop();
    }
  }

  const stimulusLines = markerSections
    .map((section) => `${section.marker}. ${section.text.replace(/\s+/g, ' ').trim()}`)
    .filter((line) => hasStimulus(line));

  if (stimulusLines.length < 2) {
    return null;
  }

  const prompt = normalizeSingleQuestionPrompt(joinPromptParts([promptPrefix, trailingPrompt]));
  const stimulus = stimulusLines.join('\n');

  return {
    prompt,
    stimulus,
  };
}

export function parseExamQuestionParts(stem: string): ExamQuestionParts {
  const normalized = stem.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { prompt: '', stimulus: null };
  }

  const inlineParts = extractInlineStimulus(normalized);
  if (inlineParts) {
    return inlineParts;
  }

  const paragraphs = splitParagraphs(normalized);

  if (paragraphs.length >= 2) {
    const promptParts = [paragraphs[0]];
    const stimulusParts = paragraphs.slice(1);

    while (stimulusParts.length > 0 && looksLikeQuestionLine(stimulusParts[stimulusParts.length - 1])) {
      const trailingPrompt = stimulusParts.pop();
      if (trailingPrompt) {
        promptParts.push(trailingPrompt);
      }
    }

    const prompt = normalizeSingleQuestionPrompt(joinPromptParts(promptParts));
    const stimulus = stimulusParts.join('\n\n').trim();
    return {
      prompt,
      stimulus: hasStimulus(stimulus) ? stimulus : null,
    };
  }

  const lines = splitLines(normalized);

  if (lines.length >= 3 && looksLikePrompt(lines[0])) {
    const promptParts = [lines[0]];
    const bodyLines = lines.slice(1);

    while (bodyLines.length > 0 && looksLikeQuestionLine(bodyLines[bodyLines.length - 1])) {
      const trailingPrompt = bodyLines.pop();
      if (trailingPrompt) {
        promptParts.push(trailingPrompt);
      }
    }

    const stimulus = bodyLines.join('\n').trim();
    return {
      prompt: normalizeSingleQuestionPrompt(joinPromptParts(promptParts)),
      stimulus: hasStimulus(stimulus) && stimulus.length >= 24 ? stimulus : null,
    };
  }

  return {
    prompt: normalizeSingleQuestionPrompt(normalized),
    stimulus: null,
  };
}
