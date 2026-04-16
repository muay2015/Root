import { type DifficultyLevel, type SchoolLevel } from '../generationRules';
import { type SubjectKey } from '../subjectConfig';

export type PromptBuildInput = {
  materialText: string;
  title?: string;
  topic?: string;
  count: number;
  subject: SubjectKey;
  questionType?: string;
  format?: string;
  difficulty: DifficultyLevel;
  schoolLevel: SchoolLevel;
  validationFeedback?: string[];
  images?: { mimeType: string; data: string }[];
};

export const META_INSTRUCTION_PATTERNS = [
  /사용자가 입력한 주제/u,
  /기초로 하여 생성/u,
  /생성되는 문제입니다/u,
  /출제 경향을 반영/u,
  /전 범위에서 고르게/u,
  /선택한 교육과정을 기초로/u,
  /English passage generation instruction/i,
  /\[수능 문학 지문 생성 지시\]/u,
];

export function isMaterialMeta(text: string): boolean {
  const trimmed = text.trim();
  return !trimmed || META_INSTRUCTION_PATTERNS.some((p) => p.test(trimmed));
}

export function sanitizeMaterialText(text: string, subject: SubjectKey): string {
  const trimmed = text.trim();
  if (isMaterialMeta(trimmed)) {
    return '';
  }
  return trimmed;
}

export function buildSourceMaterialBlock(input: PromptBuildInput): string {
  const material = sanitizeMaterialText(input.materialText, input.subject);
  if (material) {
    return `Source material:\n${material}`;
  }
  const isEnglish = String(input.subject).toLowerCase().includes('english');
  if (isEnglish) {
    return [
      'Compose an original English reading passage (150-250 words) yourself for each question.',
      'The passage must be realistic, self-contained prose suitable for the requested question type.',
    ].join('\n');
  }
  return '제시 자료가 없으므로, 문항에 사용할 독창적인 지문을 직접 작성하십시오.';
}

export function buildFeedbackBlock(validationFeedback?: string[]) {
  if (!validationFeedback || validationFeedback.length === 0) {
    return 'No previous validation failures.';
  }

  const lines = [
    '[CRITICAL] Previous validation failures that MUST be fixed. If you repeat these errors, the entire output will be discarded again:',
    ...validationFeedback.map((reason, index) => `${index + 1}. ${reason}`),
  ];

  // 수학 관련 실패가 있으면 구체적 교정 가이드 추가
  const feedbackText = validationFeedback.join(' ');
  if (feedbackText.includes('math_sequential_choices') || feedbackText.includes('sequential numbers')) {
    lines.push(
      '',
      '[MATH FIX] choices가 "1","2","3","4","5"로 실패했습니다. 각 선지에 실제 수학적 계산 결과값을 넣으십시오.',
      '올바른 예: choices=["3","5","7","9","11"] 또는 choices=["\\(\\frac{1}{2}\\)","\\(\\frac{3}{4}\\)","1","\\(\\frac{5}{4}\\)","\\(\\frac{3}{2}\\)"]',
    );
  }
  if (feedbackText.includes('math_vague_stem') || feedbackText.includes('vague')) {
    lines.push(
      '',
      '[MATH FIX] 발문이 "~에 관한 분석/설명으로 적절한 것은?"으로 실패했습니다. 반드시 "\\(f(2)\\)의 값은?", "\\(a+b\\)의 값을 구하시오." 등 구체적 수치를 묻는 발문으로 수정하십시오.',
    );
  }
  if (feedbackText.includes('hard_too_short') || feedbackText.includes('too short')) {
    lines.push(
      '',
      '[MATH FIX] stem이 너무 짧습니다. 수학 문항에서는 반드시 stimulus 필드에 수식 조건을 넣으십시오. stimulus가 null이면 안 됩니다.',
      '예: stem="다항함수 \\(f(x)\\)가 다음 조건을 만족시킬 때, \\(f(2)\\)의 값은?", stimulus="\\[f\'(x) = 3x^2 - 4x + 1,\\quad f(0) = 2\\]"',
    );
  }
  if (feedbackText.includes('math_bare_latex_brace') || feedbackText.includes('bare_latex_brace')) {
    lines.push(
      '',
      '[MATH FIX] stem에 \\{...\\}가 LaTeX 구분자 밖에 있어 실패했습니다.',
      '❌ 잘못된 예: "수열 \\{an\\}에 대하여" — \\{..\\}가 \\(...\\) 밖에 있음',
      '✅ 올바른 예: "수열 \\(\\{a_n\\}\\)에 대하여" — 반드시 \\(\\{a_n\\}\\) 형태로 감싸야 함',
    );
  }
  if (feedbackText.includes('math_bare_subscript') || feedbackText.includes('bare_subscript')) {
    lines.push(
      '',
      '[MATH FIX] stem에 첨자가 LaTeX 없이 잘못 표기되어 실패했습니다.',
      '❌ 잘못된 예: "a4의 값은?", "a---n", "a_____5" — 어떤 방식이든 LaTeX 밖의 첨자 표기는 금지',
      '✅ 올바른 예: "\\(a_4\\)의 값은?", "\\(a_n\\)" — 반드시 \\(a_4\\) 형태. 하이픈(-) 이나 여러 언더스코어(___) 사용 불가',
    );
  }

  return lines.join('\n');
}
