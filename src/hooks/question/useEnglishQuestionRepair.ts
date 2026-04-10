import {
  standardizeEnglishIrrelevantSentence,
  standardizeEnglishContentMatching,
  standardizeEnglishSummaryCompletion,
  standardizeEnglishOrderArrangement,
} from '../../lib/question/englishStandardizer';
import type { ExamQuestion } from '../../components/exam/types';

/**
 * 영어 문항 전용 데이터 보정/복구 로직
 */
export function repairEnglishQuestion(params: {
  question: ExamQuestion;
  prompt: string;
  stimulus: string | null;
  finalChoices: any[];
  types: {
    isEnglishSentenceInsertion: boolean;
    isEnglishOrderArrangement: boolean;
    isEnglishIrrelevantSentence: boolean;
    isEnglishContentMatching: boolean;
    isEnglishSummaryCompletion: boolean;
  };
}) {
  const { question, types } = params;
  let { prompt, stimulus, finalChoices } = params;
  const isEnglishBlankInference =
    (types as any).isEnglishReading &&
    !question.topic.includes('어법') &&
    !question.topic.includes('어휘') &&
    (question.topic.includes('빈칸') || question.topic.includes('추론'));

  // 1. 문장 삽입 보정
  if (types.isEnglishSentenceInsertion && finalChoices.length >= 2) {
    const circleMap = ['①', '②', '③', '④', '⑤'];
    let cleanStimulus = (stimulus || '').trim();

    if (!cleanStimulus) {
      const promptLines = prompt.split('\n').map((l) => l.trim()).filter(Boolean);
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
      const text = String(typeof choice === 'object' ? choice.display || choice.value : choice).replace(/<[^>]+>/g, '').trim();
      return text.length > 15 || text.startsWith(')') || text.startsWith(']');
    });

    if (isFragmented || cleanStimulus) {
      let mergedPassage = '';
      if (cleanStimulus) cleanStimulus = cleanStimulus.replace(/\s*[([][\s\d]*$/, '').trim();

      finalChoices.forEach((choice, index) => {
        let text = String(typeof choice === 'object' ? choice.display || choice.value : choice)
          .trim()
          .replace(/^[^a-zA-Z가-힣0-9]*/, '')
          .replace(/^[0-9]\s*[)\]]/, '')
          .replace(/[([][\s\d]*$/, '')
          .trim();
        if (text) mergedPassage += ` ( ${circleMap[index] || index + 1} ) ${text}`;
      });

      if (mergedPassage) {
        const basePrompt = prompt.split('\n')[0] ?? '';
        prompt = `${basePrompt}\n\n${mergedPassage.trim()}`.trim();
        finalChoices = ['①', '②', '③', '④', '⑤'];
        stimulus = cleanStimulus;
      }
    }

    if (cleanStimulus) {
      const escapedStimulus = cleanStimulus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const duplicateSentenceRegex = new RegExp(`^${escapedStimulus}$`, 'i');
      const promptLines = prompt.split('\n').map((line) => line.trim()).filter(Boolean);
      const dedupedLines: string[] = [];
      let removedDuplicate = false;

      for (const line of promptLines) {
        if (!removedDuplicate && duplicateSentenceRegex.test(line)) {
          removedDuplicate = true;
          continue;
        }
        dedupedLines.push(line);
      }

      if (removedDuplicate) {
        prompt = dedupedLines.join('\n').trim();
      }
    }

    finalChoices = ['①', '②', '③', '④', '⑤'];
  }

  // 2. 순서 배열 보정
  if (types.isEnglishOrderArrangement) {
    const standardized = standardizeEnglishOrderArrangement({
      stem: question.stem,
      stimulus,
      materialText: prompt,
      answer: question.answer,
    });
    prompt = standardized.stem;
    stimulus = standardized.stimulus;
    finalChoices = standardized.choices;
  }

  // 3. 관계없는 문장 보정
  if (types.isEnglishIrrelevantSentence) {
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

  // 4. 내용 일치 보정
  if (types.isEnglishContentMatching) {
    const standardized = standardizeEnglishContentMatching({
      stem: question.stem,
      stimulus,
    });
    prompt = standardized.stem;
    stimulus = standardized.stimulus;
  }

  // 5. 요약문 완성 보정
  if (types.isEnglishSummaryCompletion) {
    const standardized = standardizeEnglishSummaryCompletion({
      stem: question.stem,
      stimulus,
      choices: finalChoices.map((c) => typeof c === 'object' ? c.display ?? c.value : String(c)),
    });
    prompt = standardized.stem;
    stimulus = standardized.stimulus;
    if (standardized.choices && standardized.choices.length > 0) {
      finalChoices = standardized.choices;
    }
  }

  // 요약문 완성 기호((A), (B))가 없는데 요약문 유형으로 판별된 경우 독해 유형으로 강제 전환
  if (types.isEnglishSummaryCompletion) {
    const hasA = /[\(\[]\s*[AB]\s*[\)\]]/i.test(prompt) || (stimulus && /[\(\[]\s*[AB]\s*[\)\]]/i.test(stimulus));
    if (!hasA) {
      types.isEnglishSummaryCompletion = false;
      types.isEnglishReading = true;
    }
  }

  // 영어 독해 유형(빈칸, 제목, 대의 등)에서 불필요한 밑줄 태그(hallucination) 제거
  const sanitizeTags = (text: string) => {
    if (!text) return text;
    // 어법/어휘(Grammar/Vocab)가 아닌 일반 독해 유형에서는 <u> 태그를 모두 텍스트로 치환/제거하여 렌더링 시 무시되게 함
    return text.replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, ''); 
  };

  if (types.isEnglishReading && !question.topic.includes('어법') && !question.topic.includes('어휘')) {
    prompt = prompt.replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '');
    if (stimulus) {
      stimulus = stimulus.replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '');
    }
  }

  if (isEnglishBlankInference) {
    prompt = prompt
      .replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '')
      .replace(/(?:\(\s*[A-Z]\s*\)|\[\s*[A-Z]\s*\])\s*_{2,}/gi, '_________');
    prompt = prompt.replace(/_{2,}/g, '_________').replace(/(?:_________\s*){2,}/g, '_________');
    if (stimulus) {
      stimulus = stimulus
        .replace(/<[\/]?[uU][^>]*>|\[[\/]?[uU][^\]]*\]/g, '')
        .replace(/(?:\(\s*[A-Z]\s*\)|\[\s*[A-Z]\s*\])\s*_{2,}/gi, '_________');
      stimulus = stimulus.replace(/_{2,}/g, '_________').replace(/(?:_________\s*){2,}/g, '_________');
    }
  }

  return { prompt, stimulus, finalChoices };
}
