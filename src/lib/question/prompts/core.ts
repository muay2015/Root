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

  return [
    'Previous validation failures that must be fixed in this generation:',
    ...validationFeedback.map((reason, index) => `${index + 1}. ${reason}`),
  ].join('\n');
}
