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
  validateEnglishOrderArrangement, 
  validateEnglishIrrelevantSentence, 
  validateEnglishContentMatching, 
  validateEnglishSummaryCompletion, 
  validateEnglishEmotionAtmosphere 
} from './english.ts'; // 원본 파일 경로 유지 또는 validators/english로 변경 시 수정 필요 (여기서는 통일성을 위해 하위 폴더 권장)
import { 
  validateHistoryDifficulty, 
  validateHistorySubjectFit 
} from './validators/history.ts';

// english.ts가 아직 validators 폴더 밖에 있을 수 있으므로 경로 확인 필요. 
// 계획상 validators/english.ts로 생성했으므로 해당 경로를 사용합니다.
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



/**
 * 생성된 전체 문항들을 검증합니다.
 * 이 함수는 주 검증 진입점으로 각 세부 검증 모듈을 호출합니다.
 */
export function validateGeneratedQuestions(input: ValidationInput): ValidationResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const issueCounts: Record<string, number> = {};

  // 1. 문항 개수 검증
  if (input.questions.length !== input.count) {
    pushReason(
      reasons,
      issueCounts,
      'question_count',
      `Expected ${input.count} questions but received ${input.questions.length}.`,
    );
  }

  const subject = String(input.subject);

  // 2. 개별 문항 검증 루프
  input.questions.forEach((question, zeroBasedIndex) => {
    const index = zeroBasedIndex + 1;

    // 기본 구조 검증 (선지, 정답 매칭 등)
    validateStructure(question, index, reasons, issueCounts);

    // 주제 및 요청 사항 반영 검증
    validateTopicReflection(question, index, input.title, input.topic, warnings);
    validateSelectionReflection(question, index, input, warnings);

    // 영어 특화 유형 검증
    valEngBlank(question, index, input, reasons, issueCounts);
    valEngInsertion(question, index, input, reasons, issueCounts);
    valEngOrder(question, index, input, reasons, issueCounts);
    valEngIrrel(question, index, input, reasons, issueCounts);
    valEngContent(question, index, input, reasons, issueCounts);
    valEngSummary(question, index, input, reasons, issueCounts);
    valEngEmotion(question, index, input, reasons, issueCounts);
    valEngTitle(question, index, input, reasons, issueCounts);
    valEngGrammar(question, index, input, reasons, issueCounts);



    // 과목별 난이도/특화 검증
    if (subject === 'korean_history' || subject === 'high_korean_history' || subject === 'middle_history') {
      validateHistoryDifficulty(question, index, input.difficulty, reasons, warnings, issueCounts);
      validateHistorySubjectFit(question, index, reasons, warnings, issueCounts);
    } else {
      validateGenericDifficulty(question, index, input, reasons, warnings, issueCounts);
    }
  });

  return {
    isValid: reasons.length === 0,
    reasons,
    warnings,
    issueCounts,
  };
}

// 기존 타입 재수출 (호환성 유지)
export type { GeneratedQuestionDraft, ValidationInput, ValidationResult } from './validators/types.ts';
