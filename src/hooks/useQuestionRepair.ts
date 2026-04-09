import { useMemo } from 'react';
import { parseExamQuestionParts, type ExamQuestion } from '../components/exam/types';
import {
  buildSpeakerMapFromStem,
  findSpeakerForChoice,
} from '../lib/question/questionUtils';
import { standardizeEnglishIrrelevantSentence } from '../lib/question/englishStandardizer';

function normalizeChoiceValue(choice: any) {
  const text =
    typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
  return text.replace(/<[^>]+>/g, '').trim();
}

function stripOrderArrangementSections(text: string | null | undefined) {
  if (typeof text !== 'string') {
    return null;
  }

  const stripped = text
    .replace(/\r\n/g, '\n')
    .replace(/\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])[\s\S]*$/i, '')
    .trim();

  return stripped || null;
}

function isKoreanPromptLine(line: string) {
  return /(다음 글|주어진 글|이어진 글|순서대로 배열|가장 적절한 것|고르시오|배열할 때|글의 순서|고려하시오|\?)$/.test(
    line,
  );
}

function isChoiceOnlyLine(line: string) {
  const compact = line.replace(/\s+/g, ' ').trim();
  return (
    /^(?:[1-5]|[①-⑤])$/.test(compact) ||
    /^(?:\([ABC]\)|[ABC])(?:\s*[-–—]{2,}\s*(?:\([ABC]\)|[ABC]))+$/.test(compact) ||
    /^(?:\([ABC]\)|[ABC])(?:\s+(?:\([ABC]\)|[ABC])){2,}$/.test(compact)
  );
}

function isFootnoteLine(line: string) {
  return /^\*/.test(line) || /[가-힣]/.test(line);
}

function parseOrderArrangementStem(
  question: ExamQuestion,
  fallbackPrompt: string,
  fallbackStimulus: string | null,
) {
  const fullStem = question.stem
    .replace(/\r\n/g, '\n')
    .replace(/([^\n])\s*(\(\s*[ABC]\s*\)|\[\s*[ABC]\s*\])/g, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n');
  const rawLines = fullStem.split('\n').map((line) => line.trim()).filter(Boolean);

  const markerRegex = /^(\(\s*([ABC])\s*\)|\[\s*([ABC])\s*\])/i;
  const sectionMap = new Map<'A' | 'B' | 'C', string[]>();
  let currentSection: 'A' | 'B' | 'C' | null = null;
  const introLines: string[] = [];
  const promptLines: string[] = [];

  for (const line of rawLines) {
    if (isChoiceOnlyLine(line)) {
      currentSection = null;
      continue;
    }

    if (isKoreanPromptLine(line)) {
      promptLines.push(line);
      currentSection = null;
      continue;
    }

    if (isFootnoteLine(line)) {
      currentSection = null;
      continue;
    }

    const markerMatch = line.match(markerRegex);
    if (markerMatch) {
      const label = (markerMatch[2] || markerMatch[3] || '').toUpperCase() as 'A' | 'B' | 'C';
      currentSection = label;
      const content = line.replace(markerRegex, '').trim();
      const next = sectionMap.get(label) ?? [];
      if (content) {
        next.push(content);
      }
      sectionMap.set(label, next);
      continue;
    }

    if (currentSection) {
      const next = sectionMap.get(currentSection) ?? [];
      next.push(line);
      sectionMap.set(currentSection, next);
      continue;
    }

    introLines.push(line);
  }

  const orderedSections = (['A', 'B', 'C'] as const)
    .map((label) => {
      const content = (sectionMap.get(label) ?? []).join('\n').trim();
      return content ? `(${label}) ${content}` : '';
    })
    .filter(Boolean);

  const prompt =
    orderedSections.length > 0
      ? `${promptLines[0] ?? '다음 글을 순서대로 배열할 때 가장 적절한 것은?'}\n\n${orderedSections.join('\n\n')}`.trim()
      : fallbackPrompt;

  const englishIntro = introLines.filter((line) => !/[가-힣]/.test(line)).join('\n').trim();
  const fallbackEnglishStimulus =
    typeof fallbackStimulus === 'string' && !/[가-힣]/.test(fallbackStimulus)
      ? fallbackStimulus.trim()
      : null;
  const stimulus = englishIntro || fallbackEnglishStimulus;

  return { prompt, stimulus };
}

function normalizeOrderArrangementChoices(choices: any[]) {
  const defaultDisplays = [
    '(A) - (C) - (B)',
    '(B) - (A) - (C)',
    '(B) - (C) - (A)',
    '(C) - (A) - (B)',
    '(C) - (B) - (A)',
  ];

  const areNumericOnly =
    choices.length === 5 &&
    choices.every((choice) => /^(?:[1-5]|[①-⑤])$/.test(normalizeChoiceValue(choice)));

  if (!areNumericOnly) {
    return choices;
  }

  return choices.map((choice, index) => ({
    value: typeof choice === 'object' ? (choice as any).value ?? String(index + 1) : String(choice),
    display: defaultDisplays[index] ?? String(choice),
  }));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildIrrelevantSentencePrompt(basePrompt: string, choices: any[]) {
  const numberedMarkers = ['①', '②', '③', '④', '⑤'];
  let nextPrompt = basePrompt;
  let replacedCount = 0;

  choices.forEach((choice, index) => {
    const raw =
      typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
    const sentence = raw.replace(/\s+/g, ' ').trim();
    if (!sentence || /^(?:[1-5]|[①-⑤])$/.test(sentence)) {
      return;
    }

    const marker = numberedMarkers[index] ?? String(index + 1);
    if (nextPrompt.includes(`${marker} ${sentence}`) || nextPrompt.includes(`${marker}${sentence}`)) {
      replacedCount += 1;
      return;
    }

    const exactRegex = new RegExp(escapeRegex(sentence), 'g');
    if (exactRegex.test(nextPrompt)) {
      nextPrompt = nextPrompt.replace(exactRegex, `${marker} ${sentence}`);
      replacedCount += 1;
    }
  });

  return {
    prompt: nextPrompt,
    hasNumberedSentences: replacedCount >= 3 || /[①-⑤]/.test(nextPrompt),
    displayChoices: choices.map((choice) => {
      const raw =
        typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
      return {
        value: typeof choice === 'object' ? (choice as any).value ?? raw : raw,
        display: raw,
      };
    }),
  };
}

function buildIrrelevantSentencePromptStable(basePrompt: string, choices: any[]) {
  const numberedMarkers = ['(1)', '(2)', '(3)', '(4)', '(5)'];
  let nextPrompt = basePrompt;
  let replacedCount = 0;

  choices.forEach((choice, index) => {
    const raw =
      typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
    const sentence = raw.replace(/\s+/g, ' ').trim();
    if (!sentence || /^(?:[1-5]|\([1-5]\)|[①-⑤])$/.test(sentence)) {
      return;
    }

    const marker = numberedMarkers[index] ?? `(${index + 1})`;
    if (nextPrompt.includes(`${marker} ${sentence}`) || nextPrompt.includes(`${marker}${sentence}`)) {
      replacedCount += 1;
      return;
    }

    const exactRegex = new RegExp(escapeRegex(sentence), 'g');
    if (exactRegex.test(nextPrompt)) {
      nextPrompt = nextPrompt.replace(exactRegex, `${marker} ${sentence}`);
      replacedCount += 1;
    }
  });

  return {
    prompt: nextPrompt,
    hasNumberedSentences: replacedCount >= 3 || /\([1-5]\)/.test(nextPrompt),
    displayChoices: choices.map((choice, index) => {
      const raw =
        typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
      return {
        value: typeof choice === 'object' ? (choice as any).value ?? raw : raw,
        display: `(${index + 1})`,
      };
    }),
  };
}

export function useQuestionRepair(question: ExamQuestion) {
  return useMemo(() => {
    const topicLower = question.topic.toLowerCase();
    const stemNormalized = question.stem.replace(/\r\n/g, '\n');

    const isEnglishSubject = topicLower.includes('영어') || topicLower.includes('english');
    const isInsertionType =
      question.topic.includes('문장 삽입') ||
      topicLower.includes('insertion') ||
      question.stem.includes('주어진 문장');
    const isOrderType =
      question.topic.includes('순서 배열') ||
      topicLower.includes('order') ||
      question.stem.includes('이어진 글의 순서') ||
      question.stem.includes('순서대로 배열') ||
      question.stem.includes('배열할 때') ||
      (/\(\s*A\s*\)/i.test(question.stem) &&
        /\(\s*B\s*\)/i.test(question.stem) &&
        /\(\s*C\s*\)/i.test(question.stem));

    const isEnglishSentenceInsertion = isEnglishSubject && isInsertionType;
    const isEnglishOrderArrangement = isEnglishSubject && isOrderType;
    const isEnglishIrrelevantSentence =
      isEnglishSubject &&
      (question.topic.includes('관계없는 문장') ||
        question.topic.includes('관계 없는 문장') ||
        topicLower.includes('irrelevant') ||
        topicLower.includes('unrelated sentence') ||
        question.stem.includes('전체 흐름과 관계 없는 문장'));
    const isEnglishReading =
      isEnglishSentenceInsertion ||
      isEnglishOrderArrangement ||
      isEnglishIrrelevantSentence ||
      (isEnglishSubject && (question.topic.includes('빈칸') || question.topic.includes('추론')));

    let { prompt, stimulus } = parseExamQuestionParts(question);
    let finalChoices: any[] = [...(question.choices ?? [])];

    if (isEnglishSentenceInsertion && finalChoices.length >= 2) {
      const circleMap = ['①', '②', '③', '④', '⑤'];
      let cleanStimulus = (stimulus || '').trim();

      if (!cleanStimulus) {
        const promptLines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
        const keywordMatch = prompt.match(
          /(?:\[주어진\s*문장\]|<주어진\s*문장>|\[보기\]|<보기>)\s*([\s\S]*?)(?=\n\n|\n[①-⑤]|\n\d+\)|\n\(\s*[1-5]\s*\)|$)/,
        );

        if (keywordMatch && keywordMatch[1].trim()) {
          cleanStimulus = keywordMatch[1].trim();
          prompt = prompt.replace(keywordMatch[0], '').trim();
        } else if (promptLines.length >= 2) {
          const secondLine = promptLines[1];
          if (secondLine.length > 20 && !/[①-⑤]|\(\s*[1-5]\s*\)/.test(secondLine)) {
            cleanStimulus = secondLine;
            prompt = prompt.replace(secondLine, '').trim();
          }
        }
      }

      const isFragmented = finalChoices.some((choice) => {
        const text = normalizeChoiceValue(choice);
        return text.length > 15 || text.startsWith(')') || text.startsWith(']');
      });

      if (isFragmented || cleanStimulus) {
        let mergedPassage = '';

        if (cleanStimulus) {
          cleanStimulus = cleanStimulus.replace(/\s*[([][\s\d]*$/, '').trim();
        }

        finalChoices.forEach((choice, index) => {
          let text =
            typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);

          text = text
            .trim()
            .replace(/^[^a-zA-Z가-힣0-9]*/, '')
            .replace(/^[0-9]\s*[)\]]/, '')
            .replace(/[([][\s\d]*$/, '')
            .trim();

          if (text) {
            mergedPassage += ` ( ${circleMap[index] || index + 1} ) ${text}`;
          }
        });

        if (mergedPassage) {
          const basePrompt = prompt.split('\n')[0] ?? '';
          prompt = `${basePrompt}\n\n${mergedPassage.trim()}`.trim();
          finalChoices = ['①', '②', '③', '④', '⑤'];
          stimulus = cleanStimulus;
        }
      }
    }

    if (isEnglishOrderArrangement) {
      // Preserve sentence ordering repair behavior. The UI depends on this
      // recovering: Korean instruction, English intro stimulus, and (A)(B)(C) body sections.
      const repaired = parseOrderArrangementStem(question, prompt, stimulus);
      prompt = repaired.prompt;
      stimulus = repaired.stimulus;
      finalChoices = normalizeOrderArrangementChoices(finalChoices);
    }

    if (isEnglishIrrelevantSentence && finalChoices.length === 5) {
      const normalizedChoices = finalChoices.map((choice) => {
        const raw =
          typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
        return raw.replace(/^\s*(?:[1-5]|[①-⑤])[\.\)]?\s*/, '').trim();
      });
      const repaired = buildIrrelevantSentencePromptStable(prompt, normalizedChoices);
      if (repaired.hasNumberedSentences) {
        prompt = repaired.prompt;
        stimulus = null;
        finalChoices = repaired.displayChoices;
      }
    }

    if (isEnglishIrrelevantSentence) {
      const standardized = standardizeEnglishIrrelevantSentence({
        stem: question.stem,
        stimulus,
        materialText: prompt,
        choices: finalChoices,
        answer: question.answer,
      });
      prompt = standardized.stem;
      stimulus = standardized.stimulus;
      finalChoices = standardized.choices;
    }

    const isOXQuestion = (() => {
      const choiceTexts = finalChoices.map((choice) => {
        const value =
          typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
        return value.trim().toUpperCase();
      });

      const hasO = choiceTexts.some((text) => text === 'O' || text === '⭕');
      const hasX = choiceTexts.some((text) => text === 'X' || text === '❌');
      const stemHasOXMention = /OX\s*문제|맞으면\s*O|틀리면\s*X/.test(question.stem);
      return (hasO && hasX) || (stemHasOXMention && hasO && hasX);
    })();

    const areChoicesJustCircledNumbers =
      finalChoices.length > 0 && finalChoices.every((choice) => /^[①-⑳]$/.test(normalizeChoiceValue(choice)));

    if (!isEnglishSentenceInsertion && !isEnglishOrderArrangement && areChoicesJustCircledNumbers) {
      const keys = finalChoices
        .map((choice) => normalizeChoiceValue(choice))
        .filter((choice) => /^[①-⑳]$/.test(choice))
        .sort();
      const minKey = keys[0];

      if (minKey) {
        const blockStart = stemNormalized.lastIndexOf(minKey);
        if (blockStart !== -1) {
          const optionBlock = stemNormalized.substring(blockStart);
          const circleRegex = /([①-⑳])\s*([\s\S]*?)(?=[①-⑳]|$)/g;
          let match: RegExpExecArray | null;
          const optionsMap = new Map<string, string>();

          while ((match = circleRegex.exec(optionBlock)) !== null) {
            optionsMap.set(match[1], match[2].trim());
          }

          const allChoicesAreKeys = finalChoices.every((choice) => optionsMap.has(normalizeChoiceValue(choice)));
          const hasMeaningfulText = Array.from(optionsMap.values()).some((text) => text.length > 0);

          if (allChoicesAreKeys && hasMeaningfulText) {
            const speakerByCircle = new Map<string, string>();
            const namedCirclePattern = /([가-힣]{1,5})\s*[:：]\s*([①-⑳])/g;
            let namedMatch: RegExpExecArray | null;

            while ((namedMatch = namedCirclePattern.exec(stemNormalized)) !== null) {
              speakerByCircle.set(namedMatch[2], namedMatch[1]);
            }

            if (speakerByCircle.size === 0) {
              const dialogLines = stemNormalized
                .split('\n')
                .map((line) => line.trim())
                .filter((line) => /^[가-힣]{1,5}\s*[:：]/.test(line));

              dialogLines.forEach((line, lineIndex) => {
                if (lineIndex < keys.length) {
                  const nameMatch = line.match(/^([가-힣]{1,5})\s*[:：]/);
                  if (nameMatch) {
                    speakerByCircle.set(keys[lineIndex], nameMatch[1]);
                  }
                }
              });
            }

            finalChoices = finalChoices.map((choice) => {
              const textKey = normalizeChoiceValue(choice);
              const extractedText = optionsMap.get(textKey) ?? '';
              const speakerName = speakerByCircle.get(textKey);
              const alreadyHasName = speakerName && extractedText.startsWith(speakerName);
              const display =
                speakerName && !alreadyHasName ? `${speakerName}: ${extractedText}` : extractedText || choice;
              return { value: choice, display };
            });

            let cleanStem = stemNormalized.substring(0, blockStart).trim();
            cleanStem = cleanStem
              .replace(/(<보기>|\[조건\]|<조건>|\[보기\]|<자료>|\[자료\])\s*$/, '')
              .trim();

            const parts = parseExamQuestionParts({ ...question, stem: cleanStem });
            prompt = parts.prompt;
            stimulus = parts.stimulus;
          }
        }
      }
    } else if (!isEnglishSentenceInsertion && !isEnglishOrderArrangement && !areChoicesJustCircledNumbers && finalChoices.length > 0) {
      const speakerMap = buildSpeakerMapFromStem(question.stem);
      if (speakerMap.size > 0) {
        finalChoices = finalChoices.map((choice) => {
          const raw =
            typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
          const value = typeof choice === 'object' ? (choice as any).value : String(choice);
          const speaker = findSpeakerForChoice(raw, speakerMap);
          const alreadyHasName = speaker && raw.startsWith(speaker);
          const display = speaker && !alreadyHasName ? `${speaker}: ${raw}` : raw;
          return { value, display };
        });
      }
    }

    return {
      prompt,
      stimulus,
      finalChoices,
      isEnglishSentenceInsertion,
      isEnglishOrderArrangement,
      isEnglishIrrelevantSentence,
      isEnglishReading,
      isOXQuestion,
    };
  }, [question]);
}
