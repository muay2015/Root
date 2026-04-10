import { useMemo } from 'react';
import { parseExamQuestionParts, type ExamQuestion } from '../components/exam/types';
import {
  buildSpeakerMapFromStem,
  findSpeakerForChoice,
} from '../lib/question/questionUtils';
import { useQuestionTypeDetection } from './question/useQuestionTypeDetection';
import { repairEnglishQuestion } from './question/useEnglishQuestionRepair';

function normalizeChoiceValue(choice: any) {
  const text = typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
  return text.replace(/<[^>]+>/g, '').trim();
}

function recoverEnglishPromptAndStimulus(stem: string) {
  const normalized = String(stem ?? '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { prompt: '', stimulus: null as string | null };
  }

  const instructionMatch = normalized.match(
    /^(다음\s+빈칸에\s+들어갈\s+말(?:로)?\s+가장\s+적절한\s+것은\?|다음\s+글의\s+흐름으로\s+보아,\s*주어진\s+문장이\s+들어가기에\s+가장\s+적절한\s+곳은\?|다음\s+글의\s+제목으로\s+가장\s+적절한\s+것은\?|다음\s+글의\s+주제로\s+가장\s+적절한\s+것은\?)/,
  );

  if (instructionMatch) {
    const prompt = instructionMatch[0].trim();
    const stimulus = normalized.slice(prompt.length).trim();
    return { prompt, stimulus: stimulus || null };
  }

  const firstQuestionIdx = normalized.indexOf('?');
  if (firstQuestionIdx >= 0) {
    const prompt = normalized.slice(0, firstQuestionIdx + 1).trim();
    const stimulus = normalized.slice(firstQuestionIdx + 1).trim();
    const englishChars = (stimulus.match(/[A-Za-z]/g) || []).length;
    if (stimulus.length >= 40 && englishChars >= 40) {
      return { prompt, stimulus };
    }
  }

  const englishChars = (normalized.match(/[A-Za-z]/g) || []).length;
  if (normalized.length >= 40 && englishChars >= 40) {
    return { prompt: '', stimulus: normalized };
  }

  return { prompt: normalized, stimulus: null };
}

/**
 * 전역 문항 복구 및 표준화 Hook (Facade Pattern)
 * [Refactored v17] 유형 판별 및 영어 전용 보정 로직을 하위 모듈로 분리.
 */
export function useQuestionRepair(question: ExamQuestion) {
  // 1. 기본 파싱
  const { prompt: rawPrompt, stimulus: rawStimulus } = useMemo(() => parseExamQuestionParts(question), [question]);

  // 2. 유형 판별 (Hook 분리)
  const types = useQuestionTypeDetection(question, rawPrompt, rawStimulus);

  return useMemo(() => {
    let prompt = rawPrompt;
    let stimulus = rawStimulus;
    let finalChoices: any[] = [...(question.choices ?? [])];
    const shouldRecoverEnglishPassage =
      types.isEnglishSubject &&
      !question.stimulus &&
      !types.isEnglishSentenceInsertion &&
      !types.isEnglishOrderArrangement &&
      !types.isEnglishIrrelevantSentence &&
      !types.isEnglishSummaryCompletion;

    if (shouldRecoverEnglishPassage) {
      const recovered = recoverEnglishPromptAndStimulus(String(question.stem ?? ''));
      prompt = recovered.prompt;
      stimulus = recovered.stimulus;
    }

    // 3. 영어 문항 보정 (Module 분리)
    if (types.isEnglishSubject) {
        const repaired = repairEnglishQuestion({
            question,
            prompt,
            stimulus,
            finalChoices,
            types
        });
        prompt = repaired.prompt;
        stimulus = repaired.stimulus;
        finalChoices = repaired.finalChoices;
    }

    // 4. OX 문항 및 번호만 있는 선택지 등 공통 보정 로직 (화자 매핑 등)
    // [TODO/CLEANUP] 향후 이 블록도 useGeneralQuestionRepair로 분리 가능
    const areChoicesJustCircledNumbers =
      finalChoices.length > 0 && finalChoices.every((choice) => /^[①-⑳]$/.test(normalizeChoiceValue(choice)));

    if (!types.isEnglishSentenceInsertion && !types.isEnglishOrderArrangement && areChoicesJustCircledNumbers) {
        // ... (기존 번호 매핑 로직 유지) ...
        const keys = finalChoices.map(normalizeChoiceValue).sort();
        const minKey = keys[0];
        const blockStart = question.stem.lastIndexOf(minKey);
        
        if (blockStart !== -1) {
            const optionBlock = question.stem.substring(blockStart);
            const circleRegex = /([①-⑳])\s*([\s\S]*?)(?=[①-⑳]|$)/g;
            let match: RegExpExecArray | null;
            const optionsMap = new Map<string, string>();

            while ((match = circleRegex.exec(optionBlock)) !== null) {
              optionsMap.set(match[1], match[2].trim());
            }

            if (finalChoices.every((c) => optionsMap.has(normalizeChoiceValue(c)))) {
              finalChoices = finalChoices.map((choice) => {
                const textKey = normalizeChoiceValue(choice);
                const display = optionsMap.get(textKey) || choice;
                return { value: choice, display };
              });
            }
        }
    } else if (finalChoices.length > 0) {
      const speakerMap = buildSpeakerMapFromStem(question.stem);
      if (speakerMap.size > 0) {
        finalChoices = finalChoices.map((choice) => {
          const raw = typeof choice === 'object' ? (choice as any).display ?? (choice as any).value : String(choice);
          const speaker = findSpeakerForChoice(raw, speakerMap);
          return speaker && !raw.startsWith(speaker) ? { value: choice, display: `${speaker}: ${raw}` } : choice;
        });
      }
    }

    return {
      prompt,
      stimulus,
      finalChoices,
      ...types
    };
  }, [question, rawPrompt, rawStimulus, types]);
}
