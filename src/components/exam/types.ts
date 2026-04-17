import { hasStimulus } from '../../lib/question/hasStimulus';

export type ExamQuestion = {
  id: number;
  topic: string;
  type: '객관식' | '주관식';
  stem: string;
  image_url?: string;
  image_focus_area?: {
    top: number;    // 상단으로부터의 % 위치
    left: number;   // 좌측으로부터의 % 위치
    width: number;  // 노출할 가로 길이 %
    height: number; // 노출할 세로 길이 %
    zoom?: number;  // 확대 배움 (기본값 1)
  };
  choices?: string[];
  answer: string;
  explanation: string;
  stimulus?: string | null; // AI가 직접 생성한 제시문(박스 내용)
  diagram_svg?: string | null; // AI가 생성한 SVG 도형 다이어그램
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
    .map((section) => {
      // ㄱ. ㉠ 형태의 중복 기호 제거
      const cleanText = section.text
        .replace(/^\s*[㉠-㉽]\s*/, '') // 시작 부분의 원문자 기호 제거
        .replace(/\s+/g, ' ')
        .trim();
      return `${section.marker}. ${cleanText}`;
    })
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

/**
 * stem에서 stimulus와 겹치는 단락을 제거하고 발문/질문 줄만 남깁니다.
 * - 단락 앞 50자를 기준으로 stimulus에 포함 여부를 확인합니다.
 * - 40자 이하의 짧은 단락(발문·질문 줄)은 항상 유지합니다.
 * - 앞에 붙은 번호 노이즈(예: "1. ")를 제거합니다.
 */
const STEM_BOX_MARKER_RE = /^(?:<보기>|\[보기\]|<자료>|\[자료\]|<조건>|\[조건\])$/u;
const STIMULUS_HAS_BOGI_RE = /(?:<보기>|\[보기\]|<자료>|\[자료\]|<조건>|\[조건\])/u;

function deduplicateStemFromStimulus(stem: string, stimulus: string): string {
  if (!stimulus || !stem) return stem;

  const normalizedStimulus = stimulus.replace(/\s+/g, ' ').trim();
  // stimulus에 <보기> 등이 있으면 stem에서도 마커 줄을 제거 (중복 방지)
  const stimulusHasBogi = STIMULUS_HAS_BOGI_RE.test(stimulus);

  const paragraphs = stem
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const kept = paragraphs.filter((para) => {
    if (para.length <= 40) {
      // stimulus에 보기가 있으면 stem의 <보기> 마커도 제거
      if (stimulusHasBogi && STEM_BOX_MARKER_RE.test(para)) return false;
      return true;
    }
    const normalizedPara = para.replace(/\s+/g, ' ').trim();
    const prefix = normalizedPara.slice(0, Math.min(50, normalizedPara.length));
    return !normalizedStimulus.includes(prefix);
  });

  const cleaned = kept
    .map((p) => p.replace(/^\s*\d+\.\s+/, '').trim())
    .filter(Boolean)
    .join('\n')
    .trim();

  return cleaned || stem;
}

export function parseExamQuestionParts(question: ExamQuestion): ExamQuestionParts {
  // 1. AI가 이미 stimulus 필드를 제공한 경우: stem에서 겹치는 지문 단락 제거
  if (question.stimulus) {
    return {
      prompt: deduplicateStemFromStimulus(question.stem, question.stimulus),
      stimulus: question.stimulus,
    };
  }

  const stem = question.stem;
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
