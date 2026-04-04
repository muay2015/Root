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
      if (/인가$/.test(segment)) {
        return segment.replace(/인가$/, '이다.');
      }
      if (/는가$/.test(segment)) {
        return segment.replace(/는가$/, '다.');
      }
      if (/한가$/.test(segment)) {
        return segment.replace(/한가$/, '하다.');
      }
      return /[.!]$/.test(segment) ? segment : `${segment}.`;
    })
    .join(' ');

  const trailing = segments[segments.length - 1];
  return `${leading} ${trailing}?`.replace(/\s+/g, ' ').trim();
}

function looksLikePrompt(line: string) {
  return /(다음|자료|물음|설명|사료|보기|글을 읽고|표를 보고|알맞은 것은|옳은 것은|고르시오|고른 것은|추론한 것은|해석한 것은)/.test(line);
}

function looksLikeQuestionLine(line: string) {
  return /(무엇|무엇인가|어떤|고르시오|고른 것은|옳은 것은|알맞은 것은|추론한 것은|해석한 것은|\?$)/.test(line);
}

export function parseExamQuestionParts(stem: string): ExamQuestionParts {
  const normalized = stem.replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { prompt: '', stimulus: null };
  }

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

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

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

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
