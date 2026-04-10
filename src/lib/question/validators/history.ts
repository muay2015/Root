import type { DifficultyLevel } from '../generationRules.ts';
import type { GeneratedQuestionDraft } from './types.ts';
import { pushReason, normalizeText, countWords } from './utils.ts';

/**
 * 한국사 과목의 난이도 규칙을 검증합니다.
 */
export function validateHistoryDifficulty(
  question: GeneratedQuestionDraft,
  index: number,
  difficulty: DifficultyLevel,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  if (difficulty !== 'hard') {
    if (difficulty === 'medium' && countWords(question.stem) < 8) {
      warnings.push(`Question ${index}: medium history item may be too short.`);
    }
    return;
  }

  const normalizedStem = normalizeText(question.stem);
  const normalizedAnswer = normalizeText(question.answer);
  const directHistoryPatterns = [/관련된 인물/, /해당하는 것/, /옳은 것을 고른/, /설명한 것/];

  if (directHistoryPatterns.some((p) => p.test(question.stem))) {
    pushReason(reasons, issueCounts, 'history_hard_direct', `Question ${index}: hard history item is too direct.`);
  }

  if (normalizedAnswer.length >= 8 && normalizedStem.includes(normalizedAnswer)) {
    pushReason(reasons, issueCounts, 'history_hard_overlap', `Question ${index}: hard history answer is too directly exposed in the stem.`);
  }

  const choices = question.choices ?? [];
  const averageLength = choices.length > 0 ? choices.reduce((sum, c) => sum + c.length, 0) / choices.length : 0;
  if (averageLength > 0 && question.answer.length > averageLength * 1.9) {
    pushReason(reasons, issueCounts, 'history_hard_distractor', `Question ${index}: hard history distractors are too weak.`);
  }
}

/**
 * 문항이 한국사 과목 성격에 부합하는지 검증합니다.
 */
export function validateHistorySubjectFit(
  question: GeneratedQuestionDraft,
  index: number,
  reasons: string[],
  warnings: string[],
  issueCounts: Record<string, number>,
) {
  const text = `${question.topic} ${question.stem} ${question.choices?.join(' ') ?? ''} ${question.explanation}`.toLowerCase();
  const historyMarkers = ['조선', '고려', '신라', '백제', '고구려', '왕', '제도', '사건', '문화', '역사'];
  
  const koreanCount = (text.match(/[\u3131-\u314e\uac00-\ud7a3]{2,}/gu) ?? []).length;
  const englishCount = (text.match(/[a-z]{4,}/g) ?? []).length;

  if (englishCount > 20 && englishCount > koreanCount * 1.5) {
    pushReason(reasons, issueCounts, 'history_language', `Question ${index}: history output contains too much English.`);
  }

  if (!historyMarkers.some((marker) => text.includes(marker))) {
    warnings.push(`Question ${index}: history context markers not clearly detected.`);
  }
}
