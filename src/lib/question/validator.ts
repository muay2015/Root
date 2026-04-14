import { difficultyRules, schoolLevelRules } from './generationRules.ts';
import type { ValidationInput, ValidationResult } from './validators/types.ts';
import { pushReason } from './validators/utils.ts';
import { validateStructure } from './validators/structure.ts';
import { 
  validateGenericDifficulty, 
  validateTopicReflection, 
  validateSelectionReflection 
} from './validators/difficulty.ts';
import { 
  validateHistoryDifficulty, 
  validateHistorySubjectFit 
} from './validators/history.ts';
import { validateKoreanLiteratureQuality } from './validators/korean.ts';
import { validateMathQuality } from './validators/math.ts';

import { 
  validateEnglishBlankInference as valEngBlank,
  validateEnglishSentenceInsertion as valEngInsertion,
  validateEnglishOrderArrangement as valEngOrder,
  validateEnglishIrrelevantSentence as valEngIrrel,
  validateEnglishContentMatching as valEngContent,
  validateEnglishSummaryCompletion as valEngSummary,
  validateEnglishEmotionAtmosphere as valEngEmotion,
  validateEnglishTitleThemeGist as valEngTitle,
  validateEnglishGrammarVocabulary as valEngGrammar
} from './validators/english.ts';

function normalizeDuplicateText(value: unknown) {
  return String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeLiteratureBaseStimulus(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const normalized = raw.replace(/〈보기〉|\[보기\]|보기(?=\s)/g, '<보기>');
  const splitIdx = normalized.indexOf('<보기>');
  const base = splitIdx >= 0 ? normalized.slice(0, splitIdx) : normalized;
  return normalizeDuplicateText(base);
}

function buildQuestionFingerprint(question: ValidationInput['questions'][number]) {
  const stem = normalizeDuplicateText(question.stem);
  const stimulus = normalizeDuplicateText(question.stimulus);
  const choices = (Array.isArray(question.choices) ? question.choices : [])
    .map((choice) => normalizeDuplicateText(choice))
    .filter(Boolean)
    .join(' | ');

  return [stem, stimulus, choices].filter(Boolean).join(' || ');
}

function classifyKoreanLiteratureRole(stem: unknown) {
  const text = String(stem ?? '').replace(/\s+/g, ' ').trim();

  if (/보기|감상/u.test(text)) return 'appreciation';
  if (/표현상 특징|표현의 효과|표현 방식|시어|심상|이미지/u.test(text)) return 'expression';
  if (/화자|정서|태도|심경|정서 변화/u.test(text)) return 'speaker';
  if (/상황|장면|기능|갈등|전개/u.test(text)) return 'scene';
  return 'other';
}

function validateEnglishCoreFormats(
  question: ValidationInput['questions'][number],
  index: number,
  input: ValidationInput,
  reasons: string[],
  issueCounts: Record<string, number>,
) {
  valEngBlank(question, index, input, reasons, issueCounts);
  valEngInsertion(question, index, input, reasons, issueCounts);
  valEngOrder(question, index, input, reasons, issueCounts);
  valEngIrrel(question, index, input, reasons, issueCounts);
  valEngContent(question, index, input, reasons, issueCounts);
  valEngSummary(question, index, input, reasons, issueCounts);
  valEngEmotion(question, index, input, reasons, issueCounts);
  valEngTitle(question, index, input, reasons, issueCounts);
  valEngGrammar(question, index, input, reasons, issueCounts);
}



/**
 * 생성된 전체 문항들을 검증합니다.
 * 이 함수는 주 검증 진입점으로 각 세부 검증 모듈을 호출합니다.
 */
export function validateGeneratedQuestions(input: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const issueCounts: Record<string, number> = {};

  // 1. 문항 개수 검증
  if (input.questions.length === 0) {
    pushReason(
      reasons,
      issueCounts,
      'question_count_zero',
      `Expected ${input.count} questions but received 0.`,
    );
  } else if (input.questions.length !== input.count) {
    warnings.push(
      `Expected ${input.count} questions but received ${input.questions.length}.`,
    );
  }

  const subject = String(input.subject);
  const fingerprintMap = new Map<string, number[]>();
  const literatureSetRoleMap = new Map<string, { index: number; role: string }[]>();

  // 2. 개별 문항 검증 루프
  input.questions.forEach((question, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1;
    const fingerprint = buildQuestionFingerprint(question);

    if (fingerprint) {
      const seen = fingerprintMap.get(fingerprint) ?? [];
      seen.push(index);
      fingerprintMap.set(fingerprint, seen);
    }

    if (subject === 'korean_literature') {
      const stimulusKey = normalizeLiteratureBaseStimulus(question.stimulus);
      if (stimulusKey) {
        const seenRoles = literatureSetRoleMap.get(stimulusKey) ?? [];
        seenRoles.push({ index, role: classifyKoreanLiteratureRole(question.stem) });
        literatureSetRoleMap.set(stimulusKey, seenRoles);
      }
    }

    // 기본 구조 검증 (선지, 정답 매칭 등)
    validateStructure(question, index, reasons, issueCounts);

    // 주제 및 요청 사항 반영 검증
    validateTopicReflection(question, index, input.title, input.topic, warnings);
    validateSelectionReflection(question, index, input, warnings);

    // 영어는 생성 후 억지 수정보다, 유형별 핵심 형식만 검증합니다.
    validateEnglishCoreFormats(question, index, input, reasons, issueCounts);



    // 과목별 난이도/특화 검증
    if (subject === 'korean_history' || subject === 'high_korean_history' || subject === 'middle_history') {
      validateHistoryDifficulty(question, index, input.difficulty, reasons, warnings, issueCounts);
      validateHistorySubjectFit(question, index, reasons, warnings, issueCounts);
    } else {
      validateGenericDifficulty(question, index, input, reasons, warnings, issueCounts);
    }

    validateKoreanLiteratureQuality(question, index, input, reasons, warnings, issueCounts);
    validateMathQuality(question, index, input, reasons, warnings, issueCounts);
  });

  for (const indexes of fingerprintMap.values()) {
    if (indexes.length < 2) {
      continue;
    }

    pushReason(
      reasons,
      issueCounts,
      'duplicate_questions',
      `Duplicate question detected across items ${indexes.join(', ')}.`,
    );
  }

  if (subject === 'korean_literature') {
    for (const entries of literatureSetRoleMap.values()) {
      if (entries.length <= 1) {
        continue;
      }

      if (entries.length > 3) {
        pushReason(
          reasons,
          issueCounts,
          'korean_literature_set_too_large',
          `Korean literature shared-passage set exceeds 3 questions: ${entries.map((entry) => entry.index).join(', ')}.`,
        );
      }

      const roleGroups = new Map<string, number[]>();
      entries.forEach(({ index, role }) => {
        const seen = roleGroups.get(role) ?? [];
        seen.push(index);
        roleGroups.set(role, seen);
      });

      for (const [role, indexes] of roleGroups.entries()) {
        if (role === 'other' || indexes.length < 2) {
          continue;
        }

        pushReason(
          reasons,
          issueCounts,
          'korean_literature_set_role_overlap',
          `Korean literature shared-passage set repeats the same role "${role}" across items ${indexes.join(', ')}.`,
        );
      }
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    warnings,
    issueCounts,
  };
}

// 기존 타입 재수출 (호환성 유지)
export type { GeneratedQuestionDraft, ValidationInput, ValidationResult } from './validators/types.ts';
